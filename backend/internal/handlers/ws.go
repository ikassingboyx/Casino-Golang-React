package handlers

import (
	"database/sql"
	"net/http"

	"casino/internal/auth"
	"casino/internal/config"
	"casino/internal/ws"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // TODO: restrict to frontendURL in production
	},
}

type WSHandler struct {
	db  *sql.DB
	hub *ws.Hub
	cfg *config.Config
}

func NewWSHandler(db *sql.DB, hub *ws.Hub, cfg *config.Config) *WSHandler {
	return &WSHandler{db: db, hub: hub, cfg: cfg}
}

func (h *WSHandler) Upgrade(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
		return
	}
	claims, err := auth.ValidateToken(token, h.cfg.JWTSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}
	roomID := c.Query("roomId")
	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing roomId"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := ws.NewClient(h.hub, conn, claims.UserID, roomID)
	h.hub.Register(client)

	go client.WritePump()
	go client.ReadPump()
}
