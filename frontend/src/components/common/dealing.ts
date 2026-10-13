import { createContext, useContext, type RefObject } from 'react'

// Card dealing choreography shared by every card game. A table renders a
// <Shoe> (where cards come from) and a <DiscardTray> (where they go), and
// every <Card> inside asks the dealer for its turn, so cards are dealt one by
// one in the real order even when several arrive in the same update.

export const DEAL_STAGGER = 0.3 // seconds between two cards of one deal
export const DEAL_TRAVEL = 0.55 // flight from the shoe to the table
export const CARD_FLIP = 0.4

export interface Ticket {
  order: number
  cancelled: boolean
  resolve: (delay: number) => void
}

export interface DealTurn {
  delay: Promise<number> // seconds to wait before this card's animation
  done: () => void
  cancel: () => void
}

export interface DealContextValue {
  shoeRef: RefObject<HTMLDivElement | null>
  discardRef: RefObject<HTMLDivElement | null>
  // Ask for a turn; cards asking in the same update are ordered by `order`.
  requestTurn: (order: number, duration: number) => DealTurn
}

// Stable for the table's lifetime, so cards' effects don't restart (and
// cancel their animations) whenever the dealing state changes.
export const DealContext = createContext<DealContextValue | null>(null)
export const DealingContext = createContext(false)

export function useDeal() {
  return useContext(DealContext)
}

// True while cards are still flying or flipping; games hold back results until then.
export function useDealing() {
  return useContext(DealingContext)
}
