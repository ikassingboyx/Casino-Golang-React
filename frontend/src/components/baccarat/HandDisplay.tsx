import { AnimatePresence, motion } from 'framer-motion'
import CardRow from '../common/CardRow'
import { useDealing } from '../common/dealing'
import { cardHeight, useTableSize } from '../common/tableSize'
import { handTotal, isNatural } from '../../utils/baccarat'
import type { Card } from '../../types/game'

export type HandOutcome = 'win' | 'lose' | 'tie'

interface Props {
  side: 'player' | 'banker'
  cards: Card[]
  dealOrder: (index: number) => number
  roundKey?: string
  outcome?: HandOutcome // set once the coup is decided
  cardWidth?: number
}

const theme = {
  player: { label: 'Player', text: 'text-[#9cc4ef]', badge: 'bg-punto', glow: 'rgba(63,127,196,0.6)' },
  banker: { label: 'Banker', text: 'text-[#f0a49d]', badge: 'bg-banco', glow: 'rgba(194,69,61,0.6)' },
}

// One side of the coup: its cards, a running total that pops in once the
// cards have landed, and a glow when it wins.
export default function HandDisplay({ side, cards, dealOrder, roundKey, outcome, cardWidth = 80 }: Props) {
  const dealing = useDealing()
  const { u } = useTableSize()
  const t = theme[side]
  const badge = Math.max(24, u * 2.8)
  const settled = !dealing && cards.length > 0
  const total = handTotal(cards)
  const note = !settled ? '' : outcome === 'win' ? 'Wins' : outcome === 'tie' ? 'Tie' : isNatural(cards) ? 'Natural' : ''
  const glow = outcome === 'win' ? t.glow : outcome === 'tie' ? 'rgba(52,211,153,0.5)' : null

  return (
    <motion.div
      animate={{
        opacity: outcome === 'lose' ? 0.55 : 1,
        boxShadow: glow ? [`0 0 0px 0px ${glow}`, `0 0 36px 6px ${glow}`, `0 0 0px 0px ${glow}`] : '0 0 0px 0px rgba(0,0,0,0)',
      }}
      transition={glow ? { boxShadow: { duration: 1.6, repeat: Infinity }, opacity: { duration: 0.4 } } : { duration: 0.4 }}
      className="flex flex-col items-center rounded-2xl bg-black/15 ring-1 ring-ivory/10"
      // Room for three cards so the hand doesn't grow when a third is drawn.
      style={{ minWidth: cardWidth * 3 + u * 3, padding: `${u * 0.6}px ${u}px`, gap: u * 0.5 }}
    >
      <div className="flex items-center" style={{ height: badge, gap: u }}>
        <span className={`font-felt tracking-[0.25em] ${t.text}`} style={{ fontSize: Math.max(12, u * 1.4) }}>{t.label}</span>
        <AnimatePresence mode="popLayout">
          {settled && (
            <motion.span
              key={`${roundKey}:${cards.length}`}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className={`flex items-center justify-center rounded-full font-black shadow-lg ring-2 ring-ivory/40 ${t.badge}`}
              style={{ width: badge, height: badge, fontSize: badge * 0.5 }}
            >
              {total}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div style={{ minHeight: cardHeight(cardWidth) }}>
        <CardRow cards={cards} cardWidth={cardWidth} dealOrder={dealOrder} roundKey={roundKey} />
      </div>
      <div className="font-bold text-brass-light" style={{ height: Math.max(14, u * 1.6), fontSize: Math.max(11, u * 1.2) }}>{note}</div>
    </motion.div>
  )
}
