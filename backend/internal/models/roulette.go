package models

type RouletteBet struct {
	Type    string  `json:"type"`
	Numbers []int   `json:"numbers"`
	Amount  int64   `json:"amount"`
}

type RoulettePlayer struct {
	Player
	Bets []RouletteBet `json:"bets"`
}

type RoulettePayout struct {
	PlayerID string `json:"playerId"`
	Amount   int64  `json:"amount"`
}

type RouletteGameState struct {
	BaseGameState
	TimerSeconds  int               `json:"timerSeconds"`
	LastResult    *int              `json:"lastResult"`
	Players       []RoulettePlayer  `json:"players"`
	WinningNumber *int              `json:"winningNumber,omitempty"`
	Payouts       []RoulettePayout  `json:"payouts,omitempty"`
}
