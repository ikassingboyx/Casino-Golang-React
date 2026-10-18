import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../common/Modal'
import { createRoom, getRoom } from '../../api/rooms'
import { apiErrorMessage } from '../../utils/apiError'
import { GAME_NAMES, OFFLINE_BLURB, ROOM_CODE_LENGTH } from '../../utils/games'
import type { GameType } from '../../types/game'

interface Props {
  game: GameType | null // the table picked in the lobby; null when closed
  onClose: () => void
}

// After picking a table: play alone, open an online table to invite friends
// to, or join a friend's table with its code.
export default function ModeSelect({ game, onClose }: Props) {
  // Keep showing the last game while the dialog fades out.
  const [shown, setShown] = useState(game)
  if (game && game !== shown) setShown(game)
  return (
    <Modal open={!!game} onClose={onClose} label={shown ? `Play ${GAME_NAMES[shown]}` : ''}>
      {shown && <Choices key={shown} game={shown} />}
    </Modal>
  )
}

function Choices({ game }: { game: GameType }) {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const playOnline = async () => {
    setCreating(true)
    setError(null)
    try {
      const { data } = await createRoom(game)
      navigate(`/room/${data.code}`)
    } catch (err) {
      setError(apiErrorMessage(err))
      setCreating(false)
    }
  }

  const join = async (e: FormEvent) => {
    e.preventDefault()
    if (code.length !== ROOM_CODE_LENGTH) {
      setError(`A table code has ${ROOM_CODE_LENGTH} digits`)
      return
    }
    setJoining(true)
    setError(null)
    try {
      await getRoom(code)
      navigate(`/room/${code}`)
    } catch (err) {
      setError(apiErrorMessage(err))
      setJoining(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="pr-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass/80">Take a seat</p>
        <h2 className="font-felt text-3xl text-brass-light">{GAME_NAMES[game]}</h2>
      </div>

      <div className="flex flex-col gap-3">
        <Choice icon={<SoloIcon />} title="Play offline" text={OFFLINE_BLURB[game]} onClick={() => navigate(`/game/${game}/offline`)} disabled={creating} />
        <Choice
          icon={<GroupIcon />}
          title={creating ? 'Opening a table…' : 'Play online'}
          text="Open a table and invite up to 4 friends with a link"
          onClick={playOnline}
          disabled={creating}
          primary
        />
      </div>

      <form onSubmit={join} className="flex flex-col gap-2 border-t border-ivory/10 pt-4">
        <label htmlFor="room-code" className="text-sm text-ivory/70">Got a code from a friend?</label>
        <div className="flex gap-2">
          <input
            id="room-code"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, ROOM_CODE_LENGTH))}
            inputMode="numeric"
            autoComplete="off"
            placeholder="12345"
            className="min-w-0 flex-1 rounded-full bg-black/40 px-4 py-2 font-felt text-lg tracking-[0.35em] text-ivory ring-1 ring-ivory/20 placeholder:text-ivory/25 focus:outline-none focus:ring-2 focus:ring-brass-light"
          />
          <button type="submit" disabled={joining || code.length === 0} className="dock-btn">
            {joining ? 'Joining…' : 'Join'}
          </button>
        </div>
      </form>

      {error && <p className="rounded-lg bg-banco/20 px-3 py-2 text-sm text-ivory ring-1 ring-banco/40">{error}</p>}
    </div>
  )
}

function Choice(props: { icon: ReactNode; title: string; text: string; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  const { icon, title, text, onClick, disabled, primary } = props
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group flex items-center gap-4 rounded-xl p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light disabled:opacity-60 ${
        primary
          ? 'bg-gradient-to-b from-brass-light to-brass text-[#2a1a05] hover:brightness-110'
          : 'bg-ivory/5 ring-1 ring-ivory/15 hover:bg-ivory/10 hover:ring-brass/50'
      }`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${primary ? 'bg-[#2a1a05]/15' : 'bg-black/30 text-brass-light'}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-base font-extrabold">{title}</span>
        <span className={`block text-sm ${primary ? 'text-[#2a1a05]/75' : 'text-ivory/60'}`}>{text}</span>
      </span>
    </button>
  )
}

const iconProps = { viewBox: '0 0 24 24', width: 22, height: 22, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, 'aria-hidden': true }

function SoloIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function GroupIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="17" cy="9" r="2.8" />
      <path d="M17 14.2c2.8.3 4.5 2.4 4.5 5.3" />
    </svg>
  )
}
