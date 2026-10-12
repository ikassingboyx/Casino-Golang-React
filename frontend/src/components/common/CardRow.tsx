import Card from './Card'
import type { Card as CardType } from '../../types/game'

interface Props {
  cards: CardType[]
  label?: string
  value?: number // shown next to the label when there are cards
  note?: string // e.g. "Bust", shown highlighted after the label
  cardWidth?: number
  labelPosition?: 'top' | 'bottom'
}

// A labelled row of cards: dealer/player hands, community cards, etc.
export default function CardRow({ cards, label, value, note, cardWidth = 96, labelPosition = 'top' }: Props) {
  const caption = label && (
    <div className="text-sm uppercase tracking-widest text-white/70">
      {label}
      {cards.length > 0 && value !== undefined && ` · ${value}`}
      {note && <span className="ml-2 text-yellow-300">{note}</span>}
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-2">
      {labelPosition === 'top' && caption}
      <div className="flex flex-wrap justify-center gap-2" style={{ minHeight: (cardWidth * 336) / 240 }}>
        {cards.map((c, i) => <Card key={i} card={c} width={cardWidth} />)}
      </div>
      {labelPosition === 'bottom' && caption}
    </div>
  )
}
