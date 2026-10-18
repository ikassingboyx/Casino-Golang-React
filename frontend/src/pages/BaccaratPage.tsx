import { useEffect, useMemo, useState } from 'react'
import GameShell from '../components/common/GameShell'
import DealProvider from '../components/common/DealProvider'
import ChipSelector from '../components/common/ChipSelector'
import { useDealing } from '../components/common/dealing'
import BaccaratTable from '../components/baccarat/BaccaratTable'
import GameDock, { DockChips, DockStat } from '../components/common/GameDock'
import type { SettleStage } from '../components/baccarat/BetAreas'
import { syncChips, useOfflineGame, type GameSession } from '../hooks/useOfflineGame'
import { useOnlineGame } from '../hooks/useRoom'
import { useAuthStore } from '../store/authStore'
import { IN_NEXT_ROUND, OUT_OF_CHIPS, WAITING_FOR_BETS, netResult } from '../utils/tableMessages'
import { RESULT_LABEL, handTotal, isNatural } from '../utils/baccarat'
import type { GameResponse } from '../api/game'
import type { BaccaratBets, BaccaratGameState, BaccaratResult, BaccaratSpot } from '../types/baccarat'

export default function BaccaratPage() {
  // The balance is revealed only once the chips are settled, so it is synced manually.
  const session = useOfflineGame<BaccaratGameState>('baccarat', { autoSyncChips: false })
  return (
    <DealProvider>
      <Baccarat session={session} />
    </DealProvider>
  )
}

export function OnlineBaccarat() {
  const session = useOnlineGame<BaccaratGameState>()
  return (
    <DealProvider>
      <Baccarat session={session} />
    </DealProvider>
  )
}

// One click on a spot: `amount` chips on `spot`. Kept in order for Undo.
type Placement = { spot: BaccaratSpot; amount: number }

// A coup on the table goes: dealing (first four cards, then any third cards
// one at a time) → settle stages of the chips (see BetAreas) → done, where
// the cards stay up until the next deal.
type Stage = 'betting' | 'dealing' | Exclude<SettleStage, 'none'> | 'done'

// Pauses between the steps of a coup, in ms.
const BEFORE_DRAW = 900
const BEFORE_RESULT = 600
const SHOW_RESULT = 1300
const SHOW_PAYOUT = 1200
const COLLECT = 700

function sumBySpot(placements: Placement[]): BaccaratBets {
  const bets = { player: 0, banker: 0, tie: 0 }
  for (const p of placements) bets[p.spot] += p.amount
  return bets
}

function Baccarat({ session }: { session: GameSession<BaccaratGameState> }) {
  const { game, busy, error, setError, start, act, online } = session
  const dealing = useDealing()
  const user = useAuthStore(s => s.user)
  const [chip, setChip] = useState(25)
  const [placements, setPlacements] = useState<Placement[]>([])
  const [lastPlacements, setLastPlacements] = useState<Placement[]>([])
  // Balance shown on the table, frozen from the deal until the chips are settled.
  const [shownBalance, setShownBalance] = useState<number | null>(null)
  const [coup, setCoup] = useState<GameResponse<BaccaratGameState> | null>(null) // the round on the table
  const [shown, setShown] = useState({ player: 0, banker: 0 }) // cards dealt so far
  const [stage, setStage] = useState<Stage>('betting')
  const [history, setHistory] = useState<BaccaratResult[]>([])

  const bets = useMemo(() => sumBySpot(placements), [placements])
  const totalBet = placements.reduce((s, p) => s + p.amount, 0)
  const balance = shownBalance ?? game?.chips ?? 0
  const available = balance - totalBet
  const meOnServer = game?.state.players.find(p => p.id === user?.id)
  const staked = (b?: BaccaratBets) => (b ? b.player + b.banker + b.tie : 0)
  // Online: your bets are in and the others are still betting.
  const placed = online && game?.state.phase === 'betting' && staked(meOnServer?.bets) > 0
  const canBet = (stage === 'betting' || stage === 'done') && (!online || (game?.state.phase === 'betting' && !!meOnServer && !placed))
  const locked = busy || !canBet

  // A dealt coup (from your deal, or online once the whole table has bet)
  // goes on the table and is played out step by step.
  if (game?.state.result && coup?.gameId !== game.gameId) {
    setCoup(game)
    setShown({ player: 2, banker: 2 })
    setStage('dealing')
    // Chips you put out but never sent don't take part.
    if (staked(game.state.players.find(p => p.id === user?.id)?.bets) === 0) setPlacements([])
  }

  const playerHand = coup?.state.playerHand
  const bankerHand = coup?.state.bankerHand
  const decided = stage === 'reveal' || stage === 'pay' || stage === 'collect' || stage === 'done'

  // Steps the coup forward each time the cards on the table have landed.
  // Cards register a moment after they render, so every step waits; if
  // dealing starts first the effect re-runs and the step is cancelled.
  useEffect(() => {
    if (!coup || dealing) return
    const { playerHand: p, bankerHand: b, result } = coup.state
    let wait = 0
    let step: () => void
    if (stage === 'dealing') {
      if (shown.player < p.cards.length) {
        wait = BEFORE_DRAW
        step = () => setShown(s => ({ ...s, player: s.player + 1 }))
      } else if (shown.banker < b.cards.length) {
        wait = BEFORE_DRAW
        step = () => setShown(s => ({ ...s, banker: s.banker + 1 }))
      } else {
        wait = BEFORE_RESULT
        step = () => {
          setStage('reveal')
          if (result) setHistory(h => [...h, result])
        }
      }
    } else if (stage === 'reveal') {
      wait = SHOW_RESULT
      step = () => setStage('pay')
    } else if (stage === 'pay') {
      wait = SHOW_PAYOUT
      step = () => setStage('collect')
    } else if (stage === 'collect') {
      wait = COLLECT
      step = () => {
        setStage('done')
        setPlacements([])
        setShownBalance(null)
        syncChips(coup.chips)
      }
    } else {
      return
    }
    const t = setTimeout(step, wait)
    return () => clearTimeout(t)
  }, [coup, dealing, stage, shown])

  const place = (spot: BaccaratSpot) => {
    if (chip > available) {
      setError(`Not enough chips for a ${chip} chip`)
      return
    }
    setError(null)
    setPlacements(p => [...p, { spot, amount: chip }])
  }

  const rebet = () => {
    const total = lastPlacements.reduce((s, p) => s + p.amount, 0)
    if (total > balance) {
      setError('Not enough chips to repeat the last bets')
      return
    }
    setError(null)
    setPlacements(lastPlacements)
  }

  const deal = async () => {
    if (!game || totalBet === 0) return
    // Keep showing the balance from before the bets until they are settled.
    setShownBalance(balance)
    // Offline each coup is its own round; a finished one can't take bets.
    const current = !online && game.state.phase === 'resolved' ? await start() : game
    const res = current && (await act('deal', { bets: Object.entries(bets).filter(([, a]) => a > 0).map(([type, amount]) => ({ type, amount })) }, current.gameId))
    if (!res) {
      setShownBalance(null)
      return
    }
    setLastPlacements(placements)
  }

  let message = error ?? ''
  if (!message && coup && playerHand && bankerHand && stage !== 'betting') {
    const pt = handTotal(playerHand.cards)
    const bt = handTotal(bankerHand.cards)
    const result = coup.state.result!
    if (decided) {
      message = result === 'tie' ? `Tie ${pt} – ${bt}` : `${RESULT_LABEL[result]} wins ${Math.max(pt, bt)} to ${Math.min(pt, bt)}`
      const net = coup.result?.amount ?? 0
      const played = staked(coup.state.players.find(p => p.id === user?.id)?.bets) > 0
      if (stage !== 'reveal' && played) message += ' · ' + netResult(net, 'Bets returned')
    } else if (dealing) {
      message = shown.banker > 2 ? 'Banker draws' : shown.player > 2 ? 'Player draws' : 'No more bets'
    } else if (shown.player < playerHand.cards.length) {
      message = `Player draws on ${handTotal(playerHand.cards.slice(0, 2))}`
    } else if (shown.banker < bankerHand.cards.length) {
      message = `Banker draws on ${handTotal(bankerHand.cards.slice(0, 2))}`
    } else if (isNatural(playerHand.cards) || isNatural(bankerHand.cards)) {
      message = 'Natural!'
    } else if (shown.banker > 2) {
      message = 'Banker draws'
    } else {
      message = shown.player > 2 ? `Banker stands on ${bt}` : 'Both stand'
    }
  }
  if (!message && !game) message = busy ? 'Opening the table…' : ''
  if (!message && placed) message = WAITING_FOR_BETS
  if (!message && online && game && !meOnServer) message = IN_NEXT_ROUND
  if (!message && game && canBet) message = balance > 0 || totalBet > 0 ? 'Pick a chip and place your bets' : OUT_OF_CHIPS

  const stack = game ? Math.max(available, 0) : null
  const settled = stage === 'pay' || stage === 'collect' || (stage === 'done' && placements.length === 0)

  const dock = game && (
    <GameDock
      info={
        <>
          <DockChips amount={stack ?? 0} />
          <DockStat label="Bet" value={totalBet} accent />
        </>
      }
      chips={<ChipSelector selected={chip} onSelect={setChip} max={available} disabled={locked} />}
      actions={
        <>
          <button onClick={() => setPlacements(p => p.slice(0, -1))} disabled={locked || totalBet === 0} className="dock-btn">Undo</button>
          <button onClick={() => setPlacements([])} disabled={locked || totalBet === 0} className="dock-btn">Clear</button>
          <button onClick={rebet} disabled={locked || !(lastPlacements.length > 0 && placements.length === 0)} className="dock-btn">Rebet</button>
          <button onClick={deal} disabled={locked || totalBet === 0} className="dock-primary">{online ? 'Place bets' : 'Deal'}</button>
        </>
      }
    />
  )

  return (
    <GameShell background="/assets/images/bg-baccarat.svg" dock={dock}>
      <BaccaratTable
        playerCards={playerHand?.cards.slice(0, shown.player) ?? []}
        bankerCards={bankerHand?.cards.slice(0, shown.banker) ?? []}
        roundId={coup?.gameId}
        result={decided ? coup?.state.result : undefined}
        settle={stage === 'reveal' || stage === 'pay' || stage === 'collect' ? stage : 'none'}
        bets={bets}
        payouts={coup?.state.players.find(p => p.id === user?.id)?.payouts}
        betsLocked={locked}
        onPlace={place}
        players={(coup ?? game)?.state.players ?? []}
        myId={user?.id}
        myAvatar={user?.avatarUrl}
        myChips={stack}
        myResult={coup && settled ? (coup.result?.amount ?? 0) : undefined}
        history={history}
        message={message}
      />
    </GameShell>
  )
}
