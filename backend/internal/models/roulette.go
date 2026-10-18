package models

// Bet is one stake on a table spot. Roulette: Type is the board spot, e.g.
// "straight-17", "split-1-2", "red", "dozen-2"; the server fills Numbers
// from Type and never trusts numbers sent by the client. Baccarat: Type is
// "player", "banker" or "tie".
type Bet struct {
	Type    string `json:"type"`
	Numbers []int  `json:"numbers"`
	Amount  int64  `json:"amount"`
	Win     int64  `json:"win,omitempty"` // chips returned (stake + winnings) once resolved
}

type RoulettePlayer struct {
	Player
	Bets []Bet `json:"bets"`
}

type RoulettePayout struct {
	PlayerID string `json:"playerId"`
	Amount   int64  `json:"amount"`
}

type RouletteGameState struct {
	BaseGameState
	TimerSeconds  int              `json:"timerSeconds"`
	LastResult    *int             `json:"lastResult"`
	Players       []RoulettePlayer `json:"players"`
	WinningNumber *int             `json:"winningNumber,omitempty"`
	Payouts       []RoulettePayout `json:"payouts,omitempty"`
}
