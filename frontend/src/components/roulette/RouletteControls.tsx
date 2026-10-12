interface Props {
  totalBet: number
  busy: boolean
  canRebet: boolean
  onUndo: () => void
  onClear: () => void
  onRebet: () => void
  onSpin: () => void
}

const btn = 'rounded px-4 py-2 ring-1 ring-white/30 hover:bg-white/10 disabled:opacity-40'

export default function RouletteControls({ totalBet, busy, canRebet, onUndo, onClear, onRebet, onSpin }: Props) {
  const empty = totalBet === 0
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <span className="min-w-[8rem] text-center text-sm text-white/80">
        Total bet: <span className="font-bold text-yellow-300">{totalBet}</span>
      </span>
      <button onClick={onUndo} disabled={busy || empty} className={btn}>Undo</button>
      <button onClick={onClear} disabled={busy || empty} className={btn}>Clear</button>
      <button onClick={onRebet} disabled={busy || !canRebet} className={btn}>Rebet</button>
      <button onClick={onSpin} disabled={busy || empty} className="rounded bg-yellow-400 px-6 py-2 font-bold text-black hover:bg-yellow-300 disabled:opacity-40">
        Spin
      </button>
    </div>
  )
}
