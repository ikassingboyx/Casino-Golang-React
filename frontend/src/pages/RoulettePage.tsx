import { useMemo, useRef, useState } from 'react'
import GameShell from '../components/common/GameShell'
import ChipSelector from '../components/common/ChipSelector'
import GameDock, { DockStat } from '../components/common/GameDock'
import PlayerSeat from '../components/common/PlayerSeat'
import { SEAT_COUNT, arrangeSeats } from '../components/common/seats'
import { TableSizeContext } from '../components/common/tableSize'
import RouletteWheel from '../components/roulette/RouletteWheel'
import BettingBoard from '../components/roulette/BettingBoard'
import { useElementSize } from '../hooks/useElementSize'
import { syncChips, useOfflineGame } from '../hooks/useOfflineGame'
import { useAuthStore } from '../store/authStore'
import { numberColor } from '../utils/roulette'
import type { GameResponse } from '../api/game'
import type { RouletteGameState } from '../types/roulette'

interface Props { offline?: boolean }

export default function RoulettePage({ offline = false }: Props) {
  if (!offline) {
    return (
      <GameShell title="Roulette">
        <p className="text-ivory/60">Online roulette is coming soon.</p>
      </GameShell>
    )
  }
  return <OfflineRoulette />
}

// One click on the board: `amount` chips on `spot`. Kept in order for Undo.
type Placement = { spot: string; amount: number }

const colorClass = { green: 'bg-jade', red: 'bg-banco', black: 'bg-[#1b1b1b]' }

const BOARD_ASPECT = 890 / 370 // board artwork width / height

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
  const [net, setNet] = useState<number | null>(null) // your result of the last spin
  const pending = useRef<GameResponse<RouletteGameState> | null>(null)
  const user = useAuthStore(s => s.user)
  const [area, box] = useElementSize<HTMLDivElement>()

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
    setNet(net)
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
  const result = winning !== null && placements.length === 0 && net !== null ? net : undefined

  // Fit the wheel and the board side by side (stacked on narrow screens),
  // leaving room under the board for the players' row.
  const pad = 24
  const seatsH = 64
  const w = box.width - pad * 2
  const h = box.height - pad * 2
  const stacked = w < 760
  const wheel = Math.max(0, stacked ? Math.min(w * 0.6, h * 0.36) : Math.min(h, w * 0.34, 520))
  const boardW = Math.max(0, stacked ? Math.min(w, (h - wheel - seatsH - 48) * BOARD_ASPECT) : Math.min(w - wheel - pad, (h - seatsH - 48) * BOARD_ASPECT))
  const u = Math.max(7, Math.min(boardW / 70, 13))

  const players = game?.state.players ?? []
  const me = players.find(p => p.id === user?.id) ?? players[0]
  const seats = arrangeSeats(players, me?.id, SEAT_COUNT)

  const dock = game && (
    <GameDock
      info={
        <>
          <DockStat label="Bet" value={totalBet} accent />
          <DockStat label="Balance" value={Math.max(available, 0)} />
        </>
      }
      chips={<ChipSelector selected={chip} onSelect={setChip} max={available} disabled={locked} />}
      actions={
        <>
          <button onClick={() => setPlacements(p => p.slice(0, -1))} disabled={locked || totalBet === 0} className="dock-btn">Undo</button>
          <button onClick={() => setPlacements([])} disabled={locked || totalBet === 0} className="dock-btn">Clear</button>
          <button onClick={rebet} disabled={locked || !(lastPlacements.length > 0 && placements.length === 0)} className="dock-btn">Rebet</button>
          <button onClick={spinWheel} disabled={locked || totalBet === 0} className="dock-primary">Spin</button>
        </>
      }
    />
  )

  return (
    <GameShell title="Roulette" dock={dock}>
      <div ref={area} className="table-rail h-full w-full max-w-[1500px] rounded-[2.5rem] p-3">
        <div className="table-felt flex h-full w-full items-center justify-center rounded-[2rem]" style={{ padding: pad - 12 }}>
          {box.width > 0 && (
            <div className={`flex items-center justify-center ${stacked ? 'flex-col' : 'flex-row'}`} style={{ gap: pad }}>
              <div className="flex flex-col items-center gap-2" style={{ width: wheel }}>
                <RouletteWheel spin={spin} onSpinEnd={onSpinEnd} />
                <div className="flex min-h-6 flex-wrap justify-center gap-1" aria-label="Last numbers">
                  {history.map((n, i) => (
                    <span key={i} className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ring-1 ring-ivory/30 ${colorClass[numberColor(n)]} ${i === 0 ? 'ring-2 !ring-brass-light' : ''}`}>
                      {n}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center gap-3" style={{ width: boardW }}>
                <div className="min-h-7 text-center text-lg font-bold text-ivory" aria-live="polite">
                  {error ?? message}
                </div>
                <BettingBoard bets={bets} onPlace={place} disabled={locked} winningNumber={winning} />
                <TableSizeContext.Provider value={{ width: boardW, height: boardW / BOARD_ASPECT, u, portrait: stacked }}>
                  <div className="flex w-full justify-between" style={{ height: seatsH }}>
                    {seats.map((p, i) => {
                      if (!p) return <PlayerSeat key={i} player={null} />
                      const mine = p.id === me?.id
                      return (
                        <PlayerSeat
                          key={i}
                          player={{ name: p.name, avatarUrl: mine ? user?.avatarUrl : null, chips: mine ? Math.max(available, 0) : p.chips }}
                          isYou={mine}
                          result={mine ? result : undefined}
                        />
                      )
                    })}
                  </div>
                </TableSizeContext.Provider>
              </div>
            </div>
          )}
        </div>
      </div>
    </GameShell>
  )
}
