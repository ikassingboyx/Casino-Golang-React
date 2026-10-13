import { motion } from 'framer-motion'
import type { BaccaratResult } from '../../types/baccarat'

const ROWS = 6
const COLS = 12

const beadColor: Record<BaccaratResult, string> = { player: 'bg-punto', banker: 'bg-banco', tie: 'bg-jade' }
const letter: Record<BaccaratResult, string> = { player: 'P', banker: 'B', tie: 'T' }

// The table's scoreboard: results of this session filled in column by column,
// oldest top-left, like the bead plate at a real baccarat table.
export default function BeadRoad({ results, bead = 20 }: { results: BaccaratResult[]; bead?: number }) {
  // Once the plate is full the oldest column scrolls off.
  const overflow = Math.max(0, results.length - ROWS * COLS)
  const shown = results.slice(Math.ceil(overflow / ROWS) * ROWS)
  const count = (r: BaccaratResult) => results.filter(x => x === r).length

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="grid grid-flow-col rounded-lg bg-black/35 ring-1 ring-brass/25"
        style={{ gridTemplateRows: `repeat(${ROWS}, ${bead}px)`, gridTemplateColumns: `repeat(${COLS}, ${bead}px)`, gap: bead * 0.2, padding: bead * 0.4 }}
        aria-label="Results this session"
      >
        {Array.from({ length: ROWS * COLS }, (_, i) => {
          const r = shown[i]
          if (!r) return <span key={i} className="rounded-full bg-white/5" />
          return (
            <motion.span
              key={`${i}:${r}`}
              initial={i === shown.length - 1 ? { scale: 0 } : false}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
              className={`flex items-center justify-center rounded-full font-bold ${beadColor[r]}`}
              style={{ fontSize: bead * 0.55 }}
            >
              {letter[r]}
            </motion.span>
          )
        })}
      </div>
      <div className="flex gap-2 text-ivory/70" style={{ fontSize: Math.max(10, bead * 0.6) }}>
        <span>Player {count('player')}</span>
        <span>Banker {count('banker')}</span>
        <span>Tie {count('tie')}</span>
      </div>
    </div>
  )
}
