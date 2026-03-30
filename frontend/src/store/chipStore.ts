import { create } from 'zustand'

interface ChipState {
  balance: number
  canClaimDaily: boolean
  setBalance: (n: number) => void
  setCanClaimDaily: (v: boolean) => void
}

export const useChipStore = create<ChipState>((set) => ({
  balance: 0,
  canClaimDaily: false,
  setBalance: (balance) => set({ balance }),
  setCanClaimDaily: (canClaimDaily) => set({ canClaimDaily }),
}))
