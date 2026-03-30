import { GameType } from './game'

export interface RoomSettings {
  bigBlind?: number
  maxPlayers: number
}

export interface RoomPlayer {
  userId: string
  displayName: string
  avatarUrl?: string
  isHost: boolean
}

export interface Room {
  id: string
  code: string
  gameType: GameType
  hostId: string
  status: 'waiting' | 'playing' | 'finished'
  settings: RoomSettings
  players: RoomPlayer[]
}
