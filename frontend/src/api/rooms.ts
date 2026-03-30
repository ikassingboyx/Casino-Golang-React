import http from './http'
import type { Room, RoomSettings } from '../types/room'
import type { GameType } from '../types/game'

export const createRoom = (gameType: GameType, settings: RoomSettings) =>
  http.post<{ roomId: string; code: string }>('/rooms', { gameType, settings })

export const getRoom = (code: string) =>
  http.get<Room>(`/rooms/${code}`)

export const joinRoom = (code: string) =>
  http.post<Room>(`/rooms/${code}/join`)

export const leaveRoom = (code: string) =>
  http.delete(`/rooms/${code}/leave`)
