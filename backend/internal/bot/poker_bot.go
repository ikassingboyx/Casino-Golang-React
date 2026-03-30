package bot

import "casino/internal/models"

type PokerBot struct{}

func NewPokerBot() *PokerBot { return &PokerBot{} }

// DecideAction returns a poker action for the bot player.
// TODO: implement bot strategy.
func (b *PokerBot) DecideAction(state any, playerID string) models.Action {
	return models.Action{Type: "fold"}
}
