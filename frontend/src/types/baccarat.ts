import { BaseGameState, BasePlayer, Card } from './game'

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
}

export interface BaccaratGameState extends BaseGameState {
  gameType: 'baccarat'
  playerHand: BaccaratHand
  bankerHand: BaccaratHand
  players: BaccaratPlayer[]
  result?: 'player' | 'banker' | 'tie'
  chipChange?: number
}
