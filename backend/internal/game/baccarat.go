package game

import (
	"casino/internal/models"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
)

// Punto banco baccarat against the house. Offline flow: "betting" → one
// "deal" action carrying every stake → "resolved". The whole coup, third
// cards included, is drawn by the server; the player makes no decisions.
type BaccaratEngine struct{}

func NewBaccaratEngine() *BaccaratEngine { return &BaccaratEngine{} }

type BaccaratState struct {
	models.BaccaratGameState
}

const baccaratDecks = 8

// newBaccaratShoe returns the cards a coup is dealt from. It is a variable so
// tests can stack the shoe.
var newBaccaratShoe = func() []models.Card { return NewShoe(baccaratDecks) }

func (e *BaccaratEngine) StartGame(players []models.Player, settings map[string]any) (any, error) {
	if len(players) == 0 {
		return nil, errors.New("not enough players to start game")
	}
	bp := make([]models.BaccaratPlayer, len(players))
	for i, p := range players {
		bp[i] = models.BaccaratPlayer{Player: p}
	}
	return &BaccaratState{models.BaccaratGameState{
		BaseGameState: models.BaseGameState{GameType: "baccarat", Phase: "betting", IsOffline: true},
		PlayerHand:    models.BaccaratHand{Cards: []models.Card{}},
		BankerHand:    models.BaccaratHand{Cards: []models.Card{}},
		Players:       bp,
	}}, nil
}

func (e *BaccaratEngine) HandleAction(raw any, playerID string, action models.Action) (any, error) {
	state := raw.(*BaccaratState)
	if state.Phase != "betting" {
		return nil, fmt.Errorf("no action allowed in phase: %s", state.Phase)
	}
	if action.Type != "deal" {
		return nil, fmt.Errorf("unknown action: %s", action.Type)
	}
	pi := findBaccaratPlayer(state, playerID)
	if pi < 0 {
		return nil, errors.New("player not found")
	}
	bets, total, err := baccaratBets(action.Bets)
	if err != nil {
		return nil, err
	}
	p := &state.Players[pi]
	if total > p.Chips {
		return nil, errors.New("not enough chips for these bets")
	}

	p.Chips -= total
	p.Bets = bets
	shoe := newBaccaratShoe()
	state.PlayerHand, state.BankerHand = dealCoup(&shoe)
	state.Phase = "resolved"
	return state, nil
}

// baccaratBets validates the stakes and adds them up per spot.
func baccaratBets(in []models.RouletteBet) (models.BaccaratBets, int64, error) {
	var bets models.BaccaratBets
	var total int64
	for _, b := range in {
		if b.Amount <= 0 {
			return bets, 0, errors.New("bet amounts must be positive")
		}
		switch b.Type {
		case "player":
			bets.Player += b.Amount
		case "banker":
			bets.Banker += b.Amount
		case "tie":
			bets.Tie += b.Amount
		default:
			return bets, 0, fmt.Errorf("unknown bet: %q", b.Type)
		}
		total += b.Amount
		if total < 0 {
			return bets, 0, errors.New("bet total too large")
		}
	}
	if total == 0 {
		return bets, 0, errors.New("place at least one bet")
	}
	return bets, total, nil
}

// dealCoup deals both hands: two cards each, alternating and player first,
// then the player's and the banker's third card when the tableau calls for one.
func dealCoup(shoe *[]models.Card) (player, banker models.BaccaratHand) {
	p := []models.Card{Draw(shoe)}
	b := []models.Card{Draw(shoe)}
	p = append(p, Draw(shoe))
	b = append(b, Draw(shoe))

	// A natural (8 or 9) on either side ends the coup.
	if pt, bt := baccaratTotal(p), baccaratTotal(b); pt < 8 && bt < 8 {
		playerThird := -1
		if pt <= 5 {
			c := Draw(shoe)
			p = append(p, c)
			playerThird = baccaratPoints(c)
		}
		if bankerDraws(bt, playerThird) {
			b = append(b, Draw(shoe))
		}
	}
	return models.BaccaratHand{Cards: p, Total: baccaratTotal(p)}, models.BaccaratHand{Cards: b, Total: baccaratTotal(b)}
}

// bankerDraws is the banker's third-card tableau. playerThird is the point
// value of the player's third card, or -1 if the player stood.
func bankerDraws(total, playerThird int) bool {
	if playerThird < 0 {
		return total <= 5
	}
	switch total {
	case 0, 1, 2:
		return true
	case 3:
		return playerThird != 8
	case 4:
		return playerThird >= 2 && playerThird <= 7
	case 5:
		return playerThird >= 4 && playerThird <= 7
	case 6:
		return playerThird == 6 || playerThird == 7
	}
	return false
}

// baccaratPoints: aces count 1, tens and faces 0, the rest their number.
func baccaratPoints(c models.Card) int {
	switch c.Rank {
	case "A":
		return 1
	case "10", "J", "Q", "K":
		return 0
	}
	n, _ := strconv.Atoi(c.Rank)
	return n
}

// baccaratTotal is the hand's points modulo 10.
func baccaratTotal(cards []models.Card) int {
	total := 0
	for _, c := range cards {
		total += baccaratPoints(c)
	}
	return total % 10
}

// baccaratPayouts returns the chips given back on each spot (stake included):
// player 1:1, banker 1:1 less 5% commission (rounded down), tie 8:1. On a tie
// the player and banker stakes are returned.
func baccaratPayouts(bets models.BaccaratBets, result string) models.BaccaratBets {
	var pay models.BaccaratBets
	switch result {
	case "player":
		pay.Player = bets.Player * 2
	case "banker":
		pay.Banker = bets.Banker + bets.Banker*95/100
	case "tie":
		pay.Player = bets.Player
		pay.Banker = bets.Banker
		pay.Tie = bets.Tie * 9
	}
	return pay
}

func findBaccaratPlayer(state *BaccaratState, id string) int {
	for i, p := range state.Players {
		if p.ID == id {
			return i
		}
	}
	return -1
}

func (e *BaccaratEngine) GetStateForPlayer(raw any, playerID string) any {
	// All cards are face up and no shoe is kept, so nothing is hidden.
	return &raw.(*BaccaratState).BaccaratGameState
}

func (e *BaccaratEngine) IsRoundOver(raw any) bool {
	return raw.(*BaccaratState).Phase == "resolved"
}

func (e *BaccaratEngine) ResolveRound(raw any) (any, []models.ChipChange, error) {
	state := raw.(*BaccaratState)
	if state.Phase != "resolved" {
		return nil, nil, errors.New("round not over")
	}
	switch pt, bt := state.PlayerHand.Total, state.BankerHand.Total; {
	case pt > bt:
		state.Result = "player"
	case bt > pt:
		state.Result = "banker"
	default:
		state.Result = "tie"
	}

	var changes []models.ChipChange
	for i := range state.Players {
		p := &state.Players[i]
		p.Payouts = baccaratPayouts(p.Bets, state.Result)
		returned := p.Payouts.Player + p.Payouts.Banker + p.Payouts.Tie
		staked := p.Bets.Player + p.Bets.Banker + p.Bets.Tie
		p.Chips += returned
		// Baccarat is single-player, so the state's chipChange is that player's.
		state.ChipChange = returned - staked
		changes = append(changes, models.ChipChange{PlayerID: p.ID, Amount: returned - staked})
	}
	return state, changes, nil
}

func (e *BaccaratEngine) LoadState(data []byte) (any, error) {
	var state BaccaratState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, err
	}
	return &state, nil
}

func (e *BaccaratEngine) PlayerChips(raw any, playerID string) int64 {
	state := raw.(*BaccaratState)
	if i := findBaccaratPlayer(state, playerID); i >= 0 {
		return state.Players[i].Chips
	}
	return 0
}
