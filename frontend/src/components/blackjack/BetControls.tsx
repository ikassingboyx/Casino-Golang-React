import Chip from '../common/Chip'
import { BET_CHIPS } from '../../utils/chipUtils'

interface Props {
  bet: number
  chips: number
  busy: boolean
  onChange: (bet: number) => void
  onDeal: () => void
}

// Betting menu: click top-view chips to add to the bet, or type an amount.
export default function BetControls({ bet, chips, busy, onChange, onDeal }: Props) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-2">
        {BET_CHIPS.map(v => (
          <Chip key={v} value={v} disabled={busy || bet + v > chips} onClick={() => onChange(bet + v)} />
        ))}
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={e => {
          e.preventDefault()
          onDeal()
        }}
      >
        <input
          type="number"
          min={0}
          max={chips}
          value={bet || ''}
          placeholder="Bet"
          onChange={e => onChange(Math.min(chips, Math.max(0, Math.floor(Number(e.target.value) || 0))))}
          className="w-28 rounded bg-black/40 px-3 py-2 text-right outline-none ring-1 ring-white/20 focus:ring-yellow-300"
        />
        <button type="button" onClick={() => onChange(0)} disabled={busy || bet === 0} className="rounded px-3 py-2 ring-1 ring-white/30 hover:bg-white/10 disabled:opacity-40">
          Clear
        </button>
        <button type="submit" disabled={busy || bet <= 0 || bet > chips} className="rounded bg-yellow-400 px-5 py-2 font-bold text-black hover:bg-yellow-300 disabled:opacity-40">
          Bet
        </button>
      </form>
    </div>
  )
}
