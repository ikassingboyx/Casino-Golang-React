import http from './http'
import type { ChipChange, GameType } from '../types/game'

// Response of every offline game request. `State` is the game's player view.
export interface GameResponse<State> {
  gameId: string
  state: State
  chips: number // the user's balance after the request
  result?: ChipChange // net win/loss, once the round is over
}

// Extra data sent with an action: a single amount (blackjack bet) or a list
// of board bets (roulette spin).
export interface ActionPayload {
  amount?: number
  bets?: { type: string; amount: number }[]
}

// Resumes the user's unfinished game of this type, or starts a new round.
export async function startOfflineGame<State>(gameType: GameType) {
  const { data } = await http.post<GameResponse<State>>('/game/offline/start', { gameType })
  return data
}

export async function offlineAction<State>(gameId: string, action: string, payload: ActionPayload = {}) {
  const { data } = await http.post<GameResponse<State>>('/game/offline/action', { gameId, action, ...payload })
  return data
}
