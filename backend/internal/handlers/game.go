package handlers

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"

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
	engine, ok := game.NewEngine(req.GameType)
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
	id, err := models.CreateOfflineGame(ctx, h.db, userID, req.GameType, state)
	if err != nil {
		h.serverError(c, "create game", err)
		return
	}
	c.JSON(http.StatusOK, gameResponse{GameID: id, State: engine.GetStateForPlayer(state, userID), Chips: user.Chips})
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
	engine, ok := game.NewEngine(stored.GameType)
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

	var result *models.ChipChange
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
		desc := fmt.Sprintf("%s: %s", stored.GameType, req.Action.Type)
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
