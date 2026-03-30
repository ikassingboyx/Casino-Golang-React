package bot

import "casino/internal/models"

// BlackjackBot implements dealer rules: hit on soft 17, stand on hard 17+.
type BlackjackBot struct{}

func NewBlackjackBot() *BlackjackBot { return &BlackjackBot{} }

func (b *BlackjackBot) DecideAction(state any, playerID string) models.Action {
	// TODO: implement dealer logic (hit on soft 17)
	return models.Action{Type: "stand"}
}
