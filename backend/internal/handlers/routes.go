package handlers

import (
	"database/sql"
	"net/http"

	"casino/internal/config"
	"casino/internal/middleware"
	"casino/internal/ws"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine, db *sql.DB, hub *ws.Hub, cfg *config.Config) {
	authH := NewAuthHandler(db, cfg)
	userH := NewUserHandler(db)
	roomH := NewRoomHandler(db, hub)
	gameH := NewGameHandler(db)
	wsH := NewWSHandler(db, hub, cfg)

	// A steady 10 requests/s with bursts of 30 per logged-in user. Before
	// login clients are told apart by IP, which friends behind one router
	// share, so that limit is looser.
	perUser := middleware.RateLimit(10, 30)
	perIP := middleware.RateLimit(20, 60)
	// Opening rooms writes to the database: bursts of 5, then one per 10s.
	roomLimit := middleware.RateLimit(0.1, 5)

	// Health check for Docker and load balancers: up, and the database answers.
	r.GET("/healthz", func(c *gin.Context) {
		if err := db.PingContext(c.Request.Context()); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "database unavailable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api")

	// Health check for Docker and uptime monitors: is the database reachable?
	api.GET("/health", perIP, func(c *gin.Context) {
		if err := db.PingContext(c.Request.Context()); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "database unavailable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Auth (public)
	public := api.Group("", perIP)
	public.GET("/auth/providers", authH.Providers)
	public.GET("/auth/:provider", authH.OAuthRedirect)
	public.GET("/auth/:provider/callback", authH.OAuthCallback)

	// Protected routes
	protected := api.Group("", middleware.Auth(cfg.JWTSecret), perUser)

	protected.GET("/users/me", userH.GetMe)
	protected.POST("/users/me/chips", userH.ClaimChips) // once an hour, enforced in the database

	protected.POST("/rooms", roomLimit, roomH.CreateRoom)
	protected.GET("/rooms/:code", roomH.GetRoom)

	protected.POST("/game/offline/start", gameH.StartOffline)
	protected.POST("/game/offline/action", gameH.OfflineAction)

	// WebSocket (auth via query param)
	r.GET("/ws", perIP, wsH.Upgrade)
}
