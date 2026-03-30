package handlers

import (
	"database/sql"
	"net/http"

	"casino/internal/ws"

	"github.com/gin-gonic/gin"
)

type RoomHandler struct {
	db  *sql.DB
	hub *ws.Hub
}

func NewRoomHandler(db *sql.DB, hub *ws.Hub) *RoomHandler {
	return &RoomHandler{db: db, hub: hub}
}

func (h *RoomHandler) CreateRoom(c *gin.Context) {
	// TODO: implement — create room, generate 6-char code, return {roomId, code}
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *RoomHandler) GetRoom(c *gin.Context) {
	// TODO: implement — return room info + player list
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *RoomHandler) JoinRoom(c *gin.Context) {
	// TODO: implement — add player to room
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *RoomHandler) LeaveRoom(c *gin.Context) {
	// TODO: implement — remove player from room
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}
