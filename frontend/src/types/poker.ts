import type { BaseGameState, BasePlayer, Card } from './game'

export type PokerPlayerStatus = 'active' | 'folded' | 'all_in' | 'out'

export interface PokerPlayer extends BasePlayer {
  cards: Card[]
  currentBet: number
  totalBetThisHand: number
  startChips: number // chips at the start of the hand
  status: PokerPlayerStatus
  position: number
  handRank?: string // best hand: your own while playing, everyone's at showdown
  won?: number // chips won from the pot(s)
}

export interface SidePot {
  amount: number
  eligibleIds: string[]
}

export interface PokerGameState extends BaseGameState {
  gameType: 'poker'
  dealerIndex: number
  smallBlindIndex: number
  bigBlindIndex: number
  currentTurnIndex: number
  bigBlind: number
  smallBlind: number
  pot: number
  sidePots: SidePot[]
  communityCards: Card[]
  currentBet: number
  minRaise: number // smallest total a raise may bring the bet to
  players: PokerPlayer[]
  winners?: string[]
  validActions?: PokerAction[] // only while it is the viewer's turn
  log: PokerEvent[] // every step of the hand so far, in order
}

// One step of a hand. Player events carry the player's street bet and stack
// afterwards; table events (collect, flop, turn, river) only the pot.
export interface PokerEvent {
  action: PokerAction | 'small_blind' | 'big_blind' | 'return' | 'collect' | 'flop' | 'turn' | 'river'
  playerId?: string
  bet: number
  chips: number
  pot: number // all chips bet this hand afterwards
}

// `raise` (or `bet`) carries the total to raise the street bet to.
export type PokerAction = 'fold' | 'check' | 'call' | 'raise' | 'bet' | 'all_in'
