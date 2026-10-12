package game

import "casino/internal/models"

// GameEngine is implemented by each game type.
type GameEngine interface {
	// StartGame initialises a new game with the given players.
	StartGame(players []models.Player, settings map[string]any) (any, error)

	// HandleAction processes a player action and returns the updated state.
	HandleAction(state any, playerID string, action models.Action) (any, error)

	// GetStateForPlayer returns a copy of the state with hidden information
	// filtered for the given player (e.g. other players' hole cards).
	GetStateForPlayer(state any, playerID string) any

	// IsRoundOver returns true when the current round/hand is finished.
	IsRoundOver(state any) bool

	// ResolveRound settles bets and returns chip changes.
	ResolveRound(state any) (any, []models.ChipChange, error)

	// LoadState restores a state previously serialized with json.Marshal.
	LoadState(data []byte) (any, error)

	// PlayerChips returns the chips a player holds in the given state.
	PlayerChips(state any, playerID string) int64
}

// NewEngine returns the engine for a game type, or false if that game is not
// playable yet.
func NewEngine(gameType string) (GameEngine, bool) {
	switch gameType {
	case "blackjack":
		return NewBlackjackEngine(), true
	case "roulette":
		return NewRouletteEngine(), true
	}
	return nil, false
}
