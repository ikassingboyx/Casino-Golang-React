import { useState, type ComponentType } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/common/PlayerSeat'
import { useCountdown } from '../hooks/useCountdown'
import { addBot, removeBot, useRoom } from '../hooks/useRoom'
import { useAuthStore } from '../store/authStore'
import { useRoomStore } from '../store/roomStore'
import { formatChips } from '../utils/chipUtils'
import { GAME_NAMES, inviteLink } from '../utils/games'
import { OnlineBaccarat } from './BaccaratPage'
import { OnlineBlackjack } from './BlackjackPage'
import { OnlinePoker } from './PokerPage'
import { OnlineRoulette } from './RoulettePage'
import type { GameType } from '../types/game'
import type { Room } from '../types/room'

const ONLINE_GAMES: Record<GameType, ComponentType> = {
  blackjack: OnlineBlackjack,
  poker: OnlinePoker,
  baccarat: OnlineBaccarat,
  roulette: OnlineRoulette,
}

// An online table at /room/:code — the link players share. Opening it joins
// the table; leaving the page leaves it. Until the host starts, this is the
// waiting room; then it is the game.
export default function RoomPage() {
  const { code = '' } = useParams()
  const { start } = useRoom(code)
  const room = useRoomStore(s => s.room)
  const fatal = useRoomStore(s => s.fatal)

  if (fatal) {
    return (
      <Backdrop>
        <Panel>
          <h1 className="font-felt text-3xl text-brass-light">Can't join this table</h1>
          <p className="text-ivory/75">{fatal}</p>
          <Link to="/lobby" className="dock-primary self-start">Back to the lobby</Link>
        </Panel>
      </Backdrop>
    )
  }
  if (!room) {
    return (
      <Backdrop>
        <p className="animate-pulse text-ivory/70">Joining table {code}…</p>
      </Backdrop>
    )
  }
  if (room.status === 'playing') {
    const Game = ONLINE_GAMES[room.gameType]
    return (
      <>
        <Game />
        <TableBadge room={room} />
      </>
    )
  }
  return <WaitingRoom room={room} start={start} />
}

function Backdrop({ gameType, children }: { gameType?: GameType; children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-svh items-center justify-center bg-room px-4 py-10 text-ivory">
      {gameType && <div className="absolute inset-0 -z-10 bg-cover bg-center opacity-50" style={{ backgroundImage: `url('/assets/images/bg-${gameType}.svg')` }} />}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.75)_100%)]" />
      {children}
    </div>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full max-w-lg flex-col gap-6 rounded-2xl bg-black/60 p-6 shadow-2xl ring-1 ring-brass/30 backdrop-blur-md sm:p-8">
      {children}
    </div>
  )
}

function WaitingRoom({ room, start }: { room: Room; start: () => Promise<string | null> }) {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const notice = useRoomStore(s => s.notice)
  const connected = useRoomStore(s => s.connected)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const host = room.players.find(p => p.isHost)
  const isHost = room.hostId === user?.id
  const seats = Array.from({ length: room.maxPlayers }, (_, i) => room.players[i] ?? null)
  // Poker: the host fills open seats with bots (none are added for you).
  const botsAllowed = room.gameType === 'poker' && isHost

  const run = async (request: () => Promise<string | null>) => {
    setError(null)
    const err = await request()
    if (err) setError(err)
  }

  const onStart = async () => {
    setStarting(true)
    setError(null)
    const err = await start()
    setStarting(false)
    if (err) setError(err)
  }

  return (
    <Backdrop gameType={room.gameType}>
      <Panel>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass/80">Online table</p>
          <h1 className="font-felt text-3xl text-brass-light sm:text-4xl">{GAME_NAMES[room.gameType]}</h1>
        </div>

        <section aria-label="Invite players" className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="mb-1.5 text-sm text-ivory/60">Table code</p>
              <div className="flex gap-1.5" aria-label={`Table code ${room.code}`}>
                {room.code.split('').map((d, i) => (
                  <span key={i} className="flex h-12 w-10 items-center justify-center rounded-lg bg-black/50 font-felt text-3xl text-ivory ring-1 ring-brass/40 sm:h-14 sm:w-11">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <CopyLink code={room.code} />
        </section>

        <section aria-label="Players" className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Players</h2>
            <span className="text-sm tabular-nums text-ivory/60">{room.players.length} / {room.maxPlayers}</span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {seats.map((p, i) =>
              p ? (
                <li key={p.userId} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${p.userId === user?.id ? 'bg-brass/15 ring-1 ring-brass/40' : 'bg-ivory/5'}`}>
                  <span className="relative">
                    <Avatar name={p.displayName} src={p.avatarUrl} size={34} />
                    {!p.isBot && (
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-black ${p.connected ? 'bg-jade' : 'bg-brass animate-pulse'}`}
                        title={p.connected ? 'Connected' : 'Reconnecting…'}
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {p.displayName}
                      {p.userId === user?.id && <span className="font-normal text-ivory/50"> (you)</span>}
                    </span>
                    <span className="block text-xs text-brass-light">{formatChips(p.chips)} chips</span>
                  </span>
                  {p.isHost && <span className="rounded-full bg-brass-light px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-[#2a1a05]">Host</span>}
                  {p.isBot && <span className="rounded-full bg-ivory/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ivory/70">Bot</span>}
                  {p.isBot && isHost && (
                    <button
                      onClick={() => run(() => removeBot(p.userId))}
                      aria-label={`Remove ${p.displayName}`}
                      title="Remove bot"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-ivory/50 transition hover:bg-ivory/10 hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  )}
                </li>
              ) : botsAllowed ? (
                <li key={`open-${i}`}>
                  <button
                    onClick={() => run(addBot)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-dashed border-ivory/20 px-3 py-2 text-left text-sm text-ivory/50 transition hover:border-brass/60 hover:bg-brass/10 hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light"
                  >
                    <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-dashed border-ivory/25 group-hover:border-brass-light group-hover:text-brass-light">+</span>
                    <span className="flex-1">Open seat</span>
                    <span className="font-semibold text-brass-light opacity-70 group-hover:opacity-100">Add bot</span>
                  </button>
                </li>
              ) : (
                <li key={`open-${i}`} className="flex items-center gap-3 rounded-xl border border-dashed border-ivory/15 px-3 py-2 text-sm text-ivory/35">
                  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-dashed border-ivory/20">+</span>
                  Open seat
                </li>
              ),
            )}
          </ul>
        </section>

        {(error ?? notice) && <p className="rounded-lg bg-banco/20 px-3 py-2 text-sm ring-1 ring-banco/40">{error ?? notice}</p>}
        {!connected && <p className="text-sm text-brass-light">Reconnecting…</p>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={() => navigate('/lobby')} className="dock-btn">Leave table</button>
          {isHost ? (
            <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
              <button onClick={onStart} disabled={starting || !connected || (room.gameType === 'poker' && room.players.length < 2)} className="dock-primary !py-3 !text-base">
                {starting ? 'Starting…' : 'Start game'}
              </button>
              {room.gameType === 'poker' && room.players.length < 2 ? (
                <span className="text-xs text-ivory/50">Poker needs two players: click an open seat to add a bot.</span>
              ) : (
                room.players.length === 1 && <span className="text-xs text-ivory/50">Friends can still join between rounds.</span>
              )}
            </div>
          ) : (
            <p className="animate-pulse text-sm text-ivory/70">Waiting for {host?.displayName ?? 'the host'} to start…</p>
          )}
        </div>
      </Panel>
    </Backdrop>
  )
}

function CopyLink({ code }: { code: string }) {
  const link = inviteLink(code)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // No clipboard access: the link is selectable in the field.
    }
  }
  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={link}
        aria-label="Invite link"
        onFocus={e => e.target.select()}
        className="min-w-0 flex-1 rounded-full bg-black/40 px-4 py-2 text-sm text-ivory/80 ring-1 ring-ivory/15 focus:outline-none focus:ring-2 focus:ring-brass-light"
      />
      <button onClick={copy} className="dock-primary shrink-0">{copied ? 'Copied!' : 'Copy link'}</button>
    </div>
  )
}

const CLOCK_LABEL = { bets: 'Bets close in', turn: 'Turn ends in', next: 'Next round in' }

// During play: the table code (click to copy the invite link), the round's
// clock, and the connection status.
function TableBadge({ room }: { room: Room }) {
  const clock = useRoomStore(s => s.game?.clock)
  const deadline = useRoomStore(s => s.deadline)
  const connected = useRoomStore(s => s.connected)
  const left = useCountdown(deadline)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink(room.code))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // No clipboard access.
    }
  }

  return (
    <div className="pointer-events-none fixed left-3 top-3 z-30 flex flex-wrap items-center gap-2 text-sm">
      <button
        onClick={copy}
        title="Copy the invite link"
        className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#1a0806] px-3.5 py-2 font-semibold shadow-[0_4px_12px_rgba(0,0,0,0.5)] ring-1 ring-brass/50 transition hover:ring-brass-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light"
      >
        {copied ? 'Link copied' : <>Table <span className="font-felt tracking-[0.2em] text-brass-light">{room.code}</span></>}
        <span className="text-ivory/50">· {room.players.length}/{room.maxPlayers}</span>
      </button>
      {!connected ? (
        <span className="rounded-full bg-banco/80 px-3 py-2 font-semibold shadow">Reconnecting…</span>
      ) : (
        clock && left !== null && (
          <span className={`rounded-full bg-black/60 px-3 py-2 tabular-nums shadow ${left <= 5 && clock !== 'next' ? 'text-banco font-bold' : 'text-ivory/80'}`}>
            {CLOCK_LABEL[clock]} {left}s
          </span>
        )
      )}
    </div>
  )
}
