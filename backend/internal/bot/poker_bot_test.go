package bot

import (
	"slices"
	"testing"

	"casino/internal/game"
	"casino/internal/models"
)

// Plays whole offline hands with the real bot, the human picking random
// legal actions, and checks every hand ends with chips conserved.
func TestPokerBotPlaysFullHands(t *testing.T) {
	e := game.NewPokerEngine()
	e.Bot = &PokerBot{Simulations: 50}
	for n := 0; n < 200; n++ {
		state, err := e.StartGame([]models.Player{{ID: "me", Chips: 3000}}, nil)
		if err != nil {
			t.Fatal(err)
		}
		for steps := 0; !e.IsRoundOver(state); steps++ {
			if steps > 100 {
				t.Fatal("hand did not finish")
			}
			v := e.GetStateForPlayer(state, "me").(*models.PokerGameState)
			if len(v.ValidActions) == 0 {
				t.Fatal("human has no actions but the hand is waiting")
			}
			a := models.Action{Type: v.ValidActions[(n+steps)%len(v.ValidActions)]}
			if a.Type == "raise" {
				a.Amount = v.MinRaise
			}
			if !slices.Contains(v.ValidActions, a.Type) {
				t.Fatalf("picked invalid action %s", a.Type)
			}
			if state, err = e.HandleAction(state, "me", a); err != nil {
				t.Fatalf("%s: %v", a.Type, err)
			}
		}
		_, changes, _ := e.ResolveRound(state)
		var sum int64
		for _, c := range changes {
			sum += c.Amount
		}
		if sum != 0 {
			t.Fatalf("chips not conserved: %+v", changes)
		}
	}
}

func TestEquityFavoursAces(t *testing.T) {
	b := &PokerBot{Simulations: 2000}
	aces := []models.Card{{Suit: "hearts", Rank: "A"}, {Suit: "spades", Rank: "A"}}
	junk := []models.Card{{Suit: "hearts", Rank: "7"}, {Suit: "spades", Rank: "2"}}
	if ea, ej := b.equity(aces, nil, 1), b.equity(junk, nil, 1); ea < 0.75 || ej > 0.45 {
		t.Fatalf("AA equity %.2f, 72o equity %.2f", ea, ej)
	}
}
