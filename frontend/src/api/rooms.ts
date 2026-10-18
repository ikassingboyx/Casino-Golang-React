import http from './http'
import type { Room } from '../types/room'
import type { GameType } from '../types/game'

// Opens an online table for a game; the creator joins it like everyone else,
// by opening /room/:code.
export const createRoom = (gameType: GameType) =>
  http.post<Room>('/rooms', { gameType })

export const getRoom = (code: string) =>
  http.get<Room>(`/rooms/${code}`)
