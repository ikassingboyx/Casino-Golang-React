import Chip from './Chip'
import { BET_CHIPS } from '../../utils/chipUtils'

interface Props {
  selected: number
  onSelect: (value: number) => void
  max: number // chips still available; bigger chips are disabled
  disabled?: boolean
}

// Row of top-view chips where one is the active chip (for placing on a board).
export default function ChipSelector({ selected, onSelect, max, disabled }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="Chip value">
      {BET_CHIPS.map(v => (
        <Chip key={v} value={v} selected={v === selected} disabled={disabled || v > max} onClick={() => onSelect(v)} />
      ))}
    </div>
  )
}
