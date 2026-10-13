import { useEffect, useState } from 'react'
import GameShell from '../components/common/GameShell'
import DealProvider from '../components/common/DealProvider'
import { useDealing } from '../components/common/dealing'
import ChipSelector from '../components/common/ChipSelector'
import GameDock, { DockStat } from '../components/common/GameDock'
import BlackjackTable from '../components/blackjack/BlackjackTable'
import { syncChips, useOfflineGame } from '../hooks/useOfflineGame'
import { useAuthStore } from '../store/authStore'
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
      <GameShell title="Blackjack">
        <p className="text-ivory/60">Online blackjack is coming soon.</p>
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
  const user = useAuthStore(s => s.user)
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

  const locked = busy || dealing
  const dock = !game ? null : showHand ? (
    <GameDock
      info={<DockStat label="Bet" value={hand?.bet ?? 0} accent />}
      actions={
        <>
          <button onClick={() => play('hit')} disabled={locked} className="dock-primary">Hit</button>
          <button onClick={() => play('stand')} disabled={locked} className="dock-primary">Stand</button>
          <button onClick={() => play('double')} disabled={locked || !hand || hand.cards.length !== 2 || chips < hand.bet} className="dock-btn">
            Double
          </button>
        </>
      }
    />
  ) : (
    <GameDock
      info={
        <>
          <DockStat label="Bet" value={bet} accent />
          <DockStat label="Balance" value={chips - bet} />
        </>
      }
      chips={<ChipSelector onSelect={v => setBet(b => b + v)} max={chips - bet} disabled={locked} />}
      actions={
        <>
          <button onClick={() => setBet(0)} disabled={locked || bet === 0} className="dock-btn">Clear</button>
          <button onClick={deal} disabled={locked || bet <= 0 || bet > chips} className="dock-primary">Deal</button>
        </>
      }
    />
  )

  if (!message && state && !hand) message = chips > 0 ? 'Place your bet' : "You're out of chips."

  return (
    <GameShell title="Blackjack" dock={dock}>
      <BlackjackTable
        state={state}
        roundId={game?.gameId}
        myId={user?.id}
        myAvatar={user?.avatarUrl}
        myBet={showHand ? (hand?.bet ?? 0) : bet}
        myChips={showHand ? chips : chips - bet}
        myResult={game?.result && !dealing && state?.phase === 'resolved' ? game.result.amount : undefined}
        message={message}
      />
    </GameShell>
  )
}
