package bot

import (
	"math/rand"
	"slices"

	"casino/internal/game"
	"casino/internal/models"
)

// PokerBot plays a simple equity-based strategy: it estimates its chance of
// winning by simulating random run-outs against the players still in the
// hand, then folds, calls or raises by comparing that to the pot odds, with a
// little randomness so it is not fully predictable.
type PokerBot struct {
	// Simulations per decision; more is stronger but slower.
	Simulations int
}

func NewPokerBot() *PokerBot { return &PokerBot{Simulations: 300} }

// DecideAction receives the bot's own player view (*models.PokerGameState):
// its hole cards, the board and the other players' hidden cards.
func (b *PokerBot) DecideAction(raw any, playerID string) models.Action {
	state, ok := raw.(*models.PokerGameState)
	if !ok {
		return models.Action{Type: "fold"}
	}
	me := -1
	opponents := 0
	for i, p := range state.Players {
		switch {
		case p.ID == playerID:
			me = i
		case p.Status == "active" || p.Status == "all_in":
			opponents++
		}
	}
	if me < 0 {
		return models.Action{Type: "fold"}
	}
	p := state.Players[me]
	can := func(a string) bool { return slices.Contains(state.ValidActions, a) }

	toCall := state.CurrentBet - p.CurrentBet
	equity := b.equity(p.Cards, state.CommunityCards, opponents)
	potOdds := 0.0
	if toCall > 0 {
		potOdds = float64(toCall) / float64(state.Pot+toCall)
	}
	r := rand.Float64()

	raise := func(potFraction float64) models.Action {
		to := state.CurrentBet + int64(float64(state.Pot+toCall)*potFraction)
		if to < state.MinRaise {
			to = state.MinRaise
		}
		return models.Action{Type: "raise", Amount: to}
	}

	// Strong hand: build the pot, occasionally shove the nuts-ish ones.
	if equity > 0.85 && can("all_in") && r < 0.25 {
		return models.Action{Type: "all_in"}
	}
	if (equity > 0.65 || (equity > 0.45 && opponents == 1)) && r < 0.8 {
		if can("raise") {
			return raise(0.5 + rand.Float64()/2)
		}
	}

	if toCall <= 0 {
		// Nothing to pay: check, with the odd bluff bet.
		if can("raise") && r < 0.08 {
			return raise(0.5)
		}
		return models.Action{Type: "check"}
	}

	// Calling off a big part of the stack needs a real hand.
	need := potOdds + 0.05
	if toCall*2 > p.Chips {
		need = max(need, 0.5)
	}
	if equity >= need || r < 0.03 {
		return models.Action{Type: "call"}
	}
	return models.Action{Type: "fold"}
}

var (
	suits = []string{"hearts", "diamonds", "clubs", "spades"}
	ranks = []string{"2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"}
)

// equity estimates the share of pots the hole cards win (ties split) against
// `opponents` random hands, with the board completed at random.
func (b *PokerBot) equity(hole, board []models.Card, opponents int) float64 {
	if len(hole) < 2 || opponents == 0 {
		return 1
	}
	known := map[models.Card]bool{}
	for _, c := range append(append([]models.Card{}, hole...), board...) {
		known[models.Card{Suit: c.Suit, Rank: c.Rank}] = true
	}
	var deck []models.Card
	for _, s := range suits {
		for _, r := range ranks {
			if c := (models.Card{Suit: s, Rank: r}); !known[c] {
				deck = append(deck, c)
			}
		}
	}

	sims := max(b.Simulations, 1)
	need := 5 - len(board) + 2*opponents
	if need > len(deck) {
		return 1.0 / float64(opponents+1)
	}
	var won float64
	mine := make([]models.Card, 0, 7)
	theirs := make([]models.Card, 0, 7)
	for n := 0; n < sims; n++ {
		// Partial shuffle: only the cards this run-out uses.
		for i := 0; i < need; i++ {
			j := i + rand.Intn(len(deck)-i)
			deck[i], deck[j] = deck[j], deck[i]
		}
		fullBoard := append(append([]models.Card{}, board...), deck[:5-len(board)]...)
		draw := deck[5-len(board):]

		mine = append(append(mine[:0], hole...), fullBoard...)
		myHand := game.EvaluateHand(mine)
		best, ties := true, 1
		for o := 0; o < opponents && best; o++ {
			theirs = append(append(theirs[:0], draw[2*o], draw[2*o+1]), fullBoard...)
			switch game.CompareHands(game.EvaluateHand(theirs), myHand) {
			case 1:
				best = false
			case 0:
				ties++
			}
		}
		if best {
			won += 1 / float64(ties)
		}
	}
	return won / float64(sims)
}
