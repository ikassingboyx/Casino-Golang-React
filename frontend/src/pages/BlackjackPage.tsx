import { useEffect, useState } from 'react'
import GameShell from '../components/common/GameShell'
import DealProvider from '../components/common/DealProvider'
import { useDealing } from '../components/common/dealing'
import ChipSelector from '../components/common/ChipSelector'
import GameDock, { DockChips, DockStat } from '../components/common/GameDock'
import BlackjackTable from '../components/blackjack/BlackjackTable'
import { syncChips, useOfflineGame, type GameSession } from '../hooks/useOfflineGame'
import { useOnlineGame } from '../hooks/useRoom'
import { useAuthStore } from '../store/authStore'
import { IN_NEXT_ROUND, OUT_OF_CHIPS, WAITING_FOR_BETS, netResult } from '../utils/tableMessages'
import type { BlackjackGameState } from '../types/blackjack'

export default function BlackjackPage() {
  // The header balance is updated by hand, once the cards have landed.
  const session = useOfflineGame<BlackjackGameState>('blackjack', { autoSyncChips: false })
  return (
    <DealProvider>
      <Blackjack session={session} />
    </DealProvider>
  )
}

export function OnlineBlackjack() {
  const session = useOnlineGame<BlackjackGameState>()
  return (
    <DealProvider>
      <Blackjack session={session} />
    </DealProvider>
  )
}

function Blackjack({ session }: { session: GameSession<BlackjackGameState> }) {
  const { game, busy, error, start, act, online } = session
  const dealing = useDealing() // results, chips and buttons wait for the cards to land
  const user = useAuthStore(s => s.user)
  const [bet, setBet] = useState(0)

  const state = game?.state ?? null
  const players = state?.players ?? []
  const meIndex = players.findIndex(p => p.id === user?.id)
  const me = players[meIndex]
  const hand = me?.hands?.[0]
  const inHand = state?.phase === 'player_turns' && !!hand
  // Online: your bet is in and the others are still betting.
  const placed = state?.phase === 'betting' && !!hand
  const myTurn = inHand && state?.currentPlayerIndex === meIndex && hand?.status === 'playing'
  const turnName = state?.phase === 'player_turns' && !myTurn ? players[state.currentPlayerIndex]?.name : undefined
  // While the last cards of a finished round are still being dealt, keep the
  // table as it was before the payout so the result isn't given away.
  const revealing = dealing && !!game?.result && !!hand
  const chips = revealing ? (game?.chips ?? 0) - (game!.result!.amount + hand!.bet) : (game?.chips ?? 0)
  const showHand = inHand || revealing || placed

  // Cards register a moment after a response renders, so wait a beat; if
  // dealing starts the effect re-runs and this update is cancelled.
  useEffect(() => {
    if (!game || dealing) return
    const t = setTimeout(() => syncChips(game.chips), 60)
    return () => clearTimeout(t)
  }, [game, dealing])

  // The bet stays filled in for the next round unless it's no longer affordable.
  const [settled, setSettled] = useState<string>()
  if (game?.result && settled !== game.gameId) {
    setSettled(game.gameId)
    if (bet > game.chips) setBet(0)
  }

  const deal = async () => {
    // Offline a finished round can't take new bets; start the next one first.
    // Online the server deals the next round itself.
    const current = !online && state?.phase === 'resolved' ? await start() : game
    if (!current) return
    await act('bet', { amount: bet }, current.gameId)
  }

  const play = (action: 'hit' | 'stand' | 'double') => act(action)

  const locked = busy || dealing
  // Online you can bet while the table is taking bets and you haven't yet.
  const canBet = !online || (state?.phase === 'betting' && !!me && !hand)
  const dock = !game ? null : placed ? (
    <GameDock
      info={
        <>
          <DockChips amount={chips} />
          <DockStat label="Bet" value={hand?.bet ?? 0} accent />
        </>
      }
      actions={<span className="px-2 text-sm text-ivory/60">Waiting for the other bets…</span>}
    />
  ) : showHand ? (
    <GameDock
      info={
        <>
          <DockChips amount={chips} />
          <DockStat label="Bet" value={hand?.bet ?? 0} accent />
        </>
      }
      actions={
        <>
          <button onClick={() => play('hit')} disabled={locked || !myTurn} className="dock-primary">Hit</button>
          <button onClick={() => play('stand')} disabled={locked || !myTurn} className="dock-primary">Stand</button>
          <button onClick={() => play('double')} disabled={locked || !myTurn || !hand || hand.cards.length !== 2 || chips < hand.bet} className="dock-btn">
            Double
          </button>
        </>
      }
    />
  ) : (
    <GameDock
      info={
        <>
          <DockChips amount={chips - bet} />
          <DockStat label="Bet" value={bet} accent />
        </>
      }
      chips={<ChipSelector onSelect={v => setBet(b => b + v)} max={chips - bet} disabled={locked} />}
      actions={
        <>
          <button onClick={() => setBet(0)} disabled={locked || bet === 0} className="dock-btn">Clear</button>
          <button onClick={deal} disabled={locked || !canBet || bet <= 0 || bet > chips} className="dock-primary">{online ? 'Place bet' : 'Deal'}</button>
        </>
      }
    />
  )

  let message = error ?? ''
  if (!message && game?.result && !dealing) message = netResult(game.result.amount, 'Push')
  if (!message && state && !dealing) {
    if (online && !me) message = IN_NEXT_ROUND
    else if (placed) message = WAITING_FOR_BETS
    else if (myTurn && players.length > 1) message = 'Your turn'
    else if (turnName) message = `${turnName} to play`
  }

  if (!message && state && !hand && state.phase === 'betting') message = chips > 0 ? 'Place your bet' : OUT_OF_CHIPS

  return (
    <GameShell background="/assets/images/bg-blackjack.svg" dock={dock}>
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
