import { useState } from 'react'
import { chipTopSrc, formatChips } from '../../utils/chipUtils'

interface Props {
  value: number
  onClick?: () => void
  disabled?: boolean
  selected?: boolean // raised with a ring, e.g. the active chip in a chip selector
  size?: number
}

// Top-view chip button used in betting menus.
export default function Chip({ value, onClick, disabled, selected, size = 56 }: Props) {
  const [missing, setMissing] = useState(false)

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={String(value)}
      aria-pressed={selected}
      style={{ width: size, height: size }}
      className={`rounded-full transition-transform hover:-translate-y-1 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0 ${
        selected ? '-translate-y-2 ring-4 ring-yellow-300 ring-offset-2 ring-offset-black/40' : ''
      }`}
    >
      {missing ? (
        <span className="flex h-full w-full items-center justify-center rounded-full border-4 border-dashed border-white/60 bg-neutral-700 text-sm font-bold">
          {formatChips(value)}
        </span>
      ) : (
        <img src={chipTopSrc(value)} alt={`${value} chip`} draggable={false} onError={() => setMissing(true)} className="h-full w-full drop-shadow-md" />
      )}
    </button>
  )
}
