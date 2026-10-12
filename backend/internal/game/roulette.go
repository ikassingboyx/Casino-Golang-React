package game

import (
	"casino/internal/models"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"sort"
	"strconv"
	"strings"
)

// European single-zero roulette. Offline flow: "betting" → one "spin" action
// carrying every bet → "resolved".
type RouletteEngine struct{}

func NewRouletteEngine() *RouletteEngine { return &RouletteEngine{} }

type RouletteState struct {
	models.RouletteGameState
}

// maxRouletteBets caps how many spots one spin may cover (the board has 157).
const maxRouletteBets = 200

var redNumbers = map[int]bool{1: true, 3: true, 5: true, 7: true, 9: true, 12: true, 14: true, 16: true, 18: true,
	19: true, 21: true, 23: true, 25: true, 27: true, 30: true, 32: true, 34: true, 36: true}

// rouletteBets maps every legal board spot to the numbers it covers.
var rouletteBets = buildRouletteBets()

func buildRouletteBets() map[string][]int {
	bets := map[string][]int{}
	add := func(nums ...int) string {
		parts := make([]string, len(nums))
		for i, n := range nums {
			parts[i] = strconv.Itoa(n)
		}
		return strings.Join(parts, "-")
	}
	set := func(name string, nums ...int) { bets[name] = nums }

	for n := 0; n <= 36; n++ {
		set("straight-"+strconv.Itoa(n), n)
	}
	// The board has 12 columns of 3: column c holds 3c+1 (bottom) to 3c+3 (top).
	for c := 0; c < 12; c++ {
		lo := 3*c + 1
		set("split-"+add(lo, lo+1), lo, lo+1)
		set("split-"+add(lo+1, lo+2), lo+1, lo+2)
		set("street-"+add(lo, lo+2), lo, lo+1, lo+2)
		if c < 11 {
			for r := 0; r < 3; r++ {
				set("split-"+add(lo+r, lo+r+3), lo+r, lo+r+3)
			}
			set("corner-"+add(lo, lo+1, lo+3, lo+4), lo, lo+1, lo+3, lo+4)
			set("corner-"+add(lo+1, lo+2, lo+4, lo+5), lo+1, lo+2, lo+4, lo+5)
			set("sixline-"+add(lo, lo+5), lo, lo+1, lo+2, lo+3, lo+4, lo+5)
		}
	}
	for n := 1; n <= 3; n++ {
		set("split-"+add(0, n), 0, n)
	}
	set("trio-0-1-2", 0, 1, 2)
	set("trio-0-2-3", 0, 2, 3)
	set("first-four", 0, 1, 2, 3)

	for n := 1; n <= 36; n++ {
		col := "column-" + strconv.Itoa((n-1)%3+1)
		dozen := "dozen-" + strconv.Itoa((n-1)/12+1)
		bets[col] = append(bets[col], n)
		bets[dozen] = append(bets[dozen], n)
		pick := func(cond bool, yes, no string) string {
			if cond {
				return yes
			}
			return no
		}
		bets[pick(n <= 18, "low", "high")] = append(bets[pick(n <= 18, "low", "high")], n)
		bets[pick(n%2 == 0, "even", "odd")] = append(bets[pick(n%2 == 0, "even", "odd")], n)
		bets[pick(redNumbers[n], "red", "black")] = append(bets[pick(redNumbers[n], "red", "black")], n)
	}
	return bets
}

// RouletteBetNumbers returns the numbers a board spot covers.
func RouletteBetNumbers(betType string) ([]int, bool) {
	nums, ok := rouletteBets[betType]
	return nums, ok
}

// rouletteMultiplier is what a winning bet returns per chip staked (stake
// included): 36 / numbers covered, e.g. straight 36 (35:1), red 2 (1:1).
func rouletteMultiplier(covered int) int64 { return int64(36 / covered) }

func (e *RouletteEngine) StartGame(players []models.Player, settings map[string]any) (any, error) {
	if len(players) == 0 {
		return nil, errors.New("not enough players to start game")
	}
	rp := make([]models.RoulettePlayer, len(players))
	for i, p := range players {
		rp[i] = models.RoulettePlayer{Player: p, Bets: []models.RouletteBet{}}
	}
	return &RouletteState{models.RouletteGameState{
		BaseGameState: models.BaseGameState{GameType: "roulette", Phase: "betting", IsOffline: true},
		Players:       rp,
	}}, nil
}

func (e *RouletteEngine) HandleAction(raw any, playerID string, action models.Action) (any, error) {
	state := raw.(*RouletteState)
	if state.Phase != "betting" {
		return nil, fmt.Errorf("no action allowed in phase: %s", state.Phase)
	}
	if action.Type != "spin" {
		return nil, fmt.Errorf("unknown action: %s", action.Type)
	}
	pi := findRoulettePlayer(state, playerID)
	if pi < 0 {
		return nil, errors.New("player not found")
	}
	bets, total, err := normalizeBets(action.Bets)
	if err != nil {
		return nil, err
	}
	p := &state.Players[pi]
	if total > p.Chips {
		return nil, errors.New("not enough chips for these bets")
	}

	winning, err := spinWheel()
	if err != nil {
		return nil, err
	}
	p.Chips -= total
	var returned int64
	for i := range bets {
		if covers(bets[i].Numbers, winning) {
			bets[i].Win = bets[i].Amount * rouletteMultiplier(len(bets[i].Numbers))
			returned += bets[i].Win
		}
	}
	p.Chips += returned
	p.Bets = bets

	state.WinningNumber = &winning
	state.LastResult = &winning
	state.Payouts = []models.RoulettePayout{{PlayerID: playerID, Amount: returned}}
	state.Phase = "resolved"
	return state, nil
}

// normalizeBets validates bet spots and amounts, merges repeated spots and
// fills in each spot's numbers from the server's table.
func normalizeBets(in []models.RouletteBet) ([]models.RouletteBet, int64, error) {
	if len(in) == 0 {
		return nil, 0, errors.New("place at least one bet")
	}
	amounts := map[string]int64{}
	var total int64
	for _, b := range in {
		if _, ok := rouletteBets[b.Type]; !ok {
			return nil, 0, fmt.Errorf("unknown bet: %q", b.Type)
		}
		if b.Amount <= 0 {
			return nil, 0, errors.New("bet amounts must be positive")
		}
		amounts[b.Type] += b.Amount
		total += b.Amount
		if total < 0 {
			return nil, 0, errors.New("bet total too large")
		}
	}
	if len(amounts) > maxRouletteBets {
		return nil, 0, errors.New("too many bets")
	}
	bets := make([]models.RouletteBet, 0, len(amounts))
	for t, a := range amounts {
		bets = append(bets, models.RouletteBet{Type: t, Numbers: rouletteBets[t], Amount: a})
	}
	sort.Slice(bets, func(i, j int) bool { return bets[i].Type < bets[j].Type })
	return bets, total, nil
}

// spinWheel picks the winning pocket with a cryptographically secure RNG.
// It is a variable so tests can fix the result.
var spinWheel = func() (int, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(37))
	if err != nil {
		return 0, err
	}
	return int(n.Int64()), nil
}

func covers(nums []int, n int) bool {
	for _, x := range nums {
		if x == n {
			return true
		}
	}
	return false
}

func findRoulettePlayer(state *RouletteState, id string) int {
	for i, p := range state.Players {
		if p.ID == id {
			return i
		}
	}
	return -1
}

func (e *RouletteEngine) GetStateForPlayer(raw any, playerID string) any {
	// Nothing is hidden: the number is only drawn when the wheel spins.
	return &raw.(*RouletteState).RouletteGameState
}

func (e *RouletteEngine) IsRoundOver(raw any) bool {
	return raw.(*RouletteState).Phase == "resolved"
}

func (e *RouletteEngine) ResolveRound(raw any) (any, []models.ChipChange, error) {
	state := raw.(*RouletteState)
	if state.Phase != "resolved" {
		return nil, nil, errors.New("round not over")
	}
	var changes []models.ChipChange
	for _, p := range state.Players {
		var staked, returned int64
		for _, b := range p.Bets {
			staked += b.Amount
			returned += b.Win
		}
		changes = append(changes, models.ChipChange{PlayerID: p.ID, Amount: returned - staked})
	}
	return state, changes, nil
}

func (e *RouletteEngine) LoadState(data []byte) (any, error) {
	var state RouletteState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, err
	}
	return &state, nil
}

func (e *RouletteEngine) PlayerChips(raw any, playerID string) int64 {
	state := raw.(*RouletteState)
	if i := findRoulettePlayer(state, playerID); i >= 0 {
		return state.Players[i].Chips
	}
	return 0
}
