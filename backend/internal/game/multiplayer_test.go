package game

import (
	"testing"

	"casino/internal/models"
)

func twoPlayers() []models.Player {
	return []models.Player{{ID: "a", Chips: 1000}, {ID: "b", Chips: 1000}}
}

func TestBlackjackWaitsForEveryBetThenTakesTurnsInOrder(t *testing.T) {
	e := NewBlackjackEngine()
	raw, _ := e.StartGame(twoPlayers(), nil)
	s := raw.(*BlackjackState)
	// No naturals: a 10-6 and 10-5 for the players, 10-7 for the dealer.
	s.Deck = cards("10", "10", "10", "6", "5", "7", "2", "2", "2", "2")

	if _, ok := e.Waiting(s); ok {
		t.Fatal("clock running before anyone bet")
	}
	if _, err := e.HandleAction(s, "a", models.Action{Type: "bet", Amount: 10}); err != nil {
		t.Fatal(err)
	}
	if s.Phase != "betting" || len(s.DealerHand.Cards) != 0 {
		t.Fatalf("dealt before everyone bet: phase %s", s.Phase)
	}
	if w, ok := e.Waiting(s); !ok || !w.Betting {
		t.Fatal("no betting clock after the first bet")
	}
	if _, err := e.HandleAction(s, "a", models.Action{Type: "bet", Amount: 10}); err == nil {
		t.Fatal("bet twice")
	}
	if _, err := e.HandleAction(s, "b", models.Action{Type: "bet", Amount: 20}); err != nil {
		t.Fatal(err)
	}
	if s.Phase != "player_turns" || s.CurrentPlayerIndex != 0 {
		t.Fatalf("phase %s turn %d, want player_turns 0", s.Phase, s.CurrentPlayerIndex)
	}
	if _, err := e.HandleAction(s, "b", models.Action{Type: "stand"}); err == nil {
		t.Fatal("b acted out of turn")
	}
	e.HandleAction(s, "a", models.Action{Type: "stand"})
	if s.CurrentPlayerIndex != 1 {
		t.Fatalf("turn %d after a stood, want 1", s.CurrentPlayerIndex)
	}
	// b runs out of time and stands; the dealer plays and the round is over.
	if _, err := e.Timeout(s); err != nil {
		t.Fatal(err)
	}
	if !e.IsRoundOver(s) {
		t.Fatal("round not over after the last player")
	}
	if _, changes, err := e.ResolveRound(s); err != nil || len(changes) != 2 {
		t.Fatalf("changes %v, err %v", changes, err)
	}
}

func TestBlackjackTimeoutDealsOnlyToBettors(t *testing.T) {
	e := NewBlackjackEngine()
	raw, _ := e.StartGame(twoPlayers(), nil)
	s := raw.(*BlackjackState)
	e.HandleAction(s, "a", models.Action{Type: "bet", Amount: 10})
	e.Timeout(s)
	if len(s.Players[1].Hands) != 0 || len(s.Players[0].Hands[0].Cards) != 2 {
		t.Fatal("cards went to the wrong players")
	}
	for !e.IsRoundOver(s) {
		e.Timeout(s)
	}
	_, changes, _ := e.ResolveRound(s)
	if len(changes) != 1 || changes[0].PlayerID != "a" {
		t.Fatalf("changes %v, want only a's", changes)
	}
}

func TestBaccaratDealsOnceEveryoneBet(t *testing.T) {
	e := NewBaccaratEngine()
	raw, _ := e.StartGame(twoPlayers(), nil)
	s := raw.(*BaccaratState)
	bet := models.Action{Type: "deal", Bets: []models.Bet{{Type: "player", Amount: 50}}}
	e.HandleAction(s, "a", bet)
	if s.Phase != "betting" {
		t.Fatal("dealt before everyone bet")
	}
	e.HandleAction(s, "b", bet)
	if !e.IsRoundOver(s) || len(s.PlayerHand.Cards) < 2 {
		t.Fatal("coup not dealt")
	}
	_, changes, _ := e.ResolveRound(s)
	if changes[0].Amount != changes[1].Amount {
		t.Fatalf("same bets, different results: %v", changes)
	}
}

func TestRouletteTimeoutSpinsForBettors(t *testing.T) {
	orig := spinWheel
	spinWheel = func() (int, error) { return 17, nil }
	t.Cleanup(func() { spinWheel = orig })
	e := NewRouletteEngine()
	raw, _ := e.StartGame(twoPlayers(), nil)
	s := raw.(*RouletteState)
	e.HandleAction(s, "a", models.Action{Type: "spin", Bets: []models.Bet{{Type: "straight-17", Amount: 10}}})
	if s.Phase != "betting" {
		t.Fatal("spun before everyone bet")
	}
	if _, err := e.Timeout(s); err != nil {
		t.Fatal(err)
	}
	if s.Players[0].Chips != 1000-10+360 || s.Players[1].Chips != 1000 {
		t.Fatalf("chips %d / %d", s.Players[0].Chips, s.Players[1].Chips)
	}
}

func TestPokerTimeoutChecksOrFolds(t *testing.T) {
	e := NewPokerEngine()
	raw, _ := e.StartGame(twoPlayers(), map[string]any{"dealerIndex": 0})
	s := raw.(*PokerState)
	// Heads-up the button (a) is small blind and owes 50 more: timing out folds.
	if _, err := e.Timeout(s); err != nil {
		t.Fatal(err)
	}
	if s.Players[0].Status != "folded" || !e.IsRoundOver(s) {
		t.Fatalf("a %s, over %v", s.Players[0].Status, e.IsRoundOver(s))
	}
}
