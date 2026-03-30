export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
export type GameType = 'blackjack' | 'poker' | 'baccarat' | 'roulette'

export interface Card {
  suit: Suit
  rank: Rank
  hidden?: boolean
}

export interface BasePlayer {
  id: string
  name: string
  chips: number
  isBot: boolean
  isConnected: boolean
}

export interface LastAction {
  playerId: string
  action: string
  amount?: number
}

export interface BaseGameState {
  gameId: string
  roomId?: string
  gameType: GameType
  phase: string
  isOffline: boolean
  status: 'active' | 'completed'
  lastAction?: LastAction
}

export interface ChipChange {
  playerId: string
  amount: number
}
