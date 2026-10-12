import type { ReactNode } from 'react'
import DealerHand from './DealerHand'
import PlayerHand from './PlayerHand'
import ChipStack from '../common/ChipStack'
import type { Card } from '../../types/game'

interface Props {
  dealerCards: Card[]
  dealerTotal: number
  playerCards: Card[]
  playerTotal: number
  handStatus?: string
  betAmount: number
  stackAmount: number
  message?: string
  controls: ReactNode
}

// Felt table: dealer on top, player below, bet spot and the player's stack at the bottom.
export default function BlackjackTable(p: Props) {
  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-6 rounded-[3rem] border-8 border-amber-900 bg-gradient-to-b from-emerald-800 to-emerald-950 px-4 py-8 shadow-2xl">
      <DealerHand cards={p.dealerCards} total={p.dealerTotal} />

      <div className="h-8 text-center text-xl font-bold text-yellow-300">{p.message}</div>

      <PlayerHand cards={p.playerCards} total={p.playerTotal} status={p.handStatus} />

      <div className="flex w-full flex-wrap items-end justify-around gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs uppercase tracking-widest text-white/60">Bet</div>
          <div className="flex min-h-[90px] min-w-[120px] items-end justify-center rounded-full border-2 border-dashed border-white/30 px-3 pb-2">
            <ChipStack amount={p.betAmount} chipWidth={48} label={p.betAmount > 0 ? String(p.betAmount) : ''} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs uppercase tracking-widest text-white/60">Your chips</div>
          <ChipStack amount={p.stackAmount} label={String(p.stackAmount)} />
        </div>
      </div>

      {p.controls}
    </div>
  )
}
