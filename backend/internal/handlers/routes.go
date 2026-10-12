package handlers

import (
	"database/sql"

	"casino/internal/config"
	"casino/internal/middleware"
	"casino/internal/ws"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine, db *sql.DB, hub *ws.Hub, cfg *config.Config) {
	authH := NewAuthHandler(db, cfg)
	userH := NewUserHandler(db, cfg)
	roomH := NewRoomHandler(db, hub)
	gameH := NewGameHandler(db)
	wsH := NewWSHandler(db, hub, cfg)

	api := r.Group("/api")

	// Auth (public)
	api.GET("/auth/providers", authH.Providers)
	api.GET("/auth/:provider", authH.OAuthRedirect)
	api.GET("/auth/:provider/callback", authH.OAuthCallback)

	// Protected routes
	protected := api.Group("")
	protected.Use(middleware.Auth(cfg.JWTSecret))

	protected.GET("/users/me", userH.GetMe)
	protected.PATCH("/users/me", userH.UpdateMe)
	protected.POST("/users/me/daily-bonus", userH.ClaimDailyBonus)

	protected.POST("/rooms", roomH.CreateRoom)
	protected.GET("/rooms/:code", roomH.GetRoom)
	protected.POST("/rooms/:code/join", roomH.JoinRoom)
	protected.DELETE("/rooms/:code/leave", roomH.LeaveRoom)

	protected.POST("/game/offline/start", gameH.StartOffline)
	protected.POST("/game/offline/action", gameH.OfflineAction)

	// WebSocket (auth via query param)
	r.GET("/ws", wsH.Upgrade)
}
