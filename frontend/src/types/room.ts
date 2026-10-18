import type { GameType } from './game'

export interface RoomPlayer {
  userId: string
  displayName: string
  avatarUrl?: string | null
  chips: number
  isHost: boolean
  connected: boolean // false while they're reconnecting
  isBot: boolean // poker: a bot the host seated
}

// An online table, as everyone in it sees it.
export interface Room {
  code: string // 5 digits, also the invite link: /room/:code
  gameType: GameType
  hostId: string
  status: 'waiting' | 'playing'
  maxPlayers: number
  players: RoomPlayer[] // in seat order
}
