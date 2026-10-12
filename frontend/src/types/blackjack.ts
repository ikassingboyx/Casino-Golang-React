import type { BaseGameState, BasePlayer, Card } from './game'

export type HandStatus = 'playing' | 'stand' | 'bust' | 'blackjack'

export interface BlackjackHand {
  cards: Card[]
  bet: number
  status: HandStatus
  value: number // total of the visible cards
}

export interface BlackjackPlayer extends BasePlayer {
  hands: BlackjackHand[] | null // null until the first bet
}

export interface DealerHand {
  cards: Card[]
  value: number // total of the visible cards
}

export interface BlackjackGameState extends BaseGameState {
  gameType: 'blackjack'
  currentPlayerIndex: number
  players: BlackjackPlayer[]
  dealerHand: DealerHand
}
