import { useDeal } from './dealing'

// The dealer's card shoe: every dealt card starts its flight here.
export default function Shoe({ cardWidth = 64 }: { cardWidth?: number }) {
  const deal = useDeal()
  const h = (cardWidth * 336) / 240
  return (
    <div className="flex flex-col items-center gap-1" aria-hidden>
      <div
        ref={deal?.shoeRef}
        className="relative rounded-lg bg-gradient-to-b from-neutral-800 to-black p-1.5 shadow-[0_8px_18px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-black/60"
        style={{ width: cardWidth + 16, height: h + 12 }}
      >
        {[3, 2, 1, 0].map(i => (
          <img
            key={i}
            src="/assets/cards/back.svg"
            alt=""
            draggable={false}
            className="absolute rounded-md"
            style={{ width: cardWidth, left: 8 + i * 1.5, top: 6 - i * 1.5 }}
          />
        ))}
      </div>
    </div>
  )
}
