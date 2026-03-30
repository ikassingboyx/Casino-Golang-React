package game

import "casino/internal/models"

type BaccaratEngine struct{}

func NewBaccaratEngine() *BaccaratEngine { return &BaccaratEngine{} }

func (e *BaccaratEngine) StartGame(players []models.Player, settings map[string]any) (any, error) {
	// TODO: implement
	panic("not implemented")
}

func (e *BaccaratEngine) HandleAction(state any, playerID string, action models.Action) (any, error) {
	// Only action is placing bets; dealing is automatic
	panic("not implemented")
}

func (e *BaccaratEngine) GetStateForPlayer(state any, playerID string) any {
	// All cards visible in baccarat
	return state
}

func (e *BaccaratEngine) IsRoundOver(state any) bool {
	panic("not implemented")
}

func (e *BaccaratEngine) ResolveRound(state any) (any, []models.ChipChange, error) {
	panic("not implemented")
}
