import type { ReactNode } from 'react'
import CardRow from '../common/CardRow'
import ChipStack from '../common/ChipStack'
import DiscardTray from '../common/DiscardTray'
import Shoe from '../common/Shoe'
import type { BlackjackGameState } from '../../types/blackjack'

interface Props {
  state: BlackjackGameState | null
  roundId?: string // the game round, so each round's cards are dealt fresh
  betAmount: number // chips on the bet spot
  stackAmount: number // the player's chips off the table
  message?: string
  controls: ReactNode
}

const statusNotes: Record<string, string> = { bust: 'Bust', blackjack: 'Blackjack!' }

// Real dealing order: player, dealer up card, player, dealer hole card; then
// the player's hits/double, then the hole card is turned (Card adds 100 to a
// reveal) and the dealer draws.
const playerOrder = (i: number) => (i < 2 ? i * 2 : 10 + i)
const dealerOrder = (i: number) => (i < 2 ? i * 2 + 1 : 200 + i)

// Felt table: dealer on top, player below, bet spot and the player's stack at the bottom.
export default function BlackjackTable({ state, roundId, betAmount, stackAmount, message, controls }: Props) {
  const hand = state?.players[0]?.hands?.[0]

  return (
    <div className="relative flex w-full max-w-4xl flex-col items-center gap-6 rounded-[3rem] border-8 border-amber-900 bg-gradient-to-b from-emerald-800 to-emerald-950 px-4 pb-8 pt-28 shadow-2xl sm:pt-8">
      {/* Dealer's side: discard tray on the left, the shoe on the right. */}
      <div className="absolute left-6 top-6 hidden sm:block">
        <DiscardTray />
      </div>
      {/* On phones the shoe sits above the dealer's cards instead of beside them. */}
      <div className="absolute right-6 top-4 origin-top-right scale-75 sm:right-8 sm:scale-100">
        <Shoe />
      </div>

      <CardRow label="Dealer" cards={state?.dealerHand.cards ?? []} value={state?.dealerHand.value} dealOrder={dealerOrder} roundKey={roundId} />

      <div className="h-8 text-center text-xl font-bold text-yellow-300">{message}</div>

      <CardRow
        label="You"
        cards={hand?.cards ?? []}
        value={hand?.value}
        note={hand ? statusNotes[hand.status] : undefined}
        labelPosition="bottom"
        dealOrder={playerOrder}
        roundKey={roundId}
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
