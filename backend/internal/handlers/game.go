package handlers

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"

	"casino/internal/bot"
	"casino/internal/game"
	"casino/internal/models"

	"github.com/gin-gonic/gin"
)

// GameHandler runs offline (single-player vs. dealer/bots) games. Game state
// is stored in the games table and every chip change goes through the user's
// balance and the chip ledger, so a game survives restarts and refreshes.
type GameHandler struct {
	db *sql.DB
}

func NewGameHandler(db *sql.DB) *GameHandler {
	return &GameHandler{db: db}
}

// newEngine returns the engine for a game type with its bots attached.
func newEngine(gameType string) (game.GameEngine, bool) {
	engine, ok := game.NewEngine(gameType)
	if poker, isPoker := engine.(*game.PokerEngine); isPoker {
		poker.Bot = bot.NewPokerBot()
	}
	return engine, ok
}

type gameResponse struct {
	GameID string             `json:"gameId"`
	State  any                `json:"state"`
	Chips  int64              `json:"chips"`            // the user's balance after this request
	Result *models.ChipChange `json:"result,omitempty"` // net win/loss, once the round is over
}

type startOfflineRequest struct {
	GameType string `json:"gameType" binding:"required"`
}

// StartOffline resumes the user's unfinished game of this type, or starts a
// new round with the user's current chips.
func (h *GameHandler) StartOffline(c *gin.Context) {
	var req startOfflineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	engine, ok := newEngine(req.GameType)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "game not available: " + req.GameType})
		return
	}

	ctx := c.Request.Context()
	userID := c.GetString("userID")
	user, err := models.GetUserByID(ctx, h.db, userID)
	if err != nil {
		h.serverError(c, "load user", err)
		return
	}

	if stored, err := models.FindActiveOfflineGame(ctx, h.db, userID, req.GameType); err == nil {
		state, err := engine.LoadState(stored.State)
		if err != nil {
			h.serverError(c, "load game", err)
			return
		}
		c.JSON(http.StatusOK, gameResponse{GameID: stored.ID, State: engine.GetStateForPlayer(state, userID), Chips: user.Chips})
		return
	} else if !errors.Is(err, models.ErrGameNotFound) {
		h.serverError(c, "find game", err)
		return
	}

	player := models.Player{ID: userID, Name: user.DisplayName, Chips: user.Chips, IsConnected: true}
	state, err := engine.StartGame([]models.Player{player}, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resp, status, err := h.createGame(ctx, engine, req.GameType, userID, user.Chips, state)
	if err != nil {
		if status == http.StatusInternalServerError {
			h.serverError(c, "create game", err)
			return
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// createGame stores a new game. Starting a game can already move chips (poker
// blinds) or even finish the round (everyone folds to the big blind), so this
// settles it like an action.
func (h *GameHandler) createGame(ctx context.Context, engine game.GameEngine, gameType, userID string, chipsBefore int64, state any) (*gameResponse, int, error) {
	tx, err := h.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	defer tx.Rollback()

	id, err := models.CreateOfflineGame(ctx, tx, userID, gameType, state)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	return h.settle(ctx, tx, engine, &models.StoredGame{ID: id, GameType: gameType}, userID, chipsBefore, state, "start")
}

type offlineActionRequest struct {
	GameID string `json:"gameId" binding:"required"`
	models.Action
}

// OfflineAction applies one player action. Chips the engine moves (bets,
// payouts) are applied to the user's balance in the same transaction.
func (h *GameHandler) OfflineAction(c *gin.Context) {
	var req offlineActionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx := c.Request.Context()
	userID := c.GetString("userID")

	resp, status, err := h.applyAction(ctx, userID, req)
	if err != nil {
		if status == http.StatusInternalServerError {
			h.serverError(c, "apply action", err)
			return
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *GameHandler) applyAction(ctx context.Context, userID string, req offlineActionRequest) (*gameResponse, int, error) {
	tx, err := h.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	defer tx.Rollback()

	stored, err := models.LockOfflineGame(ctx, tx, userID, req.GameID)
	if errors.Is(err, models.ErrGameNotFound) {
		return nil, http.StatusNotFound, err
	}
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	if stored.Status != "active" {
		return nil, http.StatusConflict, errors.New("this round is over; start a new one")
	}
	engine, ok := newEngine(stored.GameType)
	if !ok {
		return nil, http.StatusBadRequest, errors.New("game not available: " + stored.GameType)
	}
	state, err := engine.LoadState(stored.State)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}

	chipsBefore := engine.PlayerChips(state, userID)
	state, err = engine.HandleAction(state, userID, req.Action)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	return h.settle(ctx, tx, engine, stored, userID, chipsBefore, state, req.Action.Type)
}

// settle resolves the round if it is over, applies the chips the engine moved
// for the user since chipsBefore to their balance, saves the game and commits.
func (h *GameHandler) settle(ctx context.Context, tx *sql.Tx, engine game.GameEngine, stored *models.StoredGame, userID string, chipsBefore int64, state any, what string) (*gameResponse, int, error) {
	var result *models.ChipChange
	var err error
	over := engine.IsRoundOver(state)
	if over {
		var changes []models.ChipChange
		state, changes, err = engine.ResolveRound(state)
		if err != nil {
			return nil, http.StatusInternalServerError, err
		}
		for i := range changes {
			if changes[i].PlayerID == userID {
				result = &changes[i]
			}
		}
	}

	user, err := models.GetUserByID(ctx, tx, userID)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	balance := user.Chips
	if delta := engine.PlayerChips(state, userID) - chipsBefore; delta != 0 {
		desc := fmt.Sprintf("%s: %s", stored.GameType, what)
		balance, err = models.ApplyChipChange(ctx, tx, userID, stored.ID, delta, desc)
		if errors.Is(err, models.ErrInsufficientChips) {
			return nil, http.StatusConflict, err
		}
		if err != nil {
			return nil, http.StatusInternalServerError, err
		}
	}

	if err := models.SaveGame(ctx, tx, stored.ID, state, over); err != nil {
		return nil, http.StatusInternalServerError, err
	}
	if err := tx.Commit(); err != nil {
		return nil, http.StatusInternalServerError, err
	}
	return &gameResponse{GameID: stored.ID, State: engine.GetStateForPlayer(state, userID), Chips: balance, Result: result}, http.StatusOK, nil
}

func (h *GameHandler) serverError(c *gin.Context, what string, err error) {
	log.Printf("game: %s: %v", what, err)
	c.JSON(http.StatusInternalServerError, gin.H{"error": "something went wrong"})
}
