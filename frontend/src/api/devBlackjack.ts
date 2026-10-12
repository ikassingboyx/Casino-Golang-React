import http from './http'
import type { BlackjackGameState } from '../types/blackjack'
import type { ChipChange } from '../types/game'

// Temporary unauthenticated, in-memory blackjack API (backend /api/dev/blackjack).

export interface DevBlackjackResponse {
  sessionId: string
  state: BlackjackGameState
  playerTotal: number
  dealerTotal: number
  result?: ChipChange
}

export type BlackjackAction = 'bet' | 'hit' | 'stand' | 'double'

export async function newBlackjackSession() {
  const { data } = await http.post<DevBlackjackResponse>('/dev/blackjack')
  return data
}

export async function blackjackAction(sessionId: string, action: BlackjackAction, amount?: number) {
  const { data } = await http.post<DevBlackjackResponse>(`/dev/blackjack/${sessionId}/action`, { action, amount })
  return data
}
