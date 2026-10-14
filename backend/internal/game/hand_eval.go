package game

import (
	"sort"

	"casino/internal/models"
)

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

var handRankNames = [...]string{
	"High Card", "One Pair", "Two Pair", "Three of a Kind", "Straight",
	"Flush", "Full House", "Four of a Kind", "Straight Flush", "Royal Flush",
}

func (r HandRank) String() string {
	if r < 0 || int(r) >= len(handRankNames) {
		return "Unknown"
	}
	return handRankNames[r]
}

type EvaluatedHand struct {
	Rank        HandRank
	Cards       []models.Card // best 5-card combination
	TieBreakers []int         // values for tie-breaking (high to low)
}

// EvaluateHand finds the best 5-card hand from 7 cards (2 hole + 5 community).
// It accepts 5 or 6 cards as well. With fewer than 5 cards (e.g. a bot judging
// its hole cards) only pairs, trips and quads are recognised.
func EvaluateHand(cards []models.Card) EvaluatedHand {
	if len(cards) <= 5 {
		return evaluateFive(cards)
	}
	var best EvaluatedHand
	found := false
	combo := make([]models.Card, 5)
	var pick func(start, depth int)
	pick = func(start, depth int) {
		if depth == 5 {
			h := evaluateFive(combo)
			if !found || CompareHands(h, best) > 0 {
				h.Cards = append([]models.Card(nil), h.Cards...)
				best, found = h, true
			}
			return
		}
		for i := start; i <= len(cards)-(5-depth); i++ {
			combo[depth] = cards[i]
			pick(i+1, depth+1)
		}
	}
	pick(0, 0)
	return best
}

// CompareHands returns 1 if a wins, -1 if b wins, 0 if tie.
func CompareHands(a, b EvaluatedHand) int {
	if a.Rank != b.Rank {
		if a.Rank > b.Rank {
			return 1
		}
		return -1
	}
	for i := 0; i < len(a.TieBreakers) && i < len(b.TieBreakers); i++ {
		if a.TieBreakers[i] != b.TieBreakers[i] {
			if a.TieBreakers[i] > b.TieBreakers[i] {
				return 1
			}
			return -1
		}
	}
	return 0
}

// rankValue maps a card rank to 2..14 (ace high).
func rankValue(rank string) int {
	switch rank {
	case "J":
		return 11
	case "Q":
		return 12
	case "K":
		return 13
	case "A":
		return 14
	case "10":
		return 10
	}
	if len(rank) == 1 && rank[0] >= '2' && rank[0] <= '9' {
		return int(rank[0] - '0')
	}
	return 0
}

// evaluateFive ranks a hand of at most five cards.
func evaluateFive(cards []models.Card) EvaluatedHand {
	sorted := append([]models.Card(nil), cards...)
	sort.Slice(sorted, func(i, j int) bool { return rankValue(sorted[i].Rank) > rankValue(sorted[j].Rank) })

	counts := map[int]int{}
	for _, c := range sorted {
		counts[rankValue(c.Rank)]++
	}
	// Groups ordered by size, then value: e.g. a full house is [trips, pair].
	groups := make([]int, 0, len(counts))
	for v := range counts {
		groups = append(groups, v)
	}
	sort.Slice(groups, func(i, j int) bool {
		if counts[groups[i]] != counts[groups[j]] {
			return counts[groups[i]] > counts[groups[j]]
		}
		return groups[i] > groups[j]
	})
	// Order the cards the same way so the hand reads naturally (pairs first).
	sort.SliceStable(sorted, func(i, j int) bool {
		vi, vj := rankValue(sorted[i].Rank), rankValue(sorted[j].Rank)
		if counts[vi] != counts[vj] {
			return counts[vi] > counts[vj]
		}
		return vi > vj
	})

	if len(sorted) == 5 {
		flush := true
		for _, c := range sorted[1:] {
			if c.Suit != sorted[0].Suit {
				flush = false
			}
		}
		high, straight := straightHigh(groups)
		if straight && high == 5 {
			// Wheel: show the ace as the low card.
			sorted = append(sorted[1:], sorted[0])
		}
		switch {
		case straight && flush && high == 14:
			return EvaluatedHand{Rank: RoyalFlush, Cards: sorted, TieBreakers: []int{high}}
		case straight && flush:
			return EvaluatedHand{Rank: StraightFlush, Cards: sorted, TieBreakers: []int{high}}
		case flush:
			return EvaluatedHand{Rank: Flush, Cards: sorted, TieBreakers: groups}
		case straight:
			return EvaluatedHand{Rank: Straight, Cards: sorted, TieBreakers: []int{high}}
		}
	}

	rank := HighCard
	if len(groups) > 0 {
		switch counts[groups[0]] {
		case 4:
			rank = FourOfAKind
		case 3:
			rank = ThreeOfAKind
			if len(groups) > 1 && counts[groups[1]] == 2 {
				rank = FullHouse
			}
		case 2:
			rank = OnePair
			if len(groups) > 1 && counts[groups[1]] == 2 {
				rank = TwoPair
			}
		}
	}
	return EvaluatedHand{Rank: rank, Cards: sorted, TieBreakers: groups}
}

// straightHigh reports whether five distinct values (sorted high to low) form
// a straight, and its top card. A-2-3-4-5 counts as a 5-high straight.
func straightHigh(values []int) (int, bool) {
	if len(values) != 5 {
		return 0, false
	}
	if values[0]-values[4] == 4 {
		return values[0], true
	}
	if values[0] == 14 && values[1] == 5 && values[4] == 2 {
		return 5, true
	}
	return 0, false
}
