import { useEffect, useState } from 'react'
import GameShell from '../components/common/GameShell'
import DealProvider from '../components/common/DealProvider'
import { useDealing } from '../components/common/dealing'
import BetPanel from '../components/common/BetPanel'
import BlackjackTable from '../components/blackjack/BlackjackTable'
import BlackjackControls from '../components/blackjack/BlackjackControls'
import { syncChips, useOfflineGame } from '../hooks/useOfflineGame'
import type { BlackjackGameState } from '../types/blackjack'

interface Props { offline?: boolean }

function resultMessage(amount: number) {
  if (amount > 0) return `You win +${amount}`
  if (amount < 0) return `You lose ${-amount}`
  return 'Push'
}

export default function BlackjackPage({ offline = false }: Props) {
  if (!offline) {
    return (
      <GameShell>
        <p className="mt-20 text-neutral-400">Online blackjack is coming soon.</p>
      </GameShell>
    )
  }
  return (
    <DealProvider>
      <OfflineBlackjack />
    </DealProvider>
  )
}

function OfflineBlackjack() {
  // The header balance is updated by hand, once the cards have landed.
  const { game, busy, error, start, act } = useOfflineGame<BlackjackGameState>('blackjack', { autoSyncChips: false })
  const dealing = useDealing() // results, chips and buttons wait for the cards to land
  const [bet, setBet] = useState(0)

  const state = game?.state ?? null
  const hand = state?.players[0]?.hands?.[0]
  const inHand = state?.phase === 'player_turns'
  // While the last cards of a finished round are still being dealt, keep the
  // table as it was before the payout so the result isn't given away.
  const revealing = dealing && !!game?.result && !!hand
  const chips = revealing ? (game?.chips ?? 0) - (game!.result!.amount + hand!.bet) : (game?.chips ?? 0)
  const showHand = inHand || revealing

  // Cards register a moment after a response renders, so wait a beat; if
  // dealing starts the effect re-runs and this update is cancelled.
  useEffect(() => {
    if (!game || dealing) return
    const t = setTimeout(() => syncChips(game.chips), 60)
    return () => clearTimeout(t)
  }, [game, dealing])

  const deal = async () => {
    // A finished round can't take new bets; start the next one first.
    const current = state?.phase === 'resolved' ? await start() : game
    if (!current) return
    const res = await act('bet', { amount: bet }, current.gameId)
    if (res?.result) keepBetIfAffordable(res.chips)
  }

  const play = async (action: 'hit' | 'stand' | 'double') => {
    const res = await act(action)
    if (res?.result) keepBetIfAffordable(res.chips)
  }

  // The bet stays filled in for the next round unless it's no longer affordable.
  const keepBetIfAffordable = (balance: number) => {
    if (bet > balance) setBet(0)
  }

  let message = error ?? ''
  if (!message && game?.result && !dealing) message = resultMessage(game.result.amount)
  if (!message && state && !hand) message = 'Place your bet'

  return (
    <GameShell>
      <BlackjackTable
        state={state}
        roundId={game?.gameId}
        betAmount={showHand ? (hand?.bet ?? 0) : bet}
        stackAmount={showHand ? chips : chips - bet}
        message={message}
        controls={
          !game ? null : showHand ? (
            <BlackjackControls
              busy={busy || dealing}
              canDouble={!!hand && hand.cards.length === 2 && chips >= hand.bet}
              onHit={() => play('hit')}
              onStand={() => play('stand')}
              onDouble={() => play('double')}
            />
          ) : chips > 0 ? (
            <BetPanel bet={bet} chips={chips} busy={busy || dealing} onChange={setBet} onSubmit={deal} submitLabel="Deal" />
          ) : (
            <p className="text-neutral-300">You're out of chips.</p>
          )
        }
      />
    </GameShell>
  )
}
