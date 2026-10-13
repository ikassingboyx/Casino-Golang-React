import { AnimatePresence } from 'framer-motion'
import Card from './Card'
import { useDealing } from './dealing'
import type { Card as CardType } from '../../types/game'

interface Props {
  cards: CardType[]
  label?: string
  value?: number // shown next to the label when there are cards
  note?: string // e.g. "Bust", shown highlighted after the label
  cardWidth?: number
  labelPosition?: 'top' | 'bottom'
  // Real dealing order of the card at `index` (see Card's dealOrder).
  dealOrder?: (index: number) => number
  // Identifies the round. Cards of a new round must get new keys, otherwise
  // a card still flying to the discard tray would be reused instead of dealt.
  roundKey?: string
}

// A labelled row of cards: dealer/player hands, community cards, etc.
export default function CardRow({ cards, label, value, note, cardWidth = 96, labelPosition = 'top', dealOrder = i => i, roundKey = '' }: Props) {
  const dealing = useDealing()
  // Totals and notes wait until the cards they describe have landed.
  const settled = !dealing
  const caption = label && (
    <div className="text-sm uppercase tracking-widest text-white/70">
      {label}
      {settled && cards.length > 0 && value !== undefined && ` · ${value}`}
      {settled && note && <span className="ml-2 text-yellow-300">{note}</span>}
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-2">
      {labelPosition === 'top' && caption}
      <div className="flex flex-wrap justify-center gap-2" style={{ minHeight: (cardWidth * 336) / 240 }}>
        <AnimatePresence>
          {cards.map((c, i) => <Card key={`${roundKey}:${i}`} card={c} width={cardWidth} dealOrder={dealOrder(i)} />)}
        </AnimatePresence>
      </div>
      {labelPosition === 'bottom' && caption}
    </div>
  )
}
