import type { BaseGameState, BasePlayer } from './game'

// A stake on one board spot. `type` is the spot name from the board SVG
// (data-bet), e.g. "straight-17", "split-1-2", "red", "dozen-2".
export interface RouletteBet {
  type: string
  numbers: number[]
  amount: number
  win?: number // chips returned (stake + winnings) once resolved
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
