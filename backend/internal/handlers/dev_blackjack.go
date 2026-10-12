package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"sync"

	"casino/internal/game"
	"casino/internal/models"

	"github.com/gin-gonic/gin"
)

// DevBlackjackHandler is a temporary, unauthenticated, in-memory blackjack
// API for testing the game from the browser before auth and the DB are wired
// up. Sessions live only as long as the server process.
type DevBlackjackHandler struct {
	engine   *game.BlackjackEngine
	mu       sync.Mutex
	sessions map[string]*game.BlackjackState
}

const devPlayerID = "p1"

func NewDevBlackjackHandler() *DevBlackjackHandler {
	return &DevBlackjackHandler{
		engine:   game.NewBlackjackEngine(),
		sessions: map[string]*game.BlackjackState{},
	}
}

func RegisterDevRoutes(r *gin.Engine) {
	h := NewDevBlackjackHandler()
	dev := r.Group("/api/dev/blackjack")
	dev.POST("", h.NewSession)
	dev.POST("/:id/action", h.Action)
}

type devBlackjackResponse struct {
	SessionID   string             `json:"sessionId"`
	State       any                `json:"state"`
	PlayerTotal int                `json:"playerTotal"`
	DealerTotal int                `json:"dealerTotal"`
	Result      *models.ChipChange `json:"result,omitempty"`
}

// NewSession starts a session with 1000 chips, waiting for a bet.
func (h *DevBlackjackHandler) NewSession(c *gin.Context) {
	player := models.Player{ID: devPlayerID, Name: "Player", Chips: 1000}
	raw, err := h.engine.StartGame([]models.Player{player}, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	id := newSessionID()

	h.mu.Lock()
	h.sessions[id] = raw.(*game.BlackjackState)
	h.mu.Unlock()

	c.JSON(http.StatusOK, h.response(id, raw, nil))
}

// Action applies bet/hit/stand/double. A bet after a finished round starts
// the next round with the player's current chips.
func (h *DevBlackjackHandler) Action(c *gin.Context) {
	var action models.Action
	if err := c.ShouldBindJSON(&action); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	id := c.Param("id")
	state, ok := h.sessions[id]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}

	var raw any = state
	if state.Phase == "resolved" && action.Type == "bet" {
		next, err := h.engine.StartGame([]models.Player{state.Players[0].Player}, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		raw = next
	}

	raw, err := h.engine.HandleAction(raw, devPlayerID, action)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var result *models.ChipChange
	if h.engine.IsRoundOver(raw) {
		resolved, changes, err := h.engine.ResolveRound(raw)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		raw = resolved
		if len(changes) > 0 {
			result = &changes[0]
		}
	}
	h.sessions[id] = raw.(*game.BlackjackState)

	c.JSON(http.StatusOK, h.response(id, raw, result))
}

func (h *DevBlackjackHandler) response(id string, raw any, result *models.ChipChange) devBlackjackResponse {
	view := h.engine.GetStateForPlayer(raw, devPlayerID).(*game.BlackjackState)
	resp := devBlackjackResponse{
		SessionID:   id,
		State:       view.BlackjackGameState, // omit the deck
		DealerTotal: game.HandValue(view.DealerHand.Cards),
		Result:      result,
	}
	if hands := view.Players[0].Hands; len(hands) > 0 {
		resp.PlayerTotal = game.HandValue(hands[0].Cards)
	}
	return resp
}

func newSessionID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}
