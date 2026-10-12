import Card from '../common/Card'
import type { Card as CardType } from '../../types/game'

interface Props {
  cards: CardType[]
  total: number
  status?: string
}

const statusLabels: Record<string, string> = { bust: 'Bust', blackjack: 'Blackjack!' }

export default function PlayerHand({ cards, total, status }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2 min-h-[134px]">
        {cards.map((c, i) => <Card key={i} card={c} />)}
      </div>
      <div className="text-sm uppercase tracking-widest text-white/70">
        You {cards.length > 0 && `· ${total}`}
        {status && statusLabels[status] && <span className="ml-2 text-yellow-300">{statusLabels[status]}</span>}
      </div>
    </div>
  )
}
