import type { ReactNode } from 'react'
import { useElementSize } from '../../hooks/useElementSize'
import { TableSizeContext } from './tableSize'

const LANDSCAPE = 2.05 // table width / height
const PORTRAIT = 0.72
const MAX_WIDTH = 1600

interface Props {
  // 'd': flat dealer edge at the top, seats along the curve (blackjack,
  // baccarat). 'oval': a poker table with seats all around.
  shape?: 'd' | 'oval'
  children: ReactNode
}

// The card table, as big as fits in its parent. Children are laid out on the
// felt with absolute positions (percentages) and sizes in table units
// (useTableSize).
export default function TableStage({ shape: kind = 'd', children }: Props) {
  const [ref, box] = useElementSize<HTMLDivElement>()
  const portrait = box.width / Math.max(box.height, 1) < 1.1
  const aspect = portrait ? PORTRAIT : LANDSCAPE
  const width = Math.floor(Math.min(box.width, box.height * aspect, MAX_WIDTH))
  const height = Math.floor(width / aspect)
  const u = portrait ? width / 62 : width / 100
  const shape = kind === 'oval' ? 'table-oval' : portrait ? 'table-d-tall' : 'table-d'

  return (
    <div ref={ref} className="flex h-full w-full items-center justify-center">
      {width > 0 && (
        <TableSizeContext.Provider value={{ width, height, u, portrait }}>
          <div className="relative" style={{ width, height }}>
            <div className={`${shape} table-rail absolute inset-0`} />
            <div className={`${shape} table-felt absolute`} style={{ inset: Math.max(10, u * 1.6) }} />
            <div className="absolute inset-0">{children}</div>
          </div>
        </TableSizeContext.Provider>
      )}
    </div>
  )
}
