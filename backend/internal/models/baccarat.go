package models

type BaccaratHand struct {
	Cards []Card `json:"cards"`
	Total int    `json:"total"`
}

type BaccaratBets struct {
	Player int64 `json:"player"`
	Banker int64 `json:"banker"`
	Tie    int64 `json:"tie"`
}

type BaccaratPlayer struct {
	Player
	Bets BaccaratBets `json:"bets"`
}

type BaccaratGameState struct {
	BaseGameState
	PlayerHand BaccaratHand   `json:"playerHand"`
	BankerHand BaccaratHand   `json:"bankerHand"`
	Players    []BaccaratPlayer `json:"players"`
	Result     string         `json:"result,omitempty"` // player, banker, tie
	ChipChange int64          `json:"chipChange,omitempty"`
}
