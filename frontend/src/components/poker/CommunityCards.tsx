import { AnimatePresence } from 'framer-motion'
import Card from '../common/Card'
import { cardHeight, useTableSize } from '../common/tableSize'
import type { Card as CardType } from '../../types/game'

interface Props {
  cards: CardType[] // the cards dealt so far
  roundKey?: string
}

// The board: five card spots printed on the felt, filled from the left as
// the streets are dealt.
export default function CommunityCards({ cards, roundKey = '' }: Props) {
  const { u, portrait } = useTableSize()
  const width = u * (portrait ? 7.6 : 6)
  const gap = u * (portrait ? 0.8 : 0.9)
  return (
    <div className="relative" style={{ width: width * 5 + gap * 4, height: cardHeight(width) }}>
      <div className="absolute inset-0 flex" style={{ gap }} aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="rounded-[6%] border border-brass/25 bg-black/10" style={{ width, height: cardHeight(width) }} />
        ))}
      </div>
      <div className="absolute inset-0 flex" style={{ gap }}>
        <AnimatePresence>
          {cards.map((c, i) => (
            <Card key={`${roundKey}:${i}`} card={c} width={width} dealOrder={i} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
