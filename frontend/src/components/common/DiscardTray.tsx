import { useDeal } from './dealing'

// Where cards go when a round is cleared.
export default function DiscardTray({ cardWidth = 64 }: { cardWidth?: number }) {
  const deal = useDeal()
  return (
    <div
      ref={deal?.discardRef}
      aria-hidden
      className="rounded-lg border-2 border-dashed border-white/15"
      style={{ width: cardWidth + 8, height: (cardWidth * 336) / 240 + 8 }}
    />
  )
}
