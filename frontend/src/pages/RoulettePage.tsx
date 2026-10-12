import { useMemo, useRef, useState } from 'react'
import GameShell from '../components/common/GameShell'
import ChipSelector from '../components/common/ChipSelector'
import ChipStack from '../components/common/ChipStack'
import RouletteWheel from '../components/roulette/RouletteWheel'
import BettingBoard from '../components/roulette/BettingBoard'
import RouletteControls from '../components/roulette/RouletteControls'
import { syncChips, useOfflineGame } from '../hooks/useOfflineGame'
import { numberColor } from '../utils/roulette'
import type { GameResponse } from '../api/game'
import type { RouletteGameState } from '../types/roulette'

interface Props { offline?: boolean }

export default function RoulettePage({ offline = false }: Props) {
  if (!offline) {
    return (
      <GameShell>
        <p className="mt-20 text-neutral-400">Online roulette is coming soon.</p>
      </GameShell>
    )
  }
  return <OfflineRoulette />
}

// One click on the board: `amount` chips on `spot`. Kept in order for Undo.
type Placement = { spot: string; amount: number }

const colorClass = { green: 'bg-emerald-600', red: 'bg-red-700', black: 'bg-neutral-900' }

function sumBySpot(placements: Placement[]) {
  const bets: Record<string, number> = {}
  for (const p of placements) bets[p.spot] = (bets[p.spot] ?? 0) + p.amount
  return bets
}

function OfflineRoulette() {
  // The balance is revealed only after the ball lands, so chips are synced manually.
  const { game, busy, error, setError, start, act } = useOfflineGame<RouletteGameState>('roulette', { autoSyncChips: false })
  const [chip, setChip] = useState(25)
  const [placements, setPlacements] = useState<Placement[]>([])
  const [lastPlacements, setLastPlacements] = useState<Placement[]>([])
  // Balance shown on the table. Frozen while the wheel spins so the result
  // isn't revealed before the ball lands; otherwise the game's balance.
  const [shownBalance, setShownBalance] = useState<number | null>(null)
  const [spin, setSpin] = useState<{ winning: number; id: number } | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [winning, setWinning] = useState<number | null>(null)
  const [message, setMessage] = useState('Pick a chip and place your bets')
  const [history, setHistory] = useState<number[]>([])
  const pending = useRef<GameResponse<RouletteGameState> | null>(null)

  const bets = useMemo(() => sumBySpot(placements), [placements])
  const totalBet = placements.reduce((s, p) => s + p.amount, 0)
  const balance = shownBalance ?? game?.chips ?? 0
  const available = balance - totalBet

  const place = (spot: string) => {
    if (chip > available) {
      setError(`Not enough chips for a ${chip} chip`)
      return
    }
    setError(null)
    if (winning !== null) setWinning(null) // a new round of betting
    setPlacements(p => [...p, { spot, amount: chip }])
  }

  const rebet = () => {
    const total = lastPlacements.reduce((s, p) => s + p.amount, 0)
    if (total > balance) {
      setError('Not enough chips to repeat the last bets')
      return
    }
    setWinning(null)
    setPlacements(lastPlacements)
  }

  const spinWheel = async () => {
    if (!game || totalBet === 0) return
    setShownBalance(balance)
    // Each spin is its own round; a finished one can't take bets.
    const current = game.state.phase === 'resolved' ? await start() : game
    if (!current) return
    const res = await act('spin', { bets: Object.entries(bets).map(([type, amount]) => ({ type, amount })) }, current.gameId)
    if (!res || res.state.winningNumber === undefined) {
      setShownBalance(null)
      return
    }

    pending.current = res
    setLastPlacements(placements)
    setWinning(null)
    setMessage('No more bets…')
    setSpinning(true)
    setSpin({ winning: res.state.winningNumber, id: Date.now() })
  }

  const onSpinEnd = () => {
    const res = pending.current
    if (!res || res.state.winningNumber === undefined) return
    const n = res.state.winningNumber
    const net = res.result?.amount ?? 0
    const color = numberColor(n)

    setSpinning(false)
    setWinning(n)
    setHistory(h => [n, ...h].slice(0, 12))
    setShownBalance(null) // reveal: back to the game's (new) balance
    syncChips(res.chips)
    setPlacements([])
    setMessage(
      `${n} ${color[0].toUpperCase()}${color.slice(1)} · ` +
        (net > 0 ? `You win +${net}` : net < 0 ? `You lose ${-net}` : 'You break even'),
    )
  }

  const locked = busy || spinning

  return (
    <GameShell>
      <div className="flex w-full max-w-6xl flex-col items-center gap-6 rounded-[2rem] border-8 border-amber-900 bg-gradient-to-b from-emerald-900 to-emerald-950 p-4 shadow-2xl sm:p-6">
        <div className="flex w-full flex-col items-center gap-6 lg:flex-row lg:items-start">
          <div className="flex w-full max-w-[360px] flex-col items-center gap-3">
            <RouletteWheel spin={spin} onSpinEnd={onSpinEnd} />
            <div className="flex min-h-7 flex-wrap justify-center gap-1" aria-label="Last numbers">
              {history.map((n, i) => (
                <span key={i} className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-1 ring-white/30 ${colorClass[numberColor(n)]} ${i === 0 ? 'ring-2 ring-yellow-300' : ''}`}>
                  {n}
                </span>
              ))}
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
            <div className="text-center text-xl font-bold text-yellow-300" aria-live="polite">
              {error ?? message}
            </div>
            <BettingBoard bets={bets} onPlace={place} disabled={locked} winningNumber={winning} />
          </div>
        </div>

        <div className="flex w-full flex-wrap items-end justify-around gap-6">
          <div className="flex flex-col items-center gap-3">
            <ChipSelector selected={chip} onSelect={setChip} max={available} disabled={locked} />
            <RouletteControls
              totalBet={totalBet}
              busy={locked}
              canRebet={lastPlacements.length > 0 && placements.length === 0}
              onUndo={() => setPlacements(p => p.slice(0, -1))}
              onClear={() => setPlacements([])}
              onRebet={rebet}
              onSpin={spinWheel}
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs uppercase tracking-widest text-white/60">Your chips</div>
            <ChipStack amount={Math.max(available, 0)} label={String(Math.max(available, 0))} />
          </div>
        </div>
      </div>
    </GameShell>
  )
}
