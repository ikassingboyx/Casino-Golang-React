package main

import (
	"casino/internal/config"
	"casino/internal/db"
	"casino/internal/handlers"
	"casino/internal/middleware"
	"casino/internal/ws"
	"log"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer database.Close()

	if err := db.RunMigrations(cfg.DatabaseURL); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	hub := ws.NewHub()
	go hub.Run()

	r := gin.Default()
	r.Use(middleware.CORS(cfg.FrontendURL))

	handlers.RegisterRoutes(r, database, hub, cfg)

	// Temporary in-memory game API used by the /test pages.
	handlers.RegisterDevRoutes(r)

	log.Printf("server starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
