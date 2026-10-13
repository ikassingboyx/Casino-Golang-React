import type { BaseGameState, BasePlayer, Card } from './game'

export interface BaccaratHand {
  cards: Card[]
  total: number
}

export interface BaccaratBets {
  player: number
  banker: number
  tie: number
}

export interface BaccaratPlayer extends BasePlayer {
  bets: BaccaratBets
  payouts: BaccaratBets // chips returned per spot (stake + winnings) once resolved
}

export type BaccaratSpot = keyof BaccaratBets
export type BaccaratResult = 'player' | 'banker' | 'tie'

export interface BaccaratGameState extends BaseGameState {
  gameType: 'baccarat'
  playerHand: BaccaratHand
  bankerHand: BaccaratHand
  players: BaccaratPlayer[]
  result?: BaccaratResult
  chipChange?: number
}
