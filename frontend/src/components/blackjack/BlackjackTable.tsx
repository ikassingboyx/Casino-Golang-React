import type { ReactNode } from 'react'
import CardRow from '../common/CardRow'
import ChipStack from '../common/ChipStack'
import type { BlackjackGameState } from '../../types/blackjack'

interface Props {
  state: BlackjackGameState | null
  betAmount: number // chips on the bet spot
  stackAmount: number // the player's chips off the table
  message?: string
  controls: ReactNode
}

const statusNotes: Record<string, string> = { bust: 'Bust', blackjack: 'Blackjack!' }

// Felt table: dealer on top, player below, bet spot and the player's stack at the bottom.
export default function BlackjackTable({ state, betAmount, stackAmount, message, controls }: Props) {
  const hand = state?.players[0]?.hands?.[0]

  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-6 rounded-[3rem] border-8 border-amber-900 bg-gradient-to-b from-emerald-800 to-emerald-950 px-4 py-8 shadow-2xl">
      <CardRow label="Dealer" cards={state?.dealerHand.cards ?? []} value={state?.dealerHand.value} />

      <div className="h-8 text-center text-xl font-bold text-yellow-300">{message}</div>

      <CardRow
        label="You"
        cards={hand?.cards ?? []}
        value={hand?.value}
        note={hand ? statusNotes[hand.status] : undefined}
        labelPosition="bottom"
      />

      <div className="flex w-full flex-wrap items-end justify-around gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs uppercase tracking-widest text-white/60">Bet</div>
          <div className="flex min-h-[90px] min-w-[120px] items-end justify-center rounded-full border-2 border-dashed border-white/30 px-3 pb-2">
            <ChipStack amount={betAmount} chipWidth={48} label={betAmount > 0 ? String(betAmount) : ''} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs uppercase tracking-widest text-white/60">Your chips</div>
          <ChipStack amount={stackAmount} label={String(stackAmount)} />
        </div>
      </div>

      {controls}
    </div>
  )
}
