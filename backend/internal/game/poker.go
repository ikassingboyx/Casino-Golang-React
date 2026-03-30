package game

import "casino/internal/models"

type PokerEngine struct{}

func NewPokerEngine() *PokerEngine { return &PokerEngine{} }

func (e *PokerEngine) StartGame(players []models.Player, settings map[string]any) (any, error) {
	// TODO: implement
	panic("not implemented")
}

func (e *PokerEngine) HandleAction(state any, playerID string, action models.Action) (any, error) {
	// TODO: implement
	panic("not implemented")
}

func (e *PokerEngine) GetStateForPlayer(state any, playerID string) any {
	// TODO: filter other players' hole cards
	panic("not implemented")
}

func (e *PokerEngine) IsRoundOver(state any) bool {
	panic("not implemented")
}

func (e *PokerEngine) ResolveRound(state any) (any, []models.ChipChange, error) {
	panic("not implemented")
}
