import { breakIntoChips, chipSideSrc } from '../../utils/chipUtils'

interface Props {
  amount: number
  chipWidth?: number
  maxPerColumn?: number
  label?: string
}

// Side-view chip artwork is 200x122; each chip's edge is 18 units thick, so
// stacked chips are offset by that much to sit on top of each other.
const ART_W = 200
const ART_H = 122
const EDGE = 18

interface Column {
  value: number
  count: number
}

// Shows an amount as stacks of side-view chips: one column per denomination
// (largest on the left), using the fewest chips possible. Tall piles are
// split into extra columns of the same chip.
export default function ChipStack({ amount, chipWidth = 56, maxPerColumn = 10, label }: Props) {
  const chipH = (chipWidth * ART_H) / ART_W
  const step = (chipWidth * EDGE) / ART_W

  const columns: Column[] = []
  for (const pile of breakIntoChips(amount)) {
    for (let left = pile.count; left > 0; left -= maxPerColumn) {
      columns.push({ value: pile.value, count: Math.min(left, maxPerColumn) })
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-end gap-1" style={{ minHeight: chipH }}>
        {columns.map((col, ci) => (
          <div key={ci} className="relative" style={{ width: chipWidth, height: chipH + (col.count - 1) * step }}>
            {Array.from({ length: col.count }, (_, i) => (
              <img
                key={i}
                src={chipSideSrc(col.value)}
                alt={i === col.count - 1 ? `${col.value} chip` : ''}
                draggable={false}
                className="absolute left-0 select-none"
                style={{ bottom: i * step, width: chipWidth }}
              />
            ))}
          </div>
        ))}
      </div>
      {label !== undefined && <div className="text-sm text-white/80">{label}</div>}
    </div>
  )
}
