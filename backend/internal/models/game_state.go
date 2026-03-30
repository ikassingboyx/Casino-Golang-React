package models

type Card struct {
	Suit   string `json:"suit"`
	Rank   string `json:"rank"`
	Hidden bool   `json:"hidden,omitempty"`
}

type Player struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Chips       int64   `json:"chips"`
	IsBot       bool    `json:"isBot"`
	IsConnected bool    `json:"isConnected"`
}

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
	IsOffline  bool        `json:"isOffline"`
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
}
