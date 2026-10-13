import type { ReactNode } from 'react'
import { seatPosition } from './seats'
import { useTableSize } from './tableSize'

// Lays seats out along the curved rail of the table, left to right.
export default function SeatRing({ seats }: { seats: ReactNode[] }) {
  const { portrait } = useTableSize()
  return (
    <>
      {seats.map((seat, i) => {
        const { x, y } = seatPosition(i, seats.length, portrait)
        return (
          <div key={i} className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -100%)' }}>
            {seat}
          </div>
        )
      })}
    </>
  )
}
