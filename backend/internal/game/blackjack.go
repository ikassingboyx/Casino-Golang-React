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
	Deck []models.Card
}

func (e *BlackjackEngine) StartGame(players []models.Player, settings map[string]any) (any, error) {
	if len(players) == 0 {
		return nil, errors.New("Not enought players to start game")
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

func handleBet(state *BlackjackState, playerID string, action models.Action) (*BlackjackState, error) {
	if action.Type != "bet" {
		return nil, errors.New("expected a bet action")
	}
	pi := findPlayer(state, playerID)
	if pi < 0 {
		return nil, errors.New("player not found")
	}
	p := &state.Players[pi]
	if action.Amount <= 0 || action.Amount > p.Chips {
		return nil, errors.New("invalid bet amount")
	}

	p.Chips -= action.Amount
	p.Hands = []models.BlackjackHand{{Bet: action.Amount, Status: "playing"}}

	p.Hands[0].Cards = append(p.Hands[0].Cards, Draw(&state.Deck))
	state.DealerHand.Cards = append(state.DealerHand.Cards, Draw(&state.Deck))
	p.Hands[0].Cards = append(p.Hands[0].Cards, Draw(&state.Deck))
	hole := Draw(&state.Deck)
	hole.Hidden = true
	state.DealerHand.Cards = append(state.DealerHand.Cards, hole)

	playerBJ := isBlackjack(p.Hands[0].Cards)
	if playerBJ {
		p.Hands[0].Status = "blackjack"
	}
	// Dealer peeks for blackjack; a natural on either side ends the round.
	if playerBJ || isBlackjack(state.DealerHand.Cards) {
		if !playerBJ {
			p.Hands[0].Status = "stand"
		}
		runDealer(state)
		state.Phase = "resolved"
		return state, nil
	}

	state.Phase = "player_turns"
	return state, nil
}

func handlePlayerAction(state *BlackjackState, playerID string, action models.Action) (*BlackjackState, error) {
	pi := findPlayer(state, playerID)
	if pi < 0 {
		return nil, errors.New("player not found")
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
		runDealer(state)
		state.Phase = "resolved"
	case "stand":
		hand.Status = "stand"
		runDealer(state)
		state.Phase = "resolved"
	case "double":
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
		runDealer(state)
		state.Phase = "resolved"
	default:
		return nil, fmt.Errorf("unknown action: %s", action.Type)
	}
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

func (e *BlackjackEngine) GetStateForPlayer(raw any, playerID string) any {
	state := raw.(*BlackjackState)
	if state.Phase != "player_turns" {
		return state
	}
	cp := *state
	dealerCards := make([]models.Card, len(state.DealerHand.Cards))
	for i, c := range state.DealerHand.Cards {
		if c.Hidden {
			dealerCards[i] = models.Card{Hidden: true}
		} else {
			dealerCards[i] = c
		}
	}
	cp.DealerHand = models.DealerHand{Cards: dealerCards}
	return &cp
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

func findPlayer(state *BlackjackState, id string) int {
	for i, p := range state.Players {
		if p.ID == id {
			return i
		}
	}
	return -1
}

// HandValue returns the best blackjack total of the visible cards.
func HandValue(cards []models.Card) int { return handValue(cards) }

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
