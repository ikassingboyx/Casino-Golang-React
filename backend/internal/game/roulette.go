package game

import "casino/internal/models"

type RouletteEngine struct{}

func NewRouletteEngine() *RouletteEngine { return &RouletteEngine{} }

func (e *RouletteEngine) StartGame(players []models.Player, settings map[string]any) (any, error) {
	// TODO: implement
	panic("not implemented")
}

func (e *RouletteEngine) HandleAction(state any, playerID string, action models.Action) (any, error) {
	// Actions: place_bet, clear_bets, spin (offline only)
	panic("not implemented")
}

func (e *RouletteEngine) GetStateForPlayer(state any, playerID string) any {
	// All bets visible to all players
	return state
}

func (e *RouletteEngine) IsRoundOver(state any) bool {
	panic("not implemented")
}

func (e *RouletteEngine) ResolveRound(state any) (any, []models.ChipChange, error) {
	panic("not implemented")
}
