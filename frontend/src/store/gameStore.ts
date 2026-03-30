import { create } from 'zustand'
import type { BaseGameState } from '../types/game'

interface GameState {
  gameState: BaseGameState | null
  roomId: string | null
  isConnected: boolean
  setGameState: (state: BaseGameState) => void
  setRoomId: (id: string) => void
  setConnected: (v: boolean) => void
  reset: () => void
}

export const useGameStore = create<GameState>((set) => ({
  gameState: null,
  roomId: null,
  isConnected: false,
  setGameState: (gameState) => set({ gameState }),
  setRoomId: (roomId) => set({ roomId }),
  setConnected: (isConnected) => set({ isConnected }),
  reset: () => set({ gameState: null, roomId: null, isConnected: false }),
}))
