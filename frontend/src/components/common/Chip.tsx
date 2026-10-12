import { useState } from 'react'
import { chipTopSrc, formatChips } from '../../utils/chipUtils'

interface Props {
  value: number
  onClick?: () => void
  disabled?: boolean
  size?: number
}

// Top-view chip button used in betting menus.
export default function Chip({ value, onClick, disabled, size = 56 }: Props) {
  const [missing, setMissing] = useState(false)

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={`Add ${value}`}
      style={{ width: size, height: size }}
      className="rounded-full transition-transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-30 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
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
