package models

type BlackjackHand struct {
	Cards  []Card `json:"cards"`
	Bet    int64  `json:"bet"`
	Status string `json:"status"` // playing, stand, bust, blackjack
	Value  int    `json:"value"`  // total of the visible cards; filled in player views
}

type BlackjackPlayer struct {
	Player
	Hands []BlackjackHand `json:"hands"`
}

type DealerHand struct {
	Cards []Card `json:"cards"`
	Value int    `json:"value"` // total of the visible cards; filled in player views
}

type BlackjackGameState struct {
	BaseGameState
	CurrentPlayerIndex int               `json:"currentPlayerIndex"`
	Players            []BlackjackPlayer `json:"players"`
	DealerHand         DealerHand        `json:"dealerHand"`
}
