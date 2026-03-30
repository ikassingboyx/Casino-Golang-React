package models

type PokerPlayer struct {
	Player
	Cards           []Card `json:"cards"`
	CurrentBet      int64  `json:"currentBet"`
	TotalBetThisHand int64  `json:"totalBetThisHand"`
	Status          string `json:"status"` // active, folded, all_in, out
	Position        int    `json:"position"`
}

type SidePot struct {
	Amount     int64    `json:"amount"`
	EligibleIDs []string `json:"eligibleIds"`
}

type PokerGameState struct {
	BaseGameState
	DealerIndex     int           `json:"dealerIndex"`
	SmallBlindIndex int           `json:"smallBlindIndex"`
	BigBlindIndex   int           `json:"bigBlindIndex"`
	CurrentTurnIndex int          `json:"currentTurnIndex"`
	BigBlind        int64         `json:"bigBlind"`
	SmallBlind      int64         `json:"smallBlind"`
	Pot             int64         `json:"pot"`
	SidePots        []SidePot     `json:"sidePots"`
	CommunityCards  []Card        `json:"communityCards"`
	CurrentBet      int64         `json:"currentBet"`
	MinRaise        int64         `json:"minRaise"`
	Players         []PokerPlayer `json:"players"`
	Winners         []string      `json:"winners,omitempty"`
}
