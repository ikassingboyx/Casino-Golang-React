package game

import (
	"casino/internal/models"
	"errors"
	"fmt"
	"math"
	"math/rand"
	"sort"
)

// No-limit Texas Hold'em. One state is one hand:
// pre_flop → flop → turn → river → showdown. The hand ends early when all but
// one player fold. Once it is over (Status "finished") ResolveRound pays the
// pot(s) out; the next hand is a new game, with the button moved one seat.
//
// Actions: fold, check, call, raise (Amount = the total to raise the street
// bet to, e.g. "raise to 300"), bet (alias of raise) and all_in.
//
// With a single human player (offline) four bots join the table. Bots can
// also be passed in as players (IsBot). The engine plays every bot's turn, so
// each returned state waits on a human.
type PokerEngine struct {
	// Bot decides for bot players. It receives the bot's own player view
	// (*models.PokerGameState). Without one, bots check or call.
	Bot PokerBot
}

// PokerBot is satisfied by bot.PokerBot; declared here so the game package
// does not depend on the bot package.
type PokerBot interface {
	DecideAction(state any, playerID string) models.Action
}

func NewPokerEngine() *PokerEngine { return &PokerEngine{} }

type PokerState struct {
	models.PokerGameState
	Deck  []models.Card `json:"deck"`
	Seats []pokerSeat   `json:"seats"` // per player, same order as Players
	// LastRaise is the size of the last full raise on this street; the next
	// raise must be at least this much bigger.
	LastRaise int64 `json:"lastRaise"`
	Resolved  bool  `json:"resolved"`
}

// pokerSeat is betting bookkeeping that players do not see.
type pokerSeat struct {
	Acted    bool `json:"acted"`    // has acted since the street bet last went up
	CanRaise bool `json:"canRaise"` // false after an incomplete all-in raise
}

const (
	defaultBigBlind  = 100
	offlineBots      = 4
	botStackInBlinds = 100
	maxBotActions    = 1000
)

var botNames = []string{"Ace", "Duke", "Lucky", "Vegas"}

// BotStack is the stack a bot sits down with at a table with this big blind.
func BotStack(bigBlind int64) int64 { return botStackInBlinds * bigBlind }

// DefaultBigBlind is the big blind unless a table sets its own.
const DefaultBigBlind = defaultBigBlind

// newPokerDeck is a variable so tests can stack the deck.
var newPokerDeck = NewDeck

func (e *PokerEngine) StartGame(players []models.Player, settings map[string]any) (any, error) {
	bb := settingInt(settings, "bigBlind", defaultBigBlind)
	if bb < 2 {
		return nil, errors.New("big blind must be at least 2")
	}
	// Offline a lone player gets four bots; online tables pass
	// fillBots=false and seat the bots the host added themselves.
	offline := len(players) == 1 && settings["fillBots"] != false
	if offline {
		if players[0].Chips < bb {
			return nil, fmt.Errorf("you need at least %d chips to sit down", bb)
		}
		for i := 0; i < offlineBots; i++ {
			players = append(players, models.Player{
				ID: fmt.Sprintf("bot-%d", i+1), Name: botNames[i%len(botNames)],
				Chips: botStackInBlinds * bb, IsBot: true, IsConnected: true,
			})
		}
	}
	if len(players) > 5 {
		return nil, errors.New("a poker table seats at most 5 players")
	}

	state := &PokerState{
		PokerGameState: models.PokerGameState{
			BaseGameState:  models.BaseGameState{GameType: "poker", Status: "playing"},
			BigBlind:       bb,
			SmallBlind:     bb / 2,
			SidePots:       []models.SidePot{},
			CommunityCards: []models.Card{},
			Log:            []models.PokerEvent{},
			Players:        make([]models.PokerPlayer, len(players)),
		},
		Seats: make([]pokerSeat, len(players)),
		Deck:  newPokerDeck(),
	}
	seated := 0
	for i, p := range players {
		status := "active"
		if p.Chips <= 0 {
			status = "out"
		} else {
			seated++
		}
		state.Players[i] = models.PokerPlayer{Player: p, Cards: []models.Card{}, StartChips: p.Chips, Status: status, Position: i}
		state.Seats[i] = pokerSeat{CanRaise: true}
	}
	if seated < 2 {
		return nil, errors.New("not enough players with chips to start a hand")
	}

	// The caller passes the previous hand's button + 1 to rotate it; a fresh
	// table gets a random button.
	dealer := settingInt(settings, "dealerIndex", -1)
	if dealer < 0 || int(dealer) >= len(players) {
		dealer = int64(rand.Intn(len(players)))
	}
	if state.Players[dealer].Status == "out" {
		dealer = int64(state.nextSeat(int(dealer), isSeated))
	}
	state.startHand(int(dealer))
	e.runBots(state)
	return state, nil
}

func isSeated(p *models.PokerPlayer) bool { return p.Status != "out" }
func canAct(p *models.PokerPlayer) bool   { return p.Status == "active" }
func inHand(p *models.PokerPlayer) bool   { return p.Status == "active" || p.Status == "all_in" }
func countPlayers(s *PokerState, f func(*models.PokerPlayer) bool) int {
	n := 0
	for i := range s.Players {
		if f(&s.Players[i]) {
			n++
		}
	}
	return n
}

// nextSeat returns the first seat after from (clockwise) that matches f, or -1.
func (s *PokerState) nextSeat(from int, f func(*models.PokerPlayer) bool) int {
	n := len(s.Players)
	for k := 1; k <= n; k++ {
		i := ((from+k)%n + n) % n
		if f(&s.Players[i]) {
			return i
		}
	}
	return -1
}

func (s *PokerState) startHand(dealer int) {
	s.DealerIndex = dealer
	if countPlayers(s, isSeated) == 2 {
		// Heads-up: the button posts the small blind and acts first pre-flop.
		s.SmallBlindIndex = dealer
	} else {
		s.SmallBlindIndex = s.nextSeat(dealer, isSeated)
	}
	s.BigBlindIndex = s.nextSeat(s.SmallBlindIndex, isSeated)

	seated := countPlayers(s, isSeated)
	for round := 0; round < 2; round++ {
		for k, i := 0, dealer; k < seated; k++ {
			i = s.nextSeat(i, isSeated)
			s.Players[i].Cards = append(s.Players[i].Cards, Draw(&s.Deck))
		}
	}

	s.Phase = "pre_flop"
	s.putIn(s.SmallBlindIndex, s.SmallBlind)
	s.logPlayer("small_blind", s.SmallBlindIndex)
	s.putIn(s.BigBlindIndex, s.BigBlind)
	s.logPlayer("big_blind", s.BigBlindIndex)
	s.CurrentBet = s.BigBlind
	s.LastRaise = s.BigBlind
	s.MinRaise = s.CurrentBet + s.LastRaise
	s.CurrentTurnIndex = s.BigBlindIndex
	s.progress()
}

// putIn moves up to amount chips from player i's stack into their bet.
func (s *PokerState) putIn(i int, amount int64) {
	p := &s.Players[i]
	if amount >= p.Chips {
		amount = p.Chips
		p.Status = "all_in"
	}
	p.Chips -= amount
	p.CurrentBet += amount
	p.TotalBetThisHand += amount
	s.Pot += amount
}

func (s *PokerState) logPlayer(action string, i int) {
	p := &s.Players[i]
	s.Log = append(s.Log, models.PokerEvent{Action: action, PlayerID: p.ID, Bet: p.CurrentBet, Chips: p.Chips, Pot: s.Pot})
}

func (e *PokerEngine) HandleAction(raw any, playerID string, action models.Action) (any, error) {
	state := raw.(*PokerState)
	if err := state.apply(playerID, action); err != nil {
		return nil, err
	}
	e.runBots(state)
	return state, nil
}

// apply validates and plays one action by the player whose turn it is.
func (s *PokerState) apply(playerID string, action models.Action) error {
	if s.Status == "finished" {
		return errors.New("this hand is over")
	}
	i := s.CurrentTurnIndex
	if i < 0 || s.Players[i].ID != playerID {
		return errors.New("it is not your turn")
	}
	p := &s.Players[i]
	toCall := s.CurrentBet - p.CurrentBet

	switch action.Type {
	case "fold":
		p.Status = "folded"
	case "check":
		if toCall > 0 {
			return fmt.Errorf("cannot check, %d to call", toCall)
		}
	case "call":
		if toCall <= 0 {
			return errors.New("nothing to call")
		}
		s.putIn(i, toCall)
	case "raise", "bet":
		if !s.Seats[i].CanRaise {
			return errors.New("raising is not allowed after an incomplete raise; call or fold")
		}
		stack := p.Chips + p.CurrentBet
		if stack <= s.CurrentBet {
			return errors.New("not enough chips to raise")
		}
		to := action.Amount
		if to >= stack {
			to = stack
		} else if to < s.MinRaise {
			return fmt.Errorf("minimum raise is to %d", s.MinRaise)
		}
		s.raiseTo(i, to)
	case "all_in":
		if p.Chips <= 0 {
			return errors.New("no chips left")
		}
		stack := p.Chips + p.CurrentBet
		if stack > s.CurrentBet && !s.Seats[i].CanRaise {
			return errors.New("raising is not allowed after an incomplete raise; call or fold")
		}
		if stack <= s.CurrentBet {
			s.putIn(i, p.Chips)
		} else {
			s.raiseTo(i, stack)
		}
	default:
		return fmt.Errorf("unknown action: %s", action.Type)
	}

	s.Seats[i].Acted = true
	s.Seats[i].CanRaise = false
	s.logPlayer(action.Type, i)
	s.LastAction = &models.LastAction{PlayerID: playerID, Action: action.Type, Amount: p.CurrentBet}
	if action.Type == "fold" || action.Type == "check" {
		s.LastAction.Amount = 0
	}
	s.progress()
	return nil
}

// raiseTo brings player i's street bet up to `to` (more than the current bet).
// A full raise reopens betting for everyone; a short all-in only makes the
// others call the difference.
func (s *PokerState) raiseTo(i int, to int64) {
	raise := to - s.CurrentBet
	s.putIn(i, to-s.Players[i].CurrentBet)
	full := raise >= s.LastRaise
	if full {
		s.LastRaise = raise
	}
	s.CurrentBet = to
	s.MinRaise = s.CurrentBet + s.LastRaise
	for j := range s.Seats {
		if j == i {
			continue
		}
		s.Seats[j].Acted = false
		if full {
			s.Seats[j].CanRaise = true
		}
	}
}

// needsToAct reports whether player i still has a decision on this street.
func (s *PokerState) needsToAct(i int) bool {
	p := &s.Players[i]
	if !canAct(p) {
		return false
	}
	if p.CurrentBet < s.CurrentBet {
		return true
	}
	// Alone against all-in players there is nobody left to bet against.
	if countPlayers(s, canAct) <= 1 {
		return false
	}
	return !s.Seats[i].Acted
}

// progress moves the turn on, dealing streets as betting rounds close, until
// someone has to act or the hand is over.
func (s *PokerState) progress() {
	for {
		if countPlayers(s, inHand) <= 1 {
			s.finish()
			return
		}
		if next := s.nextSeat(s.CurrentTurnIndex, func(p *models.PokerPlayer) bool {
			return s.needsToAct(p.Position)
		}); next >= 0 {
			s.CurrentTurnIndex = next
			return
		}
		s.closeStreet()
		if s.Phase == "river" {
			s.finish()
			return
		}
		s.dealStreet()
		s.CurrentTurnIndex = s.DealerIndex
	}
}

// closeStreet returns any uncalled part of the top bet and clears the street
// bets.
func (s *PokerState) closeStreet() {
	top, second := -1, int64(0)
	for i := range s.Players {
		if top < 0 || s.Players[i].CurrentBet > s.Players[top].CurrentBet {
			top = i
		}
	}
	for i := range s.Players {
		if i != top && s.Players[i].CurrentBet > second {
			second = s.Players[i].CurrentBet
		}
	}
	if p := &s.Players[top]; p.CurrentBet > second {
		refund := p.CurrentBet - second
		p.Chips += refund
		p.CurrentBet -= refund
		p.TotalBetThisHand -= refund
		s.Pot -= refund
		if p.Status == "all_in" && p.Chips > 0 {
			p.Status = "active"
		}
		s.logPlayer("return", top)
	}
	if s.Pot > 0 && s.Players[top].CurrentBet > 0 {
		s.Log = append(s.Log, models.PokerEvent{Action: "collect", Pot: s.Pot})
	}
	for i := range s.Players {
		s.Players[i].CurrentBet = 0
		s.Seats[i].Acted = false
		s.Seats[i].CanRaise = true
	}
	s.CurrentBet = 0
	s.LastRaise = s.BigBlind
	s.MinRaise = s.BigBlind
	s.SidePots = []models.SidePot{}
	if pots := s.pots(); len(pots) > 1 {
		s.SidePots = pots
	}
}

func (s *PokerState) dealStreet() {
	n := 1
	switch s.Phase {
	case "pre_flop":
		s.Phase, n = "flop", 3
	case "flop":
		s.Phase = "turn"
	case "turn":
		s.Phase = "river"
	}
	Draw(&s.Deck) // burn
	for k := 0; k < n; k++ {
		s.CommunityCards = append(s.CommunityCards, Draw(&s.Deck))
	}
	s.Log = append(s.Log, models.PokerEvent{Action: s.Phase, Pot: s.Pot})
}

// finish ends the hand. If more than one player is left, the rest of the
// board is dealt and the hand goes to showdown.
func (s *PokerState) finish() {
	s.closeStreet()
	if countPlayers(s, inHand) > 1 {
		for len(s.CommunityCards) < 5 {
			s.dealStreet()
		}
	}
	s.Phase = "showdown"
	s.Status = "finished"
	s.CurrentTurnIndex = -1
}

// pots splits the chips bet this hand into the main pot and side pots. Each
// pot lists the players still in the hand who can win it.
func (s *PokerState) pots() []models.SidePot {
	var levels []int64
	seen := map[int64]bool{}
	for _, p := range s.Players {
		if inHand(&p) && p.TotalBetThisHand > 0 && !seen[p.TotalBetThisHand] {
			seen[p.TotalBetThisHand] = true
			levels = append(levels, p.TotalBetThisHand)
		}
	}
	sort.Slice(levels, func(i, j int) bool { return levels[i] < levels[j] })

	var pots []models.SidePot
	var prev int64
	for li, level := range levels {
		top := level
		if li == len(levels)-1 {
			top = math.MaxInt64 // the last pot also takes folded chips above it
		}
		pot := models.SidePot{EligibleIDs: []string{}}
		for _, p := range s.Players {
			pot.Amount += min(p.TotalBetThisHand, top) - min(p.TotalBetThisHand, prev)
			if inHand(&p) && p.TotalBetThisHand >= level {
				pot.EligibleIDs = append(pot.EligibleIDs, p.ID)
			}
		}
		if pot.Amount > 0 {
			pots = append(pots, pot)
		}
		prev = level
	}
	return pots
}

func (e *PokerEngine) IsRoundOver(raw any) bool {
	return raw.(*PokerState).Status == "finished"
}

// ResolveRound pays out every pot to its best eligible hand(s). Split pots
// give odd chips to the first winner left of the button.
func (e *PokerEngine) ResolveRound(raw any) (any, []models.ChipChange, error) {
	s := raw.(*PokerState)
	if s.Status != "finished" {
		return nil, nil, errors.New("hand not over")
	}
	if !s.Resolved {
		s.resolve()
	}
	changes := make([]models.ChipChange, len(s.Players))
	for i, p := range s.Players {
		changes[i] = models.ChipChange{PlayerID: p.ID, Amount: p.Chips - p.StartChips}
	}
	return s, changes, nil
}

func (s *PokerState) resolve() {
	s.Resolved = true
	showdown := countPlayers(s, inHand) > 1
	hands := make([]EvaluatedHand, len(s.Players))
	if showdown {
		for i := range s.Players {
			if p := &s.Players[i]; inHand(p) {
				hands[i] = EvaluateHand(append(append([]models.Card{}, p.Cards...), s.CommunityCards...))
				p.HandRank = hands[i].Rank.String()
			}
		}
	}

	winners := map[string]bool{}
	for _, pot := range s.pots() {
		var best []int
		for k := 0; k < len(s.Players); k++ {
			i := (s.DealerIndex + 1 + k) % len(s.Players) // left of the button first
			if !contains(pot.EligibleIDs, s.Players[i].ID) {
				continue
			}
			if len(best) == 0 {
				best = []int{i}
				continue
			}
			switch CompareHands(hands[i], hands[best[0]]) {
			case 1:
				best = []int{i}
			case 0:
				best = append(best, i)
			}
		}
		share, odd := pot.Amount/int64(len(best)), pot.Amount%int64(len(best))
		for k, i := range best {
			won := share
			if int64(k) < odd {
				won++
			}
			s.Players[i].Chips += won
			s.Players[i].Won += won
			winners[s.Players[i].ID] = true
		}
	}
	s.Winners = nil
	for _, p := range s.Players {
		if winners[p.ID] {
			s.Winners = append(s.Winners, p.ID)
		}
	}
	s.Pot = 0
	s.SidePots = []models.SidePot{}
}

func contains(ids []string, id string) bool {
	for _, x := range ids {
		if x == id {
			return true
		}
	}
	return false
}

// runBots plays bot turns until a human has to act or the hand ends.
func (e *PokerEngine) runBots(s *PokerState) {
	for n := 0; n < maxBotActions && s.Status != "finished"; n++ {
		i := s.CurrentTurnIndex
		p := s.Players[i]
		if !p.IsBot {
			return
		}
		action := models.Action{Type: "call"}
		if e.Bot != nil {
			action = e.Bot.DecideAction(s.view(p.ID), p.ID)
		}
		if s.apply(p.ID, action) == nil {
			continue
		}
		// The bot's choice was not legal here: check if free, else fold.
		if s.apply(p.ID, models.Action{Type: "check"}) != nil {
			s.apply(p.ID, models.Action{Type: "fold"})
		}
	}
}

// Waiting: the turn of the player to act; the clock restarts after every action.
func (e *PokerEngine) Waiting(raw any) (Waiting, bool) {
	s := raw.(*PokerState)
	if s.Status == "finished" || s.CurrentTurnIndex < 0 {
		return Waiting{}, false
	}
	return Waiting{Key: fmt.Sprintf("turn:%d:%d", s.CurrentTurnIndex, len(s.Log))}, true
}

// Timeout checks for the player to act if that is free, otherwise folds them.
func (e *PokerEngine) Timeout(raw any) (any, error) {
	s := raw.(*PokerState)
	if _, ok := e.Waiting(s); !ok {
		return nil, errors.New("nothing to time out")
	}
	id := s.Players[s.CurrentTurnIndex].ID
	if s.apply(id, models.Action{Type: "check"}) != nil {
		if err := s.apply(id, models.Action{Type: "fold"}); err != nil {
			return nil, err
		}
	}
	e.runBots(s)
	return s, nil
}

// GetStateForPlayer hides the deck and the other players' hole cards; hands
// still in at showdown are revealed.
func (e *PokerEngine) GetStateForPlayer(raw any, playerID string) any {
	return raw.(*PokerState).view(playerID)
}

func (s *PokerState) view(playerID string) *models.PokerGameState {
	v := s.PokerGameState
	reveal := s.Status == "finished" && countPlayers(s, inHand) > 1
	v.Players = make([]models.PokerPlayer, len(s.Players))
	for i, p := range s.Players {
		if p.ID != playerID && !(reveal && inHand(&p)) {
			hidden := make([]models.Card, len(p.Cards))
			for j := range hidden {
				hidden[j] = models.Card{Hidden: true}
			}
			p.Cards = hidden
		}
		v.Players[i] = p
	}
	if me := playerIndex(s.Players, playerID); me >= 0 && s.Status != "finished" && len(s.Players[me].Cards) == 2 {
		cards := append(append([]models.Card{}, s.Players[me].Cards...), s.CommunityCards...)
		v.Players[me].HandRank = EvaluateHand(cards).Rank.String()
	}
	v.ValidActions = nil
	if t := s.CurrentTurnIndex; t >= 0 && s.Status != "finished" && s.Players[t].ID == playerID {
		v.ValidActions = s.validActions(t)
	}
	return &v
}

func (s *PokerState) validActions(i int) []string {
	p := &s.Players[i]
	toCall := s.CurrentBet - p.CurrentBet
	actions := []string{"fold"}
	if toCall <= 0 {
		actions = append(actions, "check")
	} else {
		actions = append(actions, "call")
	}
	raisable := s.Seats[i].CanRaise
	if raisable && p.Chips+p.CurrentBet > s.MinRaise {
		actions = append(actions, "raise")
	}
	if p.Chips > 0 && (raisable || p.Chips <= toCall) {
		actions = append(actions, "all_in")
	}
	return actions
}

func (e *PokerEngine) LoadState(data []byte) (any, error) { return loadState[PokerState](data) }

func (e *PokerEngine) PlayerChips(raw any, playerID string) int64 {
	return playerChips(raw.(*PokerState).Players, playerID)
}

// settingInt reads a whole-number setting, which arrives as float64 from JSON.
func settingInt(settings map[string]any, key string, def int64) int64 {
	switch v := settings[key].(type) {
	case float64:
		return int64(v)
	case int:
		return int64(v)
	case int64:
		return v
	}
	return def
}
