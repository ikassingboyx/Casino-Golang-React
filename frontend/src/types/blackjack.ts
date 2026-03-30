import { BaseGameState, BasePlayer, Card } from './game'

export type HandStatus = 'playing' | 'stand' | 'bust' | 'blackjack' | 'double'

export interface BlackjackHand {
  cards: Card[]
  bet: number
  status: HandStatus
}

export interface BlackjackPlayer extends BasePlayer {
  hands: BlackjackHand[]
}

export interface DealerHand {
  cards: Card[]
}

export interface BlackjackGameState extends BaseGameState {
  gameType: 'blackjack'
  currentPlayerIndex: number
  players: BlackjackPlayer[]
  dealerHand: DealerHand
}
