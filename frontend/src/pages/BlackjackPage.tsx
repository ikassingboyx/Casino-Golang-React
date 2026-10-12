import { useState } from 'react'
import GameShell from '../components/common/GameShell'
import BetPanel from '../components/common/BetPanel'
import BlackjackTable from '../components/blackjack/BlackjackTable'
import BlackjackControls from '../components/blackjack/BlackjackControls'
import { useOfflineGame } from '../hooks/useOfflineGame'
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
  return <OfflineBlackjack />
}

function OfflineBlackjack() {
  const { game, busy, error, start, act } = useOfflineGame<BlackjackGameState>('blackjack')
  const [bet, setBet] = useState(0)

  const state = game?.state ?? null
  const chips = game?.chips ?? 0
  const hand = state?.players[0]?.hands?.[0]
  const inHand = state?.phase === 'player_turns'

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
  if (!message && game?.result) message = resultMessage(game.result.amount)
  if (!message && state && !hand) message = 'Place your bet'

  return (
    <GameShell>
      <BlackjackTable
        state={state}
        betAmount={inHand ? (hand?.bet ?? 0) : bet}
        stackAmount={inHand ? chips : chips - bet}
        message={message}
        controls={
          !game ? null : inHand ? (
            <BlackjackControls
              busy={busy}
              canDouble={!!hand && hand.cards.length === 2 && chips >= hand.bet}
              onHit={() => play('hit')}
              onStand={() => play('stand')}
              onDouble={() => play('double')}
            />
          ) : chips > 0 ? (
            <BetPanel bet={bet} chips={chips} busy={busy} onChange={setBet} onSubmit={deal} submitLabel="Deal" />
          ) : (
            <p className="text-neutral-300">You're out of chips.</p>
          )
        }
      />
    </GameShell>
  )
}
