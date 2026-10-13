import Chip from './Chip'
import { BET_CHIPS } from '../../utils/chipUtils'

interface Props {
  selected?: number // the active chip; omitted when chips are clicked to add to a bet
  onSelect: (value: number) => void
  max: number // chips still available; bigger chips are disabled
  disabled?: boolean
  size?: number
}

// Row of top-view chips where one is the active chip (for placing on a board).
export default function ChipSelector({ selected, onSelect, max, disabled, size = 44 }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2" role={selected === undefined ? undefined : 'radiogroup'} aria-label="Chip value">
      {BET_CHIPS.map(v => (
        <Chip key={v} value={v} size={size} selected={v === selected} disabled={disabled || v > max} onClick={() => onSelect(v)} />
      ))}
    </div>
  )
}
