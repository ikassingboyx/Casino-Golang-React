package handlers

import (
	"database/sql"
	"net/http"

	"casino/internal/config"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	db  *sql.DB
	cfg *config.Config
}

func NewUserHandler(db *sql.DB, cfg *config.Config) *UserHandler {
	return &UserHandler{db: db, cfg: cfg}
}

func (h *UserHandler) GetMe(c *gin.Context) {
	// TODO: implement
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *UserHandler) UpdateMe(c *gin.Context) {
	// TODO: implement
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *UserHandler) ClaimDailyBonus(c *gin.Context) {
	// TODO: implement — 500 chips, once per 24h
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}
