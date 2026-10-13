import { createContext, useContext } from 'react'

// Size of the table on screen. Everything on the felt (cards, chips, seats)
// is sized in `u` so the whole table scales with the window.
export interface TableSize {
  width: number
  height: number
  u: number // one table unit in px
  portrait: boolean // a narrow window: a taller table with relatively bigger pieces
}

export const TableSizeContext = createContext<TableSize>({ width: 1000, height: 500, u: 10, portrait: false })

export function useTableSize() {
  return useContext(TableSizeContext)
}

// Card artwork is 240x336.
export const cardHeight = (width: number) => (width * 336) / 240
