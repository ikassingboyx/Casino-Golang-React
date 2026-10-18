package game

import (
	"casino/internal/models"
	"errors"
	"fmt"
)

type BlackjackEngine struct{}

func NewBlackjackEngine() *BlackjackEngine { return &BlackjackEngine{} }

type BlackjackState struct {
	models.BlackjackGameState
	Deck []models.Card `json:"deck"`
}

func (e *BlackjackEngine) StartGame(players []models.Player, settings map[string]any) (any, error) {
	if len(players) == 0 {
		return nil, errors.New("not enough players to start game")
	}

	bjPlayers := make([]models.BlackjackPlayer, len(players))
	for i, p := range players {
		bjPlayers[i] = models.BlackjackPlayer{Player: p}
	}

	state := &BlackjackState{
		BlackjackGameState: models.BlackjackGameState{
			BaseGameState: models.BaseGameState{Phase: "betting"},
			Players:       bjPlayers,
		},
		Deck: NewDeck(),
	}
	return state, nil
}

func (e *BlackjackEngine) HandleAction(raw any, playerID string, action models.Action) (any, error) {
	state := raw.(*BlackjackState)
	switch state.Phase {
	case "betting":
		return handleBet(state, playerID, action)
	case "player_turns":
		return handlePlayerAction(state, playerID, action)
	}
	return state, fmt.Errorf("no action allowed in phase: %s", state.Phase)
}

// handleBet takes a player's bet. The cards are dealt once everyone at the
// table has bet (straight away with a single player); online, Timeout deals
// to whoever has bet when the betting clock runs out.
func handleBet(state *BlackjackState, playerID string, action models.Action) (*BlackjackState, error) {
	if action.Type != "bet" {
		return nil, errors.New("expected a bet action")
	}
	pi := playerIndex(state.Players, playerID)
	if pi < 0 {
		return nil, errors.New("player not found")
	}
	p := &state.Players[pi]
	if len(p.Hands) > 0 {
		return nil, errors.New("you have already bet this round")
	}
	if action.Amount <= 0 || action.Amount > p.Chips {
		return nil, errors.New("invalid bet amount")
	}

	p.Chips -= action.Amount
	p.Hands = []models.BlackjackHand{{Cards: []models.Card{}, Bet: action.Amount, Status: "playing"}}

	for _, other := range state.Players {
		if len(other.Hands) == 0 {
			return state, nil
		}
	}
	deal(state)
	return state, nil
}

// deal gives two cards to every player who bet and to the dealer, in table
// order, then hands the turn to the first player with a decision to make.
func deal(state *BlackjackState) {
	betting := []int{}
	for i := range state.Players {
		if len(state.Players[i].Hands) > 0 {
			betting = append(betting, i)
		}
	}
	for round := 0; round < 2; round++ {
		for _, i := range betting {
			h := &state.Players[i].Hands[0]
			h.Cards = append(h.Cards, Draw(&state.Deck))
		}
		card := Draw(&state.Deck)
		card.Hidden = round == 1 // the hole card
		state.DealerHand.Cards = append(state.DealerHand.Cards, card)
	}

	for _, i := range betting {
		if h := &state.Players[i].Hands[0]; isBlackjack(h.Cards) {
			h.Status = "blackjack"
		}
	}
	// Dealer peeks for blackjack; a dealer natural ends the round at once.
	if isBlackjack(state.DealerHand.Cards) {
		for _, i := range betting {
			if h := &state.Players[i].Hands[0]; h.Status == "playing" {
				h.Status = "stand"
			}
		}
	}
	state.CurrentPlayerIndex = -1
	state.Phase = "player_turns"
	nextTurn(state)
}

// nextTurn moves the turn to the next player whose hand is still playing.
// When nobody is left the dealer plays and the round is over.
func nextTurn(state *BlackjackState) {
	for i := state.CurrentPlayerIndex + 1; i < len(state.Players); i++ {
		if hands := state.Players[i].Hands; len(hands) > 0 && hands[0].Status == "playing" {
			state.CurrentPlayerIndex = i
			return
		}
	}
	runDealer(state)
	state.Phase = "resolved"
}

func handlePlayerAction(state *BlackjackState, playerID string, action models.Action) (*BlackjackState, error) {
	pi := playerIndex(state.Players, playerID)
	if pi < 0 {
		return nil, errors.New("player not found")
	}
	if pi != state.CurrentPlayerIndex {
		return nil, errors.New("it is not your turn")
	}
	p := &state.Players[pi]
	hand := &p.Hands[0]

	switch action.Type {
	case "hit":
		hand.Cards = append(hand.Cards, Draw(&state.Deck))
		switch v := handValue(hand.Cards); {
		case v > 21:
			hand.Status = "bust"
		case v == 21:
			hand.Status = "stand"
		default:
			return state, nil
		}
	case "stand":
		hand.Status = "stand"
	case "double":
		if len(hand.Cards) != 2 {
			return nil, errors.New("you can only double on your first two cards")
		}
		if p.Chips < hand.Bet {
			return nil, errors.New("not enough chips to double")
		}
		p.Chips -= hand.Bet
		hand.Bet *= 2
		hand.Cards = append(hand.Cards, Draw(&state.Deck))
		if handValue(hand.Cards) > 21 {
			hand.Status = "bust"
		} else {
			hand.Status = "stand"
		}
	default:
		return nil, fmt.Errorf("unknown action: %s", action.Type)
	}
	nextTurn(state)
	return state, nil
}

// Waiting: the rest of the bets once someone has bet, then each player's turn.
func (e *BlackjackEngine) Waiting(raw any) (Waiting, bool) {
	state := raw.(*BlackjackState)
	switch state.Phase {
	case "betting":
		for _, p := range state.Players {
			if len(p.Hands) > 0 {
				return Waiting{Key: "bets", Betting: true}, true
			}
		}
	case "player_turns":
		hand := state.Players[state.CurrentPlayerIndex].Hands[0]
		return Waiting{Key: fmt.Sprintf("turn:%d:%d", state.CurrentPlayerIndex, len(hand.Cards))}, true
	}
	return Waiting{}, false
}

// Timeout deals to the players who have bet, or stands the player to act.
func (e *BlackjackEngine) Timeout(raw any) (any, error) {
	state := raw.(*BlackjackState)
	if _, ok := e.Waiting(state); !ok {
		return nil, errors.New("nothing to time out")
	}
	if state.Phase == "betting" {
		deal(state)
		return state, nil
	}
	state.Players[state.CurrentPlayerIndex].Hands[0].Status = "stand"
	nextTurn(state)
	return state, nil
}

// dealerMinSafeRatio: the dealer keeps drawing while more than this share of
// the remaining deck would leave its hand at 21 or less.
const dealerMinSafeRatio = 0.35

// runDealer reveals the hole card and plays the dealer's hand. The dealer
// looks at the remaining deck and draws while the chance of not busting on
// the next card is above dealerMinSafeRatio. The dealer only draws if some
// player hand is still standing (not bust or blackjack).
func runDealer(state *BlackjackState) {
	for i := range state.DealerHand.Cards {
		state.DealerHand.Cards[i].Hidden = false
	}
	if !anyHandStanding(state) || isBlackjack(state.DealerHand.Cards) {
		return
	}
	for safeDrawRatio(state.DealerHand.Cards, state.Deck) > dealerMinSafeRatio {
		state.DealerHand.Cards = append(state.DealerHand.Cards, Draw(&state.Deck))
	}
}

// safeDrawRatio returns the share of cards in deck that would keep hand at
// 21 or less if drawn next.
func safeDrawRatio(hand, deck []models.Card) float64 {
	if len(deck) == 0 {
		return 0
	}
	safe := 0
	next := append(append([]models.Card{}, hand...), models.Card{})
	for _, c := range deck {
		next[len(next)-1] = c
		if handValue(next) <= 21 {
			safe++
		}
	}
	return float64(safe) / float64(len(deck))
}

func anyHandStanding(state *BlackjackState) bool {
	for _, p := range state.Players {
		for _, h := range p.Hands {
			if h.Status == "stand" {
				return true
			}
		}
	}
	return false
}

// GetStateForPlayer returns what a player may see: no deck, the dealer's hole
// card masked while players are still acting, and hand totals filled in.
func (e *BlackjackEngine) GetStateForPlayer(raw any, playerID string) any {
	state := raw.(*BlackjackState)
	view := state.BlackjackGameState

	view.DealerHand.Cards = make([]models.Card, len(state.DealerHand.Cards))
	for i, c := range state.DealerHand.Cards {
		if c.Hidden {
			c = models.Card{Hidden: true}
		}
		view.DealerHand.Cards[i] = c
	}
	view.DealerHand.Value = handValue(view.DealerHand.Cards)

	view.Players = make([]models.BlackjackPlayer, len(state.Players))
	for i, p := range state.Players {
		hands := make([]models.BlackjackHand, len(p.Hands))
		for j, h := range p.Hands {
			h.Value = handValue(h.Cards)
			hands[j] = h
		}
		p.Hands = hands
		view.Players[i] = p
	}
	return &view
}

func (e *BlackjackEngine) LoadState(data []byte) (any, error) { return loadState[BlackjackState](data) }

func (e *BlackjackEngine) PlayerChips(raw any, playerID string) int64 {
	return playerChips(raw.(*BlackjackState).Players, playerID)
}

func (e *BlackjackEngine) IsRoundOver(raw any) bool {
	return raw.(*BlackjackState).Phase == "resolved"
}

func (e *BlackjackEngine) ResolveRound(raw any) (any, []models.ChipChange, error) {
	state := raw.(*BlackjackState)
	if state.Phase != "resolved" {
		return nil, nil, errors.New("round not over")
	}

	dealerTotal := handValue(state.DealerHand.Cards)
	dealerBust := dealerTotal > 21
	dealerBJ := isBlackjack(state.DealerHand.Cards)
	var changes []models.ChipChange

	for i := range state.Players {
		p := &state.Players[i]
		if len(p.Hands) == 0 {
			continue // sat this round out
		}
		hand := &p.Hands[0]
		var payout int64

		switch hand.Status {
		case "blackjack":
			if dealerBJ {
				payout = hand.Bet
			} else {
				payout = hand.Bet + hand.Bet*3/2
			}
		case "bust":
			payout = 0
		case "stand":
			pt := handValue(hand.Cards)
			if dealerBJ {
				payout = 0
			} else if dealerBust || pt > dealerTotal {
				payout = hand.Bet * 2
			} else if pt == dealerTotal {
				payout = hand.Bet
			}
		}

		p.Chips += payout
		changes = append(changes, models.ChipChange{PlayerID: p.ID, Amount: payout - hand.Bet})
	}
	return state, changes, nil
}

func isBlackjack(cards []models.Card) bool {
	if len(cards) != 2 {
		return false
	}
	revealed := []models.Card{cards[0], cards[1]}
	revealed[0].Hidden, revealed[1].Hidden = false, false
	return handValue(revealed) == 21
}

func handValue(cards []models.Card) int {
	total, aces := 0, 0
	for _, c := range cards {
		if c.Hidden {
			continue
		}
		switch c.Rank {
		case "A":
			aces++
			total += 11
		case "K", "Q", "J":
			total += 10
		default:
			v := 0
			fmt.Sscanf(c.Rank, "%d", &v)
			total += v
		}
	}
	for aces > 0 && total > 21 {
		total -= 10
		aces--
	}
	return total
}
