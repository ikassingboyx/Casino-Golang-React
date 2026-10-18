package handlers

import (
	"database/sql"
	"errors"
	"log"
	"net/http"

	"casino/internal/models"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	db *sql.DB
}

func NewUserHandler(db *sql.DB) *UserHandler {
	return &UserHandler{db: db}
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

// ClaimChips adds the hourly chip top-up to the user's balance.
func (h *UserHandler) ClaimChips(c *gin.Context) {
	user, err := models.ClaimChips(c.Request.Context(), h.db, c.GetString("userID"))
	if errors.Is(err, models.ErrChipClaimTooSoon) {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": err.Error()})
		return
	}
	if err != nil {
		log.Printf("users: claim chips: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not add chips"})
		return
	}
	c.JSON(http.StatusOK, user)
}
