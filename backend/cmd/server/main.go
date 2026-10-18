package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"casino/internal/config"
	"casino/internal/db"
	"casino/internal/handlers"
	"casino/internal/middleware"
	"casino/internal/models"
	"casino/internal/ws"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatalf("invalid config: %v", err)
	}

	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer database.Close()

	if err := db.RunMigrations(cfg.DatabaseURL); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	// Online rooms only live in memory, so none survive a restart.
	if err := models.CloseOpenRooms(context.Background(), database); err != nil {
		log.Fatalf("failed to close old rooms: %v", err)
	}
	hub := ws.NewHub(database)

	r := gin.New()
	if err := r.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		log.Fatalf("invalid TRUSTED_PROXIES: %v", err)
	}
	r.Use(middleware.Logger(), gin.Recovery(), middleware.CORS(cfg.FrontendURL))

	handlers.RegisterRoutes(r, database, hub, cfg)

	// Timeouts keep slow or stalled clients from holding connections open.
	// WebSocket connections are hijacked from the server, so they are not cut
	// off by these; the room's ping/pong deadlines time them out instead.
	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       2 * time.Minute,
		MaxHeaderBytes:    1 << 20,
	}
	go func() {
		log.Printf("server starting on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server error: %v", err)
		}
	}()

	// docker stop (SIGTERM) or Ctrl-C: finish in-flight requests, then exit.
	// Online rooms live in memory and end here; players rejoin new ones.
	stop, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	<-stop.Done()
	log.Print("shutting down")
	ctx, done := context.WithTimeout(context.Background(), 10*time.Second)
	defer done()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}
