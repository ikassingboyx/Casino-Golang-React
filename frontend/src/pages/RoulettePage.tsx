import { useMemo, useState } from 'react'
import GameShell from '../components/common/GameShell'
import ChipSelector from '../components/common/ChipSelector'
import GameDock, { DockChips, DockStat } from '../components/common/GameDock'
import PlayerSeat from '../components/common/PlayerSeat'
import { SEAT_COUNT, arrangeSeats } from '../components/common/seats'
import { TableSizeContext } from '../components/common/tableSize'
import RouletteWheel from '../components/roulette/RouletteWheel'
import BettingBoard from '../components/roulette/BettingBoard'
import { useElementSize } from '../hooks/useElementSize'
import { syncChips, useOfflineGame, type GameSession } from '../hooks/useOfflineGame'
import { useOnlineGame } from '../hooks/useRoom'
import { useAuthStore } from '../store/authStore'
import { IN_NEXT_ROUND, WAITING_FOR_BETS, netResult } from '../utils/tableMessages'
import { numberColor } from '../utils/roulette'
import type { GameResponse } from '../api/game'
import type { RouletteGameState } from '../types/roulette'

export default function RoulettePage() {
  // The balance is revealed only after the ball lands, so chips are synced manually.
  const session = useOfflineGame<RouletteGameState>('roulette', { autoSyncChips: false })
  return <Roulette session={session} />
}

export function OnlineRoulette() {
  return <Roulette session={useOnlineGame<RouletteGameState>()} />
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

function Roulette({ session }: { session: GameSession<RouletteGameState> }) {
  const { game, busy, error, setError, start, act, online } = session
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
  const [pending, setPending] = useState<GameResponse<RouletteGameState> | null>(null) // the spin on the wheel
  const user = useAuthStore(s => s.user)
  const [area, box] = useElementSize<HTMLDivElement>()

  const bets = useMemo(() => sumBySpot(placements), [placements])
  const totalBet = placements.reduce((s, p) => s + p.amount, 0)
  const balance = shownBalance ?? game?.chips ?? 0
  const available = balance - totalBet
  const meOnServer = game?.state.players.find(p => p.id === user?.id)
  // Online: your bets are in and the others are still betting.
  const placed = online && game?.state.phase === 'betting' && (meOnServer?.bets.length ?? 0) > 0
  const canBet = !online || (game?.state.phase === 'betting' && !!meOnServer && !placed)

  // A spin (yours, or online once the whole table has bet) sets the wheel going.
  const st = game?.state
  if (game && st?.phase === 'resolved' && st.winningNumber !== undefined && pending?.gameId !== game.gameId) {
    setPending(game)
    setWinning(null)
    setMessage('No more bets…')
    setSpinning(true)
    setSpin(s => ({ winning: st.winningNumber!, id: (s?.id ?? 0) + 1 }))
    // Chips you put out but never sent don't take part.
    if (!st.players.find(p => p.id === user?.id)?.bets.length) setPlacements([])
  }

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
    // Keep showing the balance from before the bets until the ball lands.
    setShownBalance(balance)
    // Offline each spin is its own round; a finished one can't take bets.
    const current = !online && game.state.phase === 'resolved' ? await start() : game
    if (!current) return
    const res = await act('spin', { bets: Object.entries(bets).map(([type, amount]) => ({ type, amount })) }, current.gameId)
    if (!res) {
      setShownBalance(null)
      return
    }
    setLastPlacements(placements)
  }

  const onSpinEnd = () => {
    const res = pending
    if (!res || res.state.winningNumber === undefined) return
    const n = res.state.winningNumber
    const net = res.result?.amount ?? 0
    const color = numberColor(n)
    const played = !!res.state.players.find(p => p.id === user?.id)?.bets.length

    setSpinning(false)
    setWinning(n)
    setNet(net)
    setHistory(h => [n, ...h].slice(0, 12))
    setShownBalance(null) // reveal: back to the game's (new) balance
    syncChips(res.chips)
    setPlacements([])
    const name = `${n} ${color[0].toUpperCase()}${color.slice(1)}`
    setMessage(!played ? name : `${name} · ${netResult(net, 'You break even')}`)
  }

  const locked = busy || spinning || !canBet
  const result = winning !== null && placements.length === 0 && net !== null ? net : undefined
  let shownMessage = error ?? message
  if (!error && !spinning) {
    if (placed) shownMessage = WAITING_FOR_BETS
    else if (online && game && !meOnServer) shownMessage = IN_NEXT_ROUND
  }

  // Fit the wheel and the board side by side (stacked on narrow screens),
  // leaving room under the board for the players' row.
  const pad = 24
  const seatsH = 64
  const rail = 24 // the rail around the felt
  const w = Math.min(box.width - pad * 2 - rail - 96, 1280) // 48px each side for the close button
  const h = box.height - pad * 2 - rail
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
          <DockChips amount={Math.max(available, 0)} />
          <DockStat label="Bet" value={totalBet} accent />
        </>
      }
      chips={<ChipSelector selected={chip} onSelect={setChip} max={available} disabled={locked} />}
      actions={
        <>
          <button onClick={() => setPlacements(p => p.slice(0, -1))} disabled={locked || totalBet === 0} className="dock-btn">Undo</button>
          <button onClick={() => setPlacements([])} disabled={locked || totalBet === 0} className="dock-btn">Clear</button>
          <button onClick={rebet} disabled={locked || !(lastPlacements.length > 0 && placements.length === 0)} className="dock-btn">Rebet</button>
          <button onClick={spinWheel} disabled={locked || totalBet === 0} className="dock-primary">{online ? 'Place bets' : 'Spin'}</button>
        </>
      }
    />
  )

  return (
    <GameShell background="/assets/images/bg-roulette.svg" dock={dock}>
      {/* Measures the space; the table itself is only as big as what's on it, so the room shows around it. */}
      <div ref={area} className="flex h-full w-full items-center justify-center">
        <div className="table-rail rounded-[2.5rem] p-3">
          <div className="table-felt flex items-center justify-center rounded-[2rem]" style={{ padding: pad - 12 }}>
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
                  {shownMessage}
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
      </div>
    </GameShell>
  )
}
