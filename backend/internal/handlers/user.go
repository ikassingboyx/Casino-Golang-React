package handlers

import (
	"database/sql"
	"errors"
	"net/http"

	"casino/internal/config"
	"casino/internal/models"

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
	user, err := models.GetUserByID(c.Request.Context(), h.db, c.GetString("userID"))
	if errors.Is(err, models.ErrUserNotFound) {
		// Valid token for a deleted user: treat as logged out.
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load user"})
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) UpdateMe(c *gin.Context) {
	// TODO: implement
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *UserHandler) ClaimDailyBonus(c *gin.Context) {
	// TODO: implement — 500 chips, once per 24h
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}
