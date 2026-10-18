import { useCallback, useEffect, useState } from 'react'
import GameShell from '../components/common/GameShell'
import DealProvider from '../components/common/DealProvider'
import { useDealing } from '../components/common/dealing'
import PokerControls from '../components/poker/PokerControls'
import PokerTable, { type Flight, type SeatControls } from '../components/poker/PokerTable'
import { syncChips, useOfflineGame, type GameSession } from '../hooks/useOfflineGame'
import { addBot, removeBot, useOnlineGame } from '../hooks/useRoom'
import { useRoomStore } from '../store/roomStore'
import { useAuthStore } from '../store/authStore'
import { describeEvent, replay, withHand } from '../utils/poker'
import type { PokerAction, PokerEvent, PokerGameState } from '../types/poker'

const BACKGROUND = '/assets/images/bg-poker.svg'

export default function PokerPage() {
  // The balance in the header is synced once a hand is paid out.
  const session = useOfflineGame<PokerGameState>('poker', { autoSyncChips: false })
  return (
    <DealProvider>
      <Poker session={session} />
    </DealProvider>
  )
}

export function OnlinePoker() {
  const session = useOnlineGame<PokerGameState>()
  const room = useRoomStore(s => s.room)
  const userId = useAuthStore(s => s.user?.id)
  const [notice, setNotice] = useState<string | null>(null)
  const clearNotice = useCallback(() => setNotice(null), [])

  // The host seats and removes bots; changes apply from the next hand.
  const report = async (request: Promise<string | null>, done: string) => setNotice((await request) ?? done)
  const seatControls: SeatControls | undefined =
    room && room.hostId === userId
      ? {
          open: room.maxPlayers - room.players.length,
          onAddBot: () => report(addBot(), 'A bot joins from the next hand'),
          botIds: room.players.filter(p => p.isBot).map(p => p.userId),
          onRemoveBot: id => report(removeBot(id), 'The bot leaves after this hand'),
        }
      : undefined

  return (
    <DealProvider>
      <Poker session={session} seatControls={seatControls} notice={notice} onNoticeShown={clearNotice} />
    </DealProvider>
  )
}

// After the last action of a hand: showdown (hands turned up) → payout (the
// pot slides to the winners) → done (results shown, next hand can be dealt).
type Stage = 'play' | 'reveal' | 'payout' | 'done'

// Pauses between the steps the table shows, in ms.
const BOT_THINK = 750
const AFTER_BLIND = 350
const AFTER_YOU = 150
const BEFORE_STREET = 550
const SWEEP = 500
const BEFORE_SHOWDOWN = 600
const SHOWDOWN = 2000
const PAYOUT = 900

const PLAYER_MOVES = new Set<PokerEvent['action']>(['fold', 'check', 'call', 'raise', 'bet', 'all_in'])
const STREETS = new Set<PokerEvent['action']>(['flop', 'turn', 'river'])

// Each server response holds the whole hand so far (state.log); the table
// replays the new steps one at a time, so the bots' turns and the streets
// they lead to are seen as they happen rather than all at once. Online the
// server deals each hand; offline you deal the next one.
interface PokerProps {
  session: GameSession<PokerGameState>
  seatControls?: SeatControls
  notice?: string | null // a short note shown on the table for a moment
  onNoticeShown?: () => void
}

function Poker({ session, seatControls, notice, onNoticeShown }: PokerProps) {
  const { game, busy, error, start, act, online } = session
  const dealing = useDealing()
  const user = useAuthStore(s => s.user)
  const [hand, setHand] = useState<{ id?: string; shown: number; stage: Stage }>({ shown: 0, stage: 'play' })
  const [flights, setFlights] = useState<Flight[]>([])

  const state = game?.state ?? null
  // A new hand starts its replay from the first event.
  if (game && game.gameId !== hand.id) {
    setHand({ id: game.gameId, shown: 0, stage: 'play' })
    setFlights([])
  }

  const log = state?.log ?? []
  const shown = Math.min(hand.id === game?.gameId ? hand.shown : 0, log.length)
  const stage = hand.id === game?.gameId ? hand.stage : 'play'
  const caughtUp = shown >= log.length
  const finished = state?.status === 'finished'
  const view = state ? replay(state, shown) : null
  const next = log[shown]
  const nextBy = next?.playerId ? state?.players.find(p => p.id === next.playerId) : undefined
  // Online, whoever's turn it is is thinking too.
  const toAct = caughtUp && !finished && state && state.currentTurnIndex >= 0 ? state.players[state.currentTurnIndex] : undefined
  const thinkingId =
    !dealing && next && nextBy?.isBot && PLAYER_MOVES.has(next.action) ? nextBy.id
    : online && !dealing && toAct && toAct.id !== user?.id ? toAct.id
    : null
  const contested = view ? Object.values(view.seats).filter(s => s.status === 'active' || s.status === 'all_in').length > 1 : false

  // Steps the table forward: the next event of the log, then the end of the
  // hand. Cards register a moment after they render, so every step waits;
  // if dealing starts first the effect re-runs and the step is cancelled.
  useEffect(() => {
    if (!state || dealing) return
    let wait: number
    let step: () => void
    if (shown < state.log.length) {
      const e = state.log[shown]
      const by = state.players.find(p => p.id === e.playerId)
      wait =
        by?.isBot && PLAYER_MOVES.has(e.action) ? BOT_THINK
        : STREETS.has(e.action) ? BEFORE_STREET
        : e.action === 'collect' ? SWEEP
        : e.action.endsWith('blind') ? AFTER_BLIND
        : AFTER_YOU
      step = () => {
        if (e.action === 'collect') {
          const bets = replay(state, shown).seats
          setFlights(f => [
            ...f,
            ...Object.entries(bets)
              .filter(([, s]) => s.bet > 0)
              .map(([id, s]) => ({ id: `${state.gameId}:${shown}:${id}`, amount: s.bet, from: { bet: id }, to: 'pot' as const })),
          ])
        }
        setHand(h => ({ ...h, shown: h.shown + 1 }))
      }
    } else if (state.status === 'finished' && stage !== 'done') {
      if (stage === 'play') {
        wait = BEFORE_SHOWDOWN
        step = () => setHand(h => ({ ...h, stage: contested ? 'reveal' : 'payout' }))
      } else if (stage === 'reveal') {
        wait = SHOWDOWN
        step = () => setHand(h => ({ ...h, stage: 'payout' }))
      } else {
        wait = PAYOUT
        step = () => {
          setHand(h => ({ ...h, stage: 'done' }))
          if (game) syncChips(game.chips)
        }
      }
    } else {
      return
    }
    const t = setTimeout(step, wait)
    return () => clearTimeout(t)
  }, [state, game, shown, dealing, stage, contested])

  // The pot is pushed to the winners as the payout starts.
  const [paidFor, setPaidFor] = useState<string>()
  if (state && stage === 'payout' && paidFor !== state.gameId) {
    setPaidFor(state.gameId)
    setFlights(f => [
      ...f,
      ...state.players
        .filter(p => (p.won ?? 0) > 0)
        .map((p, i) => ({ id: `${state.gameId}:won:${p.id}`, amount: p.won!, from: 'pot' as const, to: { plate: p.id }, delay: i * 0.15 })),
    ])
  }

  const onFlightDone = useCallback((id: string) => setFlights(f => f.filter(x => x.id !== id)), [])

  // What the table shows: after the payout the pot is gone and the stacks are final.
  const paid = stage === 'payout' || stage === 'done'
  const table = view && state && paid
    ? {
        ...view,
        pot: 0,
        seats: Object.fromEntries(
          Object.entries(view.seats).map(([id, s]) => [id, { ...s, label: undefined, chips: stage === 'done' ? (state.players.find(p => p.id === id)?.chips ?? s.chips) : s.chips }]),
        ),
      }
    : view

  // Online, someone who joined mid-hand watches until the next one.
  const meIndex = state?.players.findIndex(p => p.id === user?.id) ?? -1
  const me = online ? state?.players[meIndex] : state?.players[Math.max(0, meIndex)]
  const mySeat = me ? table?.seats[me.id] : undefined
  const streetBets = table ? Object.values(table.seats).reduce((n, s) => n + s.bet, 0) : 0
  const yourTurn = caughtUp && !finished && (state?.validActions?.length ?? 0) > 0
  const toCall = state && mySeat ? Math.max(0, state.currentBet - mySeat.bet) : 0

  const results =
    stage === 'done' && state
      ? Object.fromEntries(state.players.filter(p => p.status !== 'out' && (p.id === me?.id || p.chips !== p.startChips)).map(p => [p.id, p.chips - p.startChips]))
      : undefined

  // A notice stays up for a few seconds.
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => onNoticeShown?.(), 2500)
    return () => clearTimeout(t)
  }, [notice, onNoticeShown])

  let message = error ?? notice ?? ''
  if (!message && !game) message = busy ? 'Shuffling up…' : ''
  if (!message && online && state && !me) message = "You're in from the next hand"
  if (!message && state && finished && stage !== 'play') {
    const name = (id: string) => (id === me?.id ? 'You' : (state.players.find(p => p.id === id)?.name ?? ''))
    message = (state.winners ?? [])
      .map(id => {
        const p = state.players.find(x => x.id === id)!
        const verb = id === me?.id ? 'win' : 'wins'
        return `${name(id)} ${verb} ${(p.won ?? 0).toLocaleString()}${contested && p.handRank ? ` with ${withHand(p.handRank)}` : ''}`
      })
      .join(' · ')
  } else if (!message && yourTurn) {
    message = toCall > 0 ? `Your turn · ${toCall.toLocaleString()} to call` : 'Your turn'
  } else if (!message && state && shown > 0) {
    const last = state.log[shown - 1]
    const who = last.playerId === me?.id ? 'You' : (state.players.find(p => p.id === last.playerId)?.name ?? '')
    message = describeEvent(last, who, replay(state, shown - 1).currentBet)
    if (who === 'You') message = message.replace(/^You (\w+)s\b/, 'You $1').replace(/^You is\b/, 'You are')
  }

  const onAct = (action: PokerAction, amount?: number) => act(action, amount !== undefined ? { amount } : undefined)

  const dock = game && state && table && mySeat && (
    <PokerControls
      chips={mySeat.chips}
      myBet={mySeat.bet}
      currentBet={table.currentBet}
      minRaise={state.minRaise}
      pot={table.pot + streetBets}
      actions={yourTurn ? (state.validActions ?? []) : []}
      disabled={busy || dealing}
      handOver={!online && finished && stage === 'done'}
      onAct={onAct}
      onNextHand={() => start()}
    />
  )

  return (
    <GameShell background={BACKGROUND} dock={dock}>
      <PokerTable
        state={state}
        view={table}
        roundId={game?.gameId}
        myId={me?.id}
        myAvatar={user?.avatarUrl}
        holeCardsDealt={shown >= 2}
        reveal={finished && stage !== 'play' && contested}
        thinkingId={thinkingId}
        yourTurn={yourTurn}
        myHandRank={caughtUp && !finished ? me?.handRank : undefined}
        winners={finished && stage !== 'play' ? state?.winners : undefined}
        results={results}
        flights={flights}
        onFlightDone={onFlightDone}
        message={message}
        seatControls={seatControls}
      />
    </GameShell>
  )
}
