package models

type Card struct {
	Suit   string `json:"suit"`
	Rank   string `json:"rank"`
	Hidden bool   `json:"hidden,omitempty"`
}

type Player struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Chips       int64  `json:"chips"`
	IsBot       bool   `json:"isBot"`
	IsConnected bool   `json:"isConnected"`
}

// Base returns the player's shared fields; every game's player type embeds
// Player, so they all have it.
func (p Player) Base() Player { return p }

type LastAction struct {
	PlayerID string `json:"playerId"`
	Action   string `json:"action"`
	Amount   int64  `json:"amount,omitempty"`
}

type BaseGameState struct {
	GameID     string      `json:"gameId"`
	RoomID     string      `json:"roomId,omitempty"`
	GameType   string      `json:"gameType"`
	Phase      string      `json:"phase"`
	Status     string      `json:"status"`
	LastAction *LastAction `json:"lastAction,omitempty"`
}

type ChipChange struct {
	PlayerID string `json:"playerId"`
	Amount   int64  `json:"amount"`
}

type Action struct {
	Type   string `json:"action"`
	Amount int64  `json:"amount,omitempty"`
	Bets   []Bet  `json:"bets,omitempty"` // roulette: all bets for a spin; baccarat: stakes on "player", "banker", "tie"
}
