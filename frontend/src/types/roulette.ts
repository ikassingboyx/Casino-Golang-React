import { BaseGameState, BasePlayer } from './game'

export type BetType =
  | 'straight' | 'split' | 'street' | 'corner' | 'six_line'
  | 'column' | 'dozen' | 'red' | 'black' | 'odd' | 'even' | 'low' | 'high'

export interface RouletteBet {
  type: BetType
  numbers: number[]
  amount: number
}

export interface RoulettePlayer extends BasePlayer {
  bets: RouletteBet[]
}

export interface RoulettePayout {
  playerId: string
  amount: number
}

export interface RouletteGameState extends BaseGameState {
  gameType: 'roulette'
  timerSeconds: number
  lastResult: number | null
  players: RoulettePlayer[]
  winningNumber?: number
  payouts?: RoulettePayout[]
}
