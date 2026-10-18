import { create } from 'zustand'
import type { GameResponse } from '../api/game'
import type { Room } from '../types/room'

// The online room the player is in, as last sent by the server.
interface RoomState {
  code: string | null
  room: Room | null
  game: GameResponse<unknown> | null // the round on the table, as this player sees it
  deadline: number | null // when the round's clock (game.timeLeft) runs out, in this browser's time
  connected: boolean
  fatal: string | null // why we can't be at this table (not found, full…)
  notice: string | null // a message from the table, e.g. why the game stopped
  reset: (code: string | null) => void
}

export const useRoomStore = create<RoomState>((set) => ({
  code: null,
  room: null,
  game: null,
  deadline: null,
  connected: false,
  fatal: null,
  notice: null,
  reset: (code) => set({ code, room: null, game: null, deadline: null, connected: false, fatal: null, notice: null }),
}))
