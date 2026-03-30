import { BaseGameState, BasePlayer, Card } from './game'

export type PokerPlayerStatus = 'active' | 'folded' | 'all_in' | 'out'

export interface PokerPlayer extends BasePlayer {
  cards: Card[]
  currentBet: number
  totalBetThisHand: number
  status: PokerPlayerStatus
  position: number
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
  minRaise: number
  players: PokerPlayer[]
  winners?: string[]
}
