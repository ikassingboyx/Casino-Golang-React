package game

import "casino/internal/models"

// HandRank represents the rank of a poker hand (higher = better).
type HandRank int

const (
	HighCard HandRank = iota
	OnePair
	TwoPair
	ThreeOfAKind
	Straight
	Flush
	FullHouse
	FourOfAKind
	StraightFlush
	RoyalFlush
)

type EvaluatedHand struct {
	Rank      HandRank
	Cards     []models.Card // best 5-card combination
	TieBreakers []int        // values for tie-breaking (high to low)
}

// EvaluateHand finds the best 5-card hand from 7 cards (2 hole + 5 community).
func EvaluateHand(cards []models.Card) EvaluatedHand {
	// TODO: implement hand evaluation
	panic("not implemented")
}

// CompareHands returns 1 if a wins, -1 if b wins, 0 if tie.
func CompareHands(a, b EvaluatedHand) int {
	// TODO: implement comparison
	panic("not implemented")
}
