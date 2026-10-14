package game

import (
	"encoding/json"
	"strings"
	"testing"

	"casino/internal/models"
)

// hand parses cards like "As Kd 10h 2c".
func hand(s string) []models.Card {
	suit := map[byte]string{'h': "hearts", 'd': "diamonds", 'c': "clubs", 's': "spades"}
	var cs []models.Card
	for _, f := range strings.Fields(s) {
		cs = append(cs, models.Card{Rank: f[:len(f)-1], Suit: suit[f[len(f)-1]]})
	}
	return cs
}

func TestEvaluateHandRanks(t *testing.T) {
	tests := []struct {
		cards string
		want  HandRank
	}{
		{"As Ks Qs Js 10s 2c 3d", RoyalFlush},
		{"9h 8h 7h 6h 5h Ac Ad", StraightFlush},
		{"7c 7d 7h 7s Kd 2c 3c", FourOfAKind},
		{"Qc Qd Qh 4s 4d 2c 9c", FullHouse},
		{"2h 9h Jh 4h Kh Qc Qd", Flush},
		{"Ac 2d 3h 4s 5d Kc Kd", Straight},
		{"8c 8d 8h Ks 2d 4c 6c", ThreeOfAKind},
		{"Jc Jd 4h 4s 9d 2c 3c", TwoPair},
		{"10c 10d 4h 7s 9d 2c Kc", OnePair},
		{"Ac 10d 4h 7s 9d 2c Kc", HighCard},
	}
	for _, tt := range tests {
		if got := EvaluateHand(hand(tt.cards)).Rank; got != tt.want {
			t.Errorf("%s: got %v, want %v", tt.cards, got, tt.want)
		}
	}
}

func TestCompareHands(t *testing.T) {
	tests := []struct {
		a, b string
		want int
	}{
		{"Ac Ad Kh Qs 2d 3c 7c", "Ac Ad Jh Qs 2d 3c 7c", 1},  // kicker
		{"2c 3d 4h 5s 6d Kc Kd", "Ac 2d 3h 4s 5d Kc Kd", 1},  // 6-high beats the wheel
		{"Kh Kd 9c 9s 2d 3c 4h", "Kh Kd 9c 9s 2d 3c 5h", -1}, // two pair, kicker
		{"Ah 2d Kc Kd Qs Qh Jc", "As 3d Kc Kd Qs Qh Jc", 0},  // board plays
		{"Qc Qd Qh 4s 4d 2c 9c", "Jc Jd Jh As Ad 2c 9c", 1},  // full house by trips
	}
	for _, tt := range tests {
		got := CompareHands(EvaluateHand(hand(tt.a)), EvaluateHand(hand(tt.b)))
		if got != tt.want {
			t.Errorf("%s vs %s: got %d, want %d", tt.a, tt.b, got, tt.want)
		}
	}
}

func TestEvaluateHandPicksBestFive(t *testing.T) {
	h := EvaluateHand(hand("Ac 2d 3h 4s 5d 6c Kd"))
	if h.Rank != Straight || h.TieBreakers[0] != 6 || len(h.Cards) != 5 {
		t.Fatalf("got %v %v (%d cards), want 6-high straight", h.Rank, h.TieBreakers, len(h.Cards))
	}
}

func players(chips ...int64) []models.Player {
	ps := make([]models.Player, len(chips))
	for i, c := range chips {
		ps[i] = models.Player{ID: string(rune('a' + i)), Chips: c}
	}
	return ps
}

func startPoker(t *testing.T, deck string, dealer int, chips ...int64) (*PokerEngine, *PokerState) {
	t.Helper()
	if deck != "" {
		orig := newPokerDeck
		newPokerDeck = func() []models.Card { return hand(deck) }
		t.Cleanup(func() { newPokerDeck = orig })
	}
	e := NewPokerEngine()
	raw, err := e.StartGame(players(chips...), map[string]any{"bigBlind": float64(100), "dealerIndex": float64(dealer)})
	if err != nil {
		t.Fatal(err)
	}
	return e, raw.(*PokerState)
}

func act(t *testing.T, e *PokerEngine, s *PokerState, id, action string, amount int64) {
	t.Helper()
	if _, err := e.HandleAction(s, id, models.Action{Type: action, Amount: amount}); err != nil {
		t.Fatalf("%s %s %d: %v", id, action, amount, err)
	}
}

func turn(s *PokerState) string { return s.Players[s.CurrentTurnIndex].ID }

func TestBlindsAndTurnOrder(t *testing.T) {
	e, s := startPoker(t, "", 0, 1000, 1000, 1000, 1000)
	if s.SmallBlindIndex != 1 || s.BigBlindIndex != 2 || turn(s) != "d" {
		t.Fatalf("sb=%d bb=%d turn=%s, want 1, 2, d", s.SmallBlindIndex, s.BigBlindIndex, turn(s))
	}
	if s.Pot != 150 || s.Players[1].Chips != 950 || s.Players[2].Chips != 900 {
		t.Fatalf("blinds not posted: pot=%d", s.Pot)
	}
	act(t, e, s, "d", "call", 0)
	act(t, e, s, "a", "call", 0)
	act(t, e, s, "b", "call", 0)
	if s.Phase != "pre_flop" || turn(s) != "c" {
		t.Fatalf("big blind should get the option, phase=%s turn=%s", s.Phase, turn(s))
	}
	act(t, e, s, "c", "check", 0)
	if s.Phase != "flop" || len(s.CommunityCards) != 3 || turn(s) != "b" {
		t.Fatalf("phase=%s board=%d turn=%s, want flop, 3, b", s.Phase, len(s.CommunityCards), turn(s))
	}
	if s.Pot != 400 || s.CurrentBet != 0 {
		t.Fatalf("pot=%d currentBet=%d", s.Pot, s.CurrentBet)
	}
}

func TestHeadsUpButtonIsSmallBlind(t *testing.T) {
	e, s := startPoker(t, "", 0, 1000, 1000)
	if s.SmallBlindIndex != 0 || s.BigBlindIndex != 1 || turn(s) != "a" {
		t.Fatalf("sb=%d bb=%d turn=%s", s.SmallBlindIndex, s.BigBlindIndex, turn(s))
	}
	act(t, e, s, "a", "call", 0)
	act(t, e, s, "b", "check", 0)
	if s.Phase != "flop" || turn(s) != "b" {
		t.Fatalf("post-flop the big blind acts first: phase=%s turn=%s", s.Phase, turn(s))
	}
}

func TestEveryoneFoldsToRaise(t *testing.T) {
	e, s := startPoker(t, "", 0, 1000, 1000, 1000)
	// Dealer a is first to act pre-flop with three players.
	act(t, e, s, "a", "raise", 300)
	act(t, e, s, "b", "fold", 0)
	act(t, e, s, "c", "fold", 0)
	if !e.IsRoundOver(s) {
		t.Fatal("hand should be over")
	}
	_, changes, err := e.ResolveRound(s)
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]int64{"a": 150, "b": -50, "c": -100}
	for _, c := range changes {
		if c.Amount != want[c.PlayerID] {
			t.Errorf("%s: change %d, want %d", c.PlayerID, c.Amount, want[c.PlayerID])
		}
	}
	if len(s.Winners) != 1 || s.Winners[0] != "a" {
		t.Errorf("winners = %v", s.Winners)
	}
}

func TestRaiseValidation(t *testing.T) {
	e, s := startPoker(t, "", 0, 1000, 1000, 1000)
	if _, err := e.HandleAction(s, "b", models.Action{Type: "call"}); err == nil {
		t.Error("acting out of turn should fail")
	}
	if _, err := e.HandleAction(s, "a", models.Action{Type: "check"}); err == nil {
		t.Error("checking facing the big blind should fail")
	}
	if _, err := e.HandleAction(s, "a", models.Action{Type: "raise", Amount: 150}); err == nil {
		t.Error("raise below the minimum should fail")
	}
	act(t, e, s, "a", "raise", 300)
	if s.MinRaise != 500 {
		t.Errorf("min raise after raise to 300 = %d, want 500", s.MinRaise)
	}
}

func TestShortAllInDoesNotReopenRaising(t *testing.T) {
	e, s := startPoker(t, "", 0, 1000, 1000, 350)
	act(t, e, s, "a", "raise", 300)
	act(t, e, s, "b", "call", 0)
	act(t, e, s, "c", "all_in", 0) // to 350: only 50 more than 300
	if s.CurrentBet != 350 || s.MinRaise != 550 {
		t.Fatalf("currentBet=%d minRaise=%d", s.CurrentBet, s.MinRaise)
	}
	if _, err := e.HandleAction(s, "a", models.Action{Type: "raise", Amount: 1000}); err == nil {
		t.Fatal("a already acted; a short all-in must not let them re-raise")
	}
	act(t, e, s, "a", "call", 0)
	act(t, e, s, "b", "call", 0)
	if s.Phase != "flop" {
		t.Fatalf("phase = %s, want flop", s.Phase)
	}
}

func TestSidePotsAtShowdown(t *testing.T) {
	// Dealt one card at a time starting left of the button (b, c, a), then
	// burn + board. a: AA, b: KK, c: QQ; the board helps nobody.
	deck := "Kc Qc Ac Kd Qd Ad 2s 3h 7c 9d 2h 4s 2d 8h 3c"
	e, s := startPoker(t, deck, 0, 300, 1000, 1000)
	act(t, e, s, "a", "all_in", 0) // 300
	act(t, e, s, "b", "raise", 800)
	act(t, e, s, "c", "call", 0)
	if s.Phase != "flop" || len(s.SidePots) != 2 {
		t.Fatalf("phase=%s sidePots=%v", s.Phase, s.SidePots)
	}
	act(t, e, s, "b", "all_in", 0)
	act(t, e, s, "c", "call", 0)
	if !e.IsRoundOver(s) || len(s.CommunityCards) != 5 {
		t.Fatalf("hand should run out to showdown, board=%d", len(s.CommunityCards))
	}
	_, changes, _ := e.ResolveRound(s)
	// Main pot 900 to a (AA); side pot 1400 to b (KK); c loses 1000.
	want := map[string]int64{"a": 600, "b": 400, "c": -1000}
	for _, c := range changes {
		if c.Amount != want[c.PlayerID] {
			t.Errorf("%s: change %d, want %d", c.PlayerID, c.Amount, want[c.PlayerID])
		}
	}
	if s.Players[0].HandRank != "One Pair" {
		t.Errorf("hand rank = %q", s.Players[0].HandRank)
	}
}

func TestUncalledBetIsReturned(t *testing.T) {
	deck := "Qc Kc Qd Kd 2s 3h 7c 9d 2h 4s 2d 8h 3c"
	e, s := startPoker(t, deck, 0, 2000, 500)
	act(t, e, s, "a", "raise", 1500)
	act(t, e, s, "b", "call", 0) // all-in for 500
	_, changes, _ := e.ResolveRound(s)
	// a (KK) beats b (QQ) and only 500 of a's 1500 was at risk.
	if changes[0].Amount != 500 || changes[1].Amount != -500 {
		t.Fatalf("changes = %+v", changes)
	}
}

func TestSplitPot(t *testing.T) {
	// Both play the board's straight.
	deck := "2c 3c 2d 3d 2s 10h Jc Qd 2h Ks 4d Ah"
	e, s := startPoker(t, deck, 0, 1000, 1000)
	act(t, e, s, "a", "call", 0)
	for s.Status != "finished" {
		act(t, e, s, turn(s), "check", 0)
	}
	_, changes, _ := e.ResolveRound(s)
	if changes[0].Amount != 0 || changes[1].Amount != 0 {
		t.Fatalf("split pot changes = %+v", changes)
	}
}

func TestViewHidesOtherHoleCards(t *testing.T) {
	e, s := startPoker(t, "", 0, 1000, 1000, 1000)
	v := e.GetStateForPlayer(s, "a").(*models.PokerGameState)
	if v.Players[0].Cards[0].Hidden || !v.Players[1].Cards[0].Hidden || v.Players[1].Cards[0].Rank != "" {
		t.Fatal("a should see only their own cards")
	}
	if len(v.ValidActions) == 0 {
		t.Error("a is to act and should get valid actions")
	}
	if other := e.GetStateForPlayer(s, "b").(*models.PokerGameState); other.ValidActions != nil {
		t.Error("b is not to act")
	}
	data, _ := json.Marshal(v)
	if strings.Contains(string(data), `"deck"`) {
		t.Error("view leaks the deck")
	}
}

func TestOfflineAddsBotsAndWaitsForHuman(t *testing.T) {
	e := NewPokerEngine() // no Bot: bots check or call
	for n := 0; n < 50; n++ {
		raw, err := e.StartGame([]models.Player{{ID: "me", Chips: 5000}}, nil)
		if err != nil {
			t.Fatal(err)
		}
		s := raw.(*PokerState)
		if len(s.Players) != 5 || !s.IsOffline {
			t.Fatalf("want 5 players offline, got %d", len(s.Players))
		}
		for s.Status != "finished" {
			if turn(s) != "me" {
				t.Fatalf("state returned on a bot's turn: %s", turn(s))
			}
			act(t, e, s, "me", s.view("me").ValidActions[1], 0) // check or call
		}
		_, changes, _ := e.ResolveRound(s)
		var sum int64
		for _, c := range changes {
			sum += c.Amount
		}
		if sum != 0 {
			t.Fatalf("chips not conserved: %+v", changes)
		}
	}
}

func TestLoadStateRoundTrip(t *testing.T) {
	e, s := startPoker(t, "", 0, 1000, 1000, 1000)
	data, _ := json.Marshal(s)
	raw, err := e.LoadState(data)
	if err != nil {
		t.Fatal(err)
	}
	loaded := raw.(*PokerState)
	act(t, e, loaded, turn(loaded), "call", 0)
	if len(loaded.Deck) != len(s.Deck) || e.PlayerChips(loaded, "a") != 900 {
		t.Fatalf("loaded state is off: deck %d, chips %d", len(loaded.Deck), e.PlayerChips(loaded, "a"))
	}
}

func TestLogRecordsTheHand(t *testing.T) {
	e, s := startPoker(t, "", 0, 1000, 1000, 1000)
	act(t, e, s, "a", "raise", 300)
	act(t, e, s, "b", "call", 0)
	act(t, e, s, "c", "fold", 0)
	var got []string
	for _, ev := range s.Log {
		got = append(got, ev.Action)
	}
	want := "small_blind big_blind raise call fold collect flop"
	if strings.Join(got, " ") != want {
		t.Fatalf("log = %v, want %s", got, want)
	}
	if last := s.Log[len(s.Log)-1]; last.Pot != 700 {
		t.Errorf("pot after flop = %d, want 700", last.Pot)
	}
	if raise := s.Log[2]; raise.PlayerID != "a" || raise.Bet != 300 || raise.Chips != 700 || raise.Pot != 450 {
		t.Errorf("raise event = %+v", raise)
	}
}
