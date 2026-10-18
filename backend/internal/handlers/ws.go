package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"strings"

	"casino/internal/auth"
	"casino/internal/config"
	"casino/internal/models"
	"casino/internal/ws"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type WSHandler struct {
	db       *sql.DB
	hub      *ws.Hub
	cfg      *config.Config
	upgrader websocket.Upgrader
}

func NewWSHandler(db *sql.DB, hub *ws.Hub, cfg *config.Config) *WSHandler {
	return &WSHandler{db: db, hub: hub, cfg: cfg, upgrader: websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		// Browsers may only connect from the frontend; clients that send no
		// Origin (not a browser) still need a valid token.
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			return origin == "" || strings.EqualFold(origin, strings.TrimRight(cfg.FrontendURL, "/"))
		},
	}}
}

// Upgrade connects a player to a room: /ws?token=…&code=12345. Opening the
// connection joins the room (if there is a free seat); closing it leaves.
func (h *WSHandler) Upgrade(c *gin.Context) {
	claims, err := auth.ValidateToken(c.Query("token"), h.cfg.JWTSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}
	user, err := models.GetUserByID(c.Request.Context(), h.db, claims.UserID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unknown user"})
		return
	}

	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	// Browsers don't expose why a handshake failed, so problems with the room
	// are reported over the open connection.
	code := c.Query("code")
	room, ok := h.hub.Room(code)
	if !ok {
		ws.Reject(conn, "No table with code "+code+". It may have closed.")
		return
	}
	client := ws.NewClient(conn, user.ID)
	if err := room.Join(client, user); err != nil {
		ws.Reject(conn, capitalize(err.Error()))
		return
	}
	log.Printf("player %s joined room %s", user.ID, code)
	go client.Run()
}

func capitalize(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}
