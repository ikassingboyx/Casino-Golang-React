package game

import (
	"testing"

	"casino/internal/models"
)

func TestBaccaratPoints(t *testing.T) {
	cases := map[string]int{"A": 1, "2": 2, "9": 9, "10": 0, "J": 0, "Q": 0, "K": 0}
	for rank, want := range cases {
		if got := baccaratPoints(models.Card{Rank: rank}); got != want {
			t.Errorf("%s: got %d, want %d", rank, got, want)
		}
	}
	if got := baccaratTotal(cards("9", "8", "K")); got != 7 {
		t.Errorf("9+8+K: got %d, want 7", got)
	}
}

// The shoe is dealt player, banker, player, banker, then third cards.
func TestDealCoup(t *testing.T) {
	cases := []struct {
		name           string
		shoe           []string
		player, banker int // cards in each hand
		pt, bt         int // totals
	}{
		{"player natural", []string{"9", "2", "K", "3", "5", "5"}, 2, 2, 9, 5},
		{"banker natural", []string{"2", "4", "3", "4", "5", "5"}, 2, 2, 5, 8},
		{"both stand", []string{"3", "3", "3", "4", "5", "5"}, 2, 2, 6, 7},
		{"player stands, banker draws on 5", []string{"3", "2", "4", "3", "4", "5"}, 2, 3, 7, 9},
		{"player draws, banker 7 stands", []string{"2", "3", "2", "4", "5", "5"}, 3, 2, 9, 7},
		{"banker 3 stands on player third 8", []string{"A", "K", "2", "3", "8", "5"}, 3, 2, 1, 3},
		{"banker 3 draws on player third 9", []string{"A", "K", "2", "3", "9", "5"}, 3, 3, 2, 8},
		{"banker 6 draws on player third 6", []string{"A", "3", "2", "3", "6", "2"}, 3, 3, 9, 8},
		{"banker 6 stands on player third 5", []string{"A", "3", "2", "3", "5", "2"}, 3, 2, 8, 6},
	}
	for _, c := range cases {
		shoe := cards(c.shoe...)
		p, b := dealCoup(&shoe)
		if len(p.Cards) != c.player || len(b.Cards) != c.banker || p.Total != c.pt || b.Total != c.bt {
			t.Errorf("%s: got player %d cards (%d), banker %d cards (%d); want %d (%d), %d (%d)",
				c.name, len(p.Cards), p.Total, len(b.Cards), b.Total, c.player, c.pt, c.banker, c.bt)
		}
	}
}

func TestBankerTableau(t *testing.T) {
	// Banker total → player third-card values on which the banker draws.
	draws := map[int][]int{
		0: {0, 1, 2, 3, 4, 5, 6, 7, 8, 9},
		1: {0, 1, 2, 3, 4, 5, 6, 7, 8, 9},
		2: {0, 1, 2, 3, 4, 5, 6, 7, 8, 9},
		3: {0, 1, 2, 3, 4, 5, 6, 7, 9},
		4: {2, 3, 4, 5, 6, 7},
		5: {4, 5, 6, 7},
		6: {6, 7},
		7: {},
	}
	for total, want := range draws {
		set := map[int]bool{}
		for _, v := range want {
			set[v] = true
		}
		for third := 0; third <= 9; third++ {
			if got := bankerDraws(total, third); got != set[third] {
				t.Errorf("banker %d, player third %d: draws=%v, want %v", total, third, got, set[third])
			}
		}
	}
}

func TestBaccaratPayouts(t *testing.T) {
	bets := models.BaccaratBets{Player: 100, Banker: 100, Tie: 10}
	cases := map[string]models.BaccaratBets{
		"player": {Player: 200},
		"banker": {Banker: 195},
		"tie":    {Player: 100, Banker: 100, Tie: 90},
	}
	for result, want := range cases {
		if got := baccaratPayouts(bets, result); got != want {
			t.Errorf("%s: got %+v, want %+v", result, got, want)
		}
	}
	// Commission is rounded down in the house's favour.
	if got := baccaratPayouts(models.BaccaratBets{Banker: 25}, "banker").Banker; got != 48 {
		t.Errorf("banker 25: got %d, want 48", got)
	}
}

func TestBaccaratRound(t *testing.T) {
	orig := newBaccaratShoe
	defer func() { newBaccaratShoe = orig }()
	newBaccaratShoe = func() []models.Card { return cards("9", "2", "K", "3") } // player 9, banker 5

	e := NewBaccaratEngine()
	raw, err := e.StartGame([]models.Player{{ID: "u", Chips: 1000}}, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := e.HandleAction(raw, "u", models.Action{Type: "deal", Bets: []models.RouletteBet{{Type: "player", Amount: 2000}}}); err == nil {
		t.Error("expected an error for bets above the balance")
	}
	if _, err := e.HandleAction(raw, "u", models.Action{Type: "deal", Bets: []models.RouletteBet{{Type: "dragon", Amount: 10}}}); err == nil {
		t.Error("expected an error for an unknown bet")
	}
	if _, err := e.HandleAction(raw, "u", models.Action{Type: "deal"}); err == nil {
		t.Error("expected an error without bets")
	}

	bets := []models.RouletteBet{{Type: "player", Amount: 100}, {Type: "player", Amount: 50}, {Type: "banker", Amount: 100}}
	raw, err = e.HandleAction(raw, "u", models.Action{Type: "deal", Bets: bets})
	if err != nil {
		t.Fatal(err)
	}
	if !e.IsRoundOver(raw) || e.PlayerChips(raw, "u") != 750 {
		t.Fatalf("after deal: over=%v chips=%d, want true 750", e.IsRoundOver(raw), e.PlayerChips(raw, "u"))
	}
	raw, changes, err := e.ResolveRound(raw)
	if err != nil {
		t.Fatal(err)
	}
	state := raw.(*BaccaratState)
	if state.Result != "player" || e.PlayerChips(raw, "u") != 1050 || changes[0].Amount != 50 || state.ChipChange != 50 {
		t.Errorf("got result %q chips %d change %+v, want player 1050 +50", state.Result, e.PlayerChips(raw, "u"), changes)
	}
	if _, err := e.HandleAction(raw, "u", models.Action{Type: "deal", Bets: bets}); err == nil {
		t.Error("expected an error dealing a finished round")
	}
}
