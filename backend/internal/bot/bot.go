package bot

import "casino/internal/models"

// Bot decides what action to take given the current game state.
type Bot interface {
	DecideAction(state any, playerID string) models.Action
}
