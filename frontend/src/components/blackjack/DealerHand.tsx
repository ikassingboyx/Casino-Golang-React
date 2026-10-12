import Card from '../common/Card'
import type { Card as CardType } from '../../types/game'

interface Props {
  cards: CardType[]
  total: number
}

export default function DealerHand({ cards, total }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-sm uppercase tracking-widest text-white/70">Dealer {cards.length > 0 && `· ${total}`}</div>
      <div className="flex gap-2 min-h-[134px]">
        {cards.map((c, i) => <Card key={i} card={c} />)}
      </div>
    </div>
  )
}
