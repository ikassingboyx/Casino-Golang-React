package game

import (
	"encoding/json"
	"os"
	"regexp"
	"strconv"
	"strings"
	"testing"

	"casino/internal/models"
)

// The frontend board sends spot names; they must match the server's table.
func TestRouletteBetsMatchBoardSVG(t *testing.T) {
	data, err := os.ReadFile("../../../frontend/public/assets/roulette/roulette-board.svg")
	if err != nil {
		t.Skipf("board SVG not available: %v", err)
	}
	re := regexp.MustCompile(`data-bet="([^".]+)" data-numbers="([^"]*)"`)
	found := map[string]bool{}
	for _, m := range re.FindAllStringSubmatch(string(data), -1) {
		name := m[1]
		found[name] = true
		want, ok := rouletteBets[name]
		if !ok {
			t.Errorf("board spot %q is not a legal server bet", name)
			continue
		}
		var got []int
		for _, s := range strings.Split(m[2], ",") {
			n, _ := strconv.Atoi(s)
			got = append(got, n)
		}
		if !sameNumbers(got, want) {
			t.Errorf("%s: board covers %v, server covers %v", name, got, want)
		}
	}
	for name := range rouletteBets {
		if !found[name] {
			t.Errorf("server bet %q has no spot on the board", name)
		}
	}
	if len(rouletteBets) != 157 {
		t.Errorf("server has %d bets, want 157", len(rouletteBets))
	}
}

func sameNumbers(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	seen := map[int]int{}
	for _, n := range a {
		seen[n]++
	}
	for _, n := range b {
		seen[n]--
	}
	for _, c := range seen {
		if c != 0 {
			return false
		}
	}
	return true
}

func spinWith(t *testing.T, winning int, chips int64, bets ...models.RouletteBet) (*RouletteState, error) {
	t.Helper()
	orig := spinWheel
	spinWheel = func() (int, error) { return winning, nil }
	t.Cleanup(func() { spinWheel = orig })

	e := NewRouletteEngine()
	raw, _ := e.StartGame([]models.Player{{ID: "p1", Chips: chips}}, nil)
	out, err := e.HandleAction(raw, "p1", models.Action{Type: "spin", Bets: bets})
	if err != nil {
		return nil, err
	}
	return out.(*RouletteState), nil
}

func bet(t string, amount int64) models.RouletteBet {
	return models.RouletteBet{Type: t, Amount: amount}
}

func TestRoulettePayouts(t *testing.T) {
	cases := []struct {
		bet     string
		winning int
		wantWin int64 // returned for a 10-chip bet, stake included
	}{
		{"straight-17", 17, 360}, // 35:1
		{"straight-0", 0, 360},
		{"split-17-20", 20, 180},  // 17:1
		{"street-16-18", 16, 120}, // 11:1
		{"trio-0-1-2", 0, 120},
		{"corner-16-17-19-20", 19, 90}, // 8:1
		{"first-four", 3, 90},
		{"sixline-16-21", 21, 60}, // 5:1
		{"column-2", 17, 30},      // 2:1
		{"dozen-2", 17, 30},
		{"black", 17, 20}, // 1:1
		{"odd", 17, 20},
		{"low", 17, 20},
		{"red", 17, 0},
		{"high", 17, 0},
		{"straight-16", 17, 0},
	}
	for _, c := range cases {
		s, err := spinWith(t, c.winning, 1000, bet(c.bet, 10))
		if err != nil {
			t.Fatalf("%s: %v", c.bet, err)
		}
		if got := s.Players[0].Bets[0].Win; got != c.wantWin {
			t.Errorf("%s on %d: returned %d, want %d", c.bet, c.winning, got, c.wantWin)
		}
		if got := s.Players[0].Chips; got != 1000-10+c.wantWin {
			t.Errorf("%s on %d: chips %d, want %d", c.bet, c.winning, got, 1000-10+c.wantWin)
		}
	}
}

func TestRouletteZeroLosesOutsideBets(t *testing.T) {
	outside := []string{"red", "black", "odd", "even", "low", "high", "dozen-1", "column-1"}
	var bets []models.RouletteBet
	for _, b := range outside {
		bets = append(bets, bet(b, 10))
	}
	s, err := spinWith(t, 0, 1000, bets...)
	if err != nil {
		t.Fatal(err)
	}
	if s.Players[0].Chips != 1000-80 {
		t.Fatalf("chips = %d, want 920", s.Players[0].Chips)
	}
	_, changes, _ := NewRouletteEngine().ResolveRound(s)
	if changes[0].Amount != -80 {
		t.Fatalf("net = %d, want -80", changes[0].Amount)
	}
}

func TestRouletteMergesRepeatedSpots(t *testing.T) {
	s, err := spinWith(t, 5, 1000, bet("red", 25), bet("red", 25), bet("red", 25), bet("red", 25))
	if err != nil {
		t.Fatal(err)
	}
	if len(s.Players[0].Bets) != 1 || s.Players[0].Bets[0].Amount != 100 || s.Players[0].Chips != 1100 {
		t.Fatalf("bets %+v chips %d", s.Players[0].Bets, s.Players[0].Chips)
	}
}

func TestRouletteRejectsBadBets(t *testing.T) {
	cases := map[string][]models.RouletteBet{
		"no bets":        nil,
		"unknown spot":   {bet("split-1-5", 10)},
		"zero amount":    {bet("red", 0)},
		"negative":       {bet("red", -10)},
		"over balance":   {bet("red", 600), bet("black", 600)},
		"client numbers": {{Type: "nope", Numbers: []int{17}, Amount: 10}},
	}
	for name, bets := range cases {
		if _, err := spinWith(t, 17, 1000, bets...); err == nil {
			t.Errorf("%s: expected an error", name)
		}
	}
}

func TestRouletteIgnoresClientNumbers(t *testing.T) {
	// The client claims "red" covers 17; the server's table must win.
	s, err := spinWith(t, 17, 1000, models.RouletteBet{Type: "red", Numbers: []int{17}, Amount: 10})
	if err != nil {
		t.Fatal(err)
	}
	if s.Players[0].Bets[0].Win != 0 {
		t.Fatal("client-supplied numbers were trusted")
	}
}

func TestSpinWheelCoversAllPockets(t *testing.T) {
	seen := map[int]bool{}
	for i := 0; i < 5000 && len(seen) < 37; i++ {
		n, err := spinWheel()
		if err != nil || n < 0 || n > 36 {
			t.Fatalf("spin = %d, %v", n, err)
		}
		seen[n] = true
	}
	if len(seen) != 37 {
		t.Fatalf("only %d of 37 pockets came up", len(seen))
	}
}

func TestRouletteStateSurvivesSaveAndLoad(t *testing.T) {
	e := NewRouletteEngine()
	s, err := spinWith(t, 17, 1000, bet("black", 10))
	if err != nil {
		t.Fatal(err)
	}
	data, _ := json.Marshal(s)
	loaded, err := e.LoadState(data)
	if err != nil {
		t.Fatal(err)
	}
	if !e.IsRoundOver(loaded) || e.PlayerChips(loaded, "p1") != 1010 || *loaded.(*RouletteState).WinningNumber != 17 {
		t.Fatalf("reloaded state differs: %+v", loaded)
	}
}
