package handlers

import (
	"database/sql"
	"errors"
	"log"
	"net/http"

	"casino/internal/ws"

	"github.com/gin-gonic/gin"
)

// RoomHandler opens online rooms. Joining, leaving and playing happen over
// the room's WebSocket (see WSHandler).
type RoomHandler struct {
	db  *sql.DB
	hub *ws.Hub
}

func NewRoomHandler(db *sql.DB, hub *ws.Hub) *RoomHandler {
	return &RoomHandler{db: db, hub: hub}
}

type createRoomRequest struct {
	GameType string `json:"gameType" binding:"required"`
}

// CreateRoom opens a room for a game and returns its 5-digit code.
func (h *RoomHandler) CreateRoom(c *gin.Context) {
	var req createRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	room, err := h.hub.CreateRoom(c.Request.Context(), req.GameType, c.GetString("userID"))
	if errors.Is(err, ws.ErrUnknownGame) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "game not available: " + req.GameType})
		return
	}
	if err != nil {
		log.Printf("rooms: create: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "something went wrong"})
		return
	}
	c.JSON(http.StatusCreated, room.Info())
}

// GetRoom returns an open room: its game, status and players.
func (h *RoomHandler) GetRoom(c *gin.Context) {
	room, ok := h.hub.Room(c.Param("code"))
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "No table with code " + c.Param("code")})
		return
	}
	c.JSON(http.StatusOK, room.Info())
}
