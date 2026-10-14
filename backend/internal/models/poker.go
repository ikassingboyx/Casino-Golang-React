package models

type PokerPlayer struct {
	Player
	Cards            []Card `json:"cards"`
	CurrentBet       int64  `json:"currentBet"`       // put in on the current street
	TotalBetThisHand int64  `json:"totalBetThisHand"` // put in over the whole hand
	StartChips       int64  `json:"startChips"`       // chips at the start of the hand
	Status           string `json:"status"`           // active, folded, all_in, out
	Position         int    `json:"position"`
	HandRank         string `json:"handRank,omitempty"` // best hand: your own while playing, everyone's at showdown
	Won              int64  `json:"won,omitempty"`      // chips won from the pot(s)
}

// PokerEvent is one step of a hand, in order, so a client can replay what
// happened between two states (e.g. the bots' turns after yours).
type PokerEvent struct {
	// Player events: small_blind, big_blind, fold, check, call, raise, bet,
	// all_in, and return (an uncalled bet handed back). Table events: collect
	// (street bets swept into the pot), flop, turn, river.
	Action   string `json:"action"`
	PlayerID string `json:"playerId,omitempty"`
	Bet      int64  `json:"bet"`   // the player's bet on this street afterwards
	Chips    int64  `json:"chips"` // the player's stack afterwards
	Pot      int64  `json:"pot"`   // all chips bet this hand afterwards
}

type SidePot struct {
	Amount      int64    `json:"amount"`
	EligibleIDs []string `json:"eligibleIds"`
}

type PokerGameState struct {
	BaseGameState
	DealerIndex      int           `json:"dealerIndex"`
	SmallBlindIndex  int           `json:"smallBlindIndex"`
	BigBlindIndex    int           `json:"bigBlindIndex"`
	CurrentTurnIndex int           `json:"currentTurnIndex"` // -1 once the hand is over
	BigBlind         int64         `json:"bigBlind"`
	SmallBlind       int64         `json:"smallBlind"`
	Pot              int64         `json:"pot"`      // every chip bet this hand, current street included
	SidePots         []SidePot     `json:"sidePots"` // main pot first; empty while there is a single pot
	CommunityCards   []Card        `json:"communityCards"`
	CurrentBet       int64         `json:"currentBet"` // highest bet on the current street
	MinRaise         int64         `json:"minRaise"`   // smallest total a raise may bring the bet to
	Players          []PokerPlayer `json:"players"`
	Winners          []string      `json:"winners,omitempty"`
	Log              []PokerEvent  `json:"log"`
	// ValidActions lists what the viewing player may do; only set in a
	// player's view while it is their turn.
	ValidActions []string `json:"validActions,omitempty"`
}
