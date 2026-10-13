import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { formatChips } from '../../utils/chipUtils'
import { useTableSize } from './tableSize'

export interface SeatPlayer {
  name: string
  avatarUrl?: string | null
  chips?: number // chips off the table
}

interface Props {
  player: SeatPlayer | null // null: an open seat
  isYou?: boolean
  active?: boolean // it's this player's turn
  result?: number // net win/loss of the round just played, shown as a badge
  children?: ReactNode // what's in front of the player: cards, bets
}

// One place at the table: what the player has on the felt, then their
// nameplate on the rail.
export default function PlayerSeat({ player, isYou, active, result, children }: Props) {
  const { u, portrait } = useTableSize()
  const width = u * (portrait ? 10 : 17)
  const avatar = Math.max(22, u * 3)

  if (!player) {
    return (
      <div className="flex flex-col items-center justify-end" style={{ width, minHeight: u * 6 }}>
        <div
          className="flex items-center justify-center rounded-full border border-dashed border-ivory/20 text-ivory/30"
          style={portrait ? { width: avatar + 8, height: avatar + 8 } : { height: avatar + 8, paddingInline: u * 1.6, fontSize: Math.max(10, u * 1.1) }}
          title="Open seat"
        >
          {portrait ? '+' : 'Open seat'}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center" style={{ width, gap: u * 0.6 }}>
      <div className="flex flex-col items-center justify-end" style={{ gap: u * 0.5 }}>{children}</div>
      <div
        className={`relative flex max-w-full items-center ${portrait ? 'flex-col rounded-2xl px-1.5 py-1 text-center' : 'rounded-full py-1 pl-1'} shadow-[0_4px_10px_rgba(0,0,0,0.45)] transition ${
          isYou ? 'bg-gradient-to-b from-[#3a2a10] to-[#1d1407] ring-2 ring-brass' : 'bg-black/55 ring-1 ring-ivory/15'
        } ${active ? 'animate-pulse ring-2 !ring-brass-light' : ''}`}
        style={portrait ? { gap: 2 } : { paddingRight: u * 1.2, gap: u * 0.6 }}
      >
        <Avatar name={player.name} src={player.avatarUrl} size={avatar} />
        <div className="min-w-0 max-w-full leading-tight">
          <div className="truncate font-semibold" style={{ fontSize: Math.max(11, u * 1.15) }}>
            {isYou ? 'You' : player.name}
          </div>
          {player.chips !== undefined && (
            <div className="font-bold text-brass-light" style={{ fontSize: Math.max(10, u * 1.05) }}>
              {formatChips(player.chips)}
            </div>
          )}
        </div>
        <AnimatePresence>
          {result !== undefined && (
            <motion.div
              initial={{ y: 6, opacity: 0, scale: 0.7 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute -top-2 right-0 translate-x-1/3 -translate-y-1/2 rounded-full px-2 py-0.5 text-xs font-extrabold shadow ${
                result > 0 ? 'bg-brass-light text-[#2a1a05]' : result < 0 ? 'bg-banco text-ivory' : 'bg-ivory/80 text-black'
              }`}
            >
              {result > 0 ? `+${result}` : result < 0 ? result : 'Push'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function Avatar({ name, src, size }: { name: string; src?: string | null; size: number }) {
  if (src) return <img src={src} alt="" referrerPolicy="no-referrer" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-felt-light font-felt text-ivory"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
