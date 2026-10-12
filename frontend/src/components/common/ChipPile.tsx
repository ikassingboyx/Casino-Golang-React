import { BET_CHIPS, breakIntoChips, chipTopSrc } from '../../utils/chipUtils'

interface Props {
  amount: number
  maxVisible?: number
}

// Top-view chips piled on a betting spot, using the fewest chips for the
// amount (e.g. 4 x 25 shows as one 100). Fills its parent's width.
export default function ChipPile({ amount, maxVisible = 6 }: Props) {
  const chips = breakIntoChips(amount, BET_CHIPS).flatMap(p => Array<number>(p.count).fill(p.value))
  const visible = chips.slice(0, maxVisible)

  return (
    <div className="relative aspect-square w-full" title={`${amount}`}>
      {visible.map((value, i) => (
        <img
          key={i}
          src={chipTopSrc(value)}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]"
          style={{ transform: `translateY(${-i * 9}%)` }}
        />
      ))}
    </div>
  )
}
