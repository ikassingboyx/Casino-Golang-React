package game

import (
	"encoding/json"

	"casino/internal/models"
)

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

	Timed
}

// Waiting is what an online round is waiting on, so slow players can be timed
// out. Key names the decision; the clock restarts whenever it changes.
type Waiting struct {
	Key     string
	Betting bool // waiting for the rest of the table's bets, not one player's turn
}

// Timed is implemented by every engine so online rounds never stall on a
// player who is away.
type Timed interface {
	// Waiting returns what the round waits on, or false if no clock should run
	// (e.g. nobody has bet yet, or the round is over).
	Waiting(state any) (Waiting, bool)
	// Timeout decides for whoever ran out of time: deals or spins with the
	// bets placed so far, or stands / checks / folds the player to act.
	Timeout(state any) (any, error)
}

// NewEngine returns the engine for a game type, or false if that game is not
// playable yet.
func NewEngine(gameType string) (GameEngine, bool) {
	switch gameType {
	case "blackjack":
		return NewBlackjackEngine(), true
	case "roulette":
		return NewRouletteEngine(), true
	case "baccarat":
		return NewBaccaratEngine(), true
	case "poker":
		return NewPokerEngine(), true
	}
	return nil, false
}

// seated is any game's player type.
type seated interface{ Base() models.Player }

// playerIndex returns the index of the player with this id, or -1.
func playerIndex[P seated](players []P, id string) int {
	for i, p := range players {
		if p.Base().ID == id {
			return i
		}
	}
	return -1
}

// playerChips returns the chips of the player with this id, or 0.
func playerChips[P seated](players []P, id string) int64 {
	if i := playerIndex(players, id); i >= 0 {
		return players[i].Base().Chips
	}
	return 0
}

// loadState decodes a stored state of type S.
func loadState[S any](data []byte) (any, error) {
	var state S
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, err
	}
	return &state, nil
}
