package game

import "casino/internal/models"

type BlackjackEngine struct{}

func NewBlackjackEngine() *BlackjackEngine { return &BlackjackEngine{} }

func (e *BlackjackEngine) StartGame(players []models.Player, settings map[string]any) (any, error) {
	deck = NewDeck()
	
	panic("not implemented")

func (e *BlackjackEngine) HandleAction(state any, playerID string, action models.Action) (any, error) {
	// TODO: hit, stand, double, split
	panic("not implemented")
}

func (e *BlackjackEngine) GetStateForPlayer(state any, playerID string) any {
	// All cards visible in blackjack except dealer's hole card during player_turns
	panic("not implemented")
}

func (e *BlackjackEngine) IsRoundOver(state any) bool {
	panic("not implemented")
}

func (e *BlackjackEngine) ResolveRound(state any) (any, []models.ChipChange, error) {
	panic("not implemented")
}
