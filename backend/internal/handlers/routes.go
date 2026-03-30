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
	api.POST("/auth/register", authH.Register)
	api.POST("/auth/login", authH.Login)
	api.GET("/auth/google", authH.GoogleRedirect)
	api.GET("/auth/google/callback", authH.GoogleCallback)
	api.GET("/auth/facebook", authH.FacebookRedirect)
	api.GET("/auth/facebook/callback", authH.FacebookCallback)

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
