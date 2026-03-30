import { create } from 'zustand'
import type { Room } from '../types/room'

interface LobbyState {
  currentRoom: Room | null
  setRoom: (room: Room | null) => void
}

export const useLobbyStore = create<LobbyState>((set) => ({
  currentRoom: null,
  setRoom: (currentRoom) => set({ currentRoom }),
}))
