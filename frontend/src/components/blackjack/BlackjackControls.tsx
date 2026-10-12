interface Props {
  busy: boolean
  canDouble: boolean
  onHit: () => void
  onStand: () => void
  onDouble: () => void
}

const btn = 'rounded px-6 py-3 font-bold ring-1 ring-white/30 hover:bg-white/10 disabled:opacity-40'

export default function BlackjackControls({ busy, canDouble, onHit, onStand, onDouble }: Props) {
  return (
    <div className="flex gap-3">
      <button onClick={onHit} disabled={busy} className={btn}>Hit</button>
      <button onClick={onStand} disabled={busy} className={btn}>Stand</button>
      <button onClick={onDouble} disabled={busy || !canDouble} className={btn}>Double</button>
    </div>
  )
}
