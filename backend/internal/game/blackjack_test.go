package game

import (
	"testing"

	"casino/internal/models"
)

func cards(ranks ...string) []models.Card {
	cs := make([]models.Card, len(ranks))
	for i, r := range ranks {
		cs[i] = models.Card{Suit: "spades", Rank: r}
	}
	return cs
}

func standingState(dealer []models.Card, deck []models.Card) *BlackjackState {
	return &BlackjackState{
		BlackjackGameState: models.BlackjackGameState{
			Players: []models.BlackjackPlayer{{
				Player: models.Player{ID: "p1"},
				Hands:  []models.BlackjackHand{{Cards: cards("10", "8"), Bet: 10, Status: "stand"}},
			}},
			DealerHand: models.DealerHand{Cards: dealer},
		},
		Deck: deck,
	}
}

func TestDealerDrawsWhileSafeRatioHigh(t *testing.T) {
	// 16 + 2 = 18; then only 3 of {3, 4, 5} is safe (33% <= 35%), so stand.
	s := standingState(cards("10", "6"), cards("2", "3", "4", "5"))
	runDealer(s)
	if got, n := handValue(s.DealerHand.Cards), len(s.DealerHand.Cards); got != 18 || n != 3 {
		t.Fatalf("dealer total = %d with %d cards, want 18 with 3", got, n)
	}
}

func TestDealerStandsWhenDeckIsRisky(t *testing.T) {
	// Every remaining card busts 16, so the dealer stands even below 17.
	s := standingState(cards("10", "6"), cards("10", "K", "Q"))
	runDealer(s)
	if n := len(s.DealerHand.Cards); n != 2 {
		t.Fatalf("dealer drew into a risky deck: %d cards", n)
	}
}

func TestDealerCountsAceAsOneWhenDrawing(t *testing.T) {
	// Soft 17 + 10 = hard 17, which is safe, so the dealer draws once.
	s := standingState(cards("A", "6"), cards("10", "10", "10"))
	runDealer(s)
	if got, n := handValue(s.DealerHand.Cards), len(s.DealerHand.Cards); got != 17 || n != 3 {
		t.Fatalf("dealer total = %d with %d cards, want 17 with 3", got, n)
	}
}

func TestDealerStandsOnEmptyDeck(t *testing.T) {
	s := standingState(cards("2", "3"), nil)
	runDealer(s)
	if n := len(s.DealerHand.Cards); n != 2 {
		t.Fatalf("dealer drew from empty deck: %d cards", n)
	}
}

func TestDealerDoesNotDrawWhenPlayerBust(t *testing.T) {
	s := standingState(cards("10", "2"), cards("5"))
	s.Players[0].Hands[0].Status = "bust"
	runDealer(s)
	if n := len(s.DealerHand.Cards); n != 2 {
		t.Fatalf("dealer drew with no standing hands: %d cards", n)
	}
}

func TestResolveBlackjackVsBlackjackPushes(t *testing.T) {
	s := standingState(cards("A", "K"), nil)
	s.Phase = "resolved"
	s.Players[0].Hands[0] = models.BlackjackHand{Cards: cards("A", "Q"), Bet: 10, Status: "blackjack"}
	_, changes, err := NewBlackjackEngine().ResolveRound(s)
	if err != nil || changes[0].Amount != 0 {
		t.Fatalf("changes = %+v, err = %v; want push", changes, err)
	}
}

func TestResolveDealerBlackjackBeats21(t *testing.T) {
	s := standingState(cards("A", "K"), nil)
	s.Phase = "resolved"
	s.Players[0].Hands[0] = models.BlackjackHand{Cards: cards("7", "7", "7"), Bet: 10, Status: "stand"}
	_, changes, _ := NewBlackjackEngine().ResolveRound(s)
	if changes[0].Amount != -10 {
		t.Fatalf("amount = %d, want -10", changes[0].Amount)
	}
}
