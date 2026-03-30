package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

type GameHandler struct {
	db *sql.DB
}

func NewGameHandler(db *sql.DB) *GameHandler {
	return &GameHandler{db: db}
}

func (h *GameHandler) StartOffline(c *gin.Context) {
	// TODO: implement — init game engine, save state, return initial GameState
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *GameHandler) OfflineAction(c *gin.Context) {
	// TODO: implement — load state, apply action, run bot turns, save, return state
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}
