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
  // Fraction of each card hidden under the next one, for tight spots like seats.
  overlap?: number
}

// A labelled row of cards: dealer/player hands, community cards, etc.
export default function CardRow({ cards, label, value, note, cardWidth = 96, labelPosition = 'top', dealOrder = i => i, roundKey = '', overlap = 0 }: Props) {
  const dealing = useDealing()
  // Totals and notes wait until the cards they describe have landed.
  const settled = !dealing
  const caption = label && (
    <div className="font-felt text-sm tracking-[0.2em] text-ivory/75">
      {label}
      {settled && cards.length > 0 && value !== undefined && ` · ${value}`}
      {settled && note && <span className="ml-2 text-yellow-300">{note}</span>}
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-2">
      {labelPosition === 'top' && caption}
      <div className={`flex justify-center ${overlap ? '' : 'flex-wrap gap-2'}`} style={{ minHeight: (cardWidth * 336) / 240 }}>
        <AnimatePresence>
          {cards.map((c, i) => (
            <Card key={`${roundKey}:${i}`} card={c} width={cardWidth} dealOrder={dealOrder(i)} marginLeft={overlap && i > 0 ? -cardWidth * overlap : 0} />
          ))}
        </AnimatePresence>
      </div>
      {labelPosition === 'bottom' && caption}
    </div>
  )
}
