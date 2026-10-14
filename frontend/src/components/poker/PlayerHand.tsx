import { AnimatePresence, motion } from 'framer-motion'
import CardRow from '../common/CardRow'
import { Avatar } from '../common/PlayerSeat'
import { useTableSize } from '../common/tableSize'
import { formatChips } from '../../utils/chipUtils'
import type { Card } from '../../types/game'
import type { SeatView } from '../../utils/poker'
import type { SeatSpots } from './layout'

interface Props {
  name: string
  avatarUrl?: string | null
  isYou: boolean
  seat: SeatView
  spots: SeatSpots
  cards: Card[] // what this viewer sees; empty once folded (the cards go to the muck)
  dealOrder: (index: number) => number
  roundKey?: string
  thinking?: boolean // a bot deciding
  yourTurn?: boolean
  handRank?: string // shown under the cards
  winner?: boolean
  result?: number // net result of the hand, once it is paid out
}

// One player at the poker table: hole cards on the felt and the nameplate
// on the rail, with their last action, a thinking/turn glow and, at the end,
// their hand and result.
export default function PlayerHand(props: Props) {
  const { name, avatarUrl, isYou, seat, spots, cards, dealOrder, roundKey, thinking, yourTurn, handRank, winner, result } = props
  const { u, portrait } = useTableSize()
  const cardWidth = u * (isYou ? (portrait ? 7.4 : 6) : portrait ? 5.2 : 3.9)
  const folded = seat.status === 'folded'
  const avatar = Math.max(22, u * (portrait ? 3.6 : 3.2))
  const font = Math.max(10, u * (portrait ? 1.35 : 1.1))
  const lit = thinking || yourTurn

  return (
    <>
      {/* Hole cards */}
      <div className="absolute" style={{ left: `${spots.cards.x}%`, top: `${spots.cards.y}%`, transform: 'translate(-50%, -50%)' }}>
        <motion.div animate={{ opacity: folded ? 0.4 : 1 }} className="relative flex flex-col items-center">
          <div style={{ transform: isYou ? undefined : 'rotate(-4deg)' }}>
            <CardRow cards={cards} cardWidth={cardWidth} overlap={isYou ? 0.18 : 0.5} dealOrder={dealOrder} roundKey={roundKey} />
          </div>
          <AnimatePresence>
            {handRank && cards.length > 0 && (
              <motion.span
                key={handRank}
                initial={{ opacity: 0, y: -4, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`absolute whitespace-nowrap rounded-full px-2 py-0.5 font-extrabold shadow ring-1 ring-black/30 ${isYou && !portrait ? '' : 'left-1/2'} ${
                  winner ? 'bg-brass-light text-[#2a1a05]' : 'bg-black/70 text-ivory'
                }`}
                style={
                  // Yours goes beside your cards (above them on a narrow table), clear of your nameplate.
                  isYou && !portrait ? { left: '100%', top: '50%', marginLeft: u, marginTop: -font * 0.8, fontSize: font }
                  : isYou ? { top: -font * 1.9, x: '-50%', fontSize: font }
                  : { bottom: -font * 1.1, x: '-50%', fontSize: font }
                }
              >
                {handRank}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Nameplate */}
      <div className="absolute z-10" style={{ left: `${spots.plate.x}%`, top: `${spots.plate.y}%`, transform: 'translate(-50%, -50%)' }}>
        <motion.div
          animate={{
            opacity: folded ? 0.55 : 1,
            boxShadow: winner
              ? ['0 0 0px 0px rgba(230,200,120,0)', '0 0 28px 6px rgba(230,200,120,0.75)', '0 0 0px 0px rgba(230,200,120,0)']
              : lit
                ? ['0 0 0px 0px rgba(230,200,120,0)', '0 0 18px 3px rgba(230,200,120,0.6)', '0 0 0px 0px rgba(230,200,120,0)']
                : '0 4px 10px rgba(0,0,0,0.45)',
          }}
          transition={winner || lit ? { boxShadow: { duration: 1.4, repeat: Infinity }, opacity: { duration: 0.3 } } : { duration: 0.3 }}
          className={`relative flex items-center rounded-full py-1 pl-1 ${
            isYou ? 'bg-gradient-to-b from-[#3a2a10] to-[#1d1407] ring-2 ring-brass' : 'bg-black/70 ring-1 ring-ivory/15'
          } ${lit || winner ? '!ring-2 !ring-brass-light' : ''}`}
          style={{ paddingRight: u * 1.2, gap: u * 0.6, minWidth: u * (portrait ? 13 : 11) }}
        >
          <Avatar name={name} src={avatarUrl} size={avatar} />
          <div className="min-w-0 leading-tight">
            <div className="truncate font-semibold" style={{ fontSize: font, maxWidth: u * (portrait ? 10 : 9) }}>
              {isYou ? 'You' : name}
            </div>
            <div className="font-bold tabular-nums text-brass-light" style={{ fontSize: font * 0.95 }}>
              {seat.status === 'all_in' ? 'All-in' : formatChips(seat.chips)}
            </div>
          </div>
          {thinking && <ThinkingDots size={font} />}

          {/* Last action, popping in over the plate. */}
          <AnimatePresence>
            {seat.label && !winner && result === undefined && (
              <motion.div
                key={seat.label}
                initial={{ opacity: 0, scale: 0.6, y: spots.top ? -6 : 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 520, damping: 26 }}
                className={`absolute left-1/2 whitespace-nowrap rounded-full px-2 py-0.5 font-extrabold shadow ring-1 ring-black/30 ${labelTone(seat.label)}`}
                style={{ x: '-50%', fontSize: font * 0.92, [spots.top ? 'bottom' : 'top']: '-55%' }}
              >
                {seat.label}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {result !== undefined && (
              <motion.div
                initial={{ y: 6, opacity: 0, scale: 0.7 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`absolute whitespace-nowrap rounded-full px-2 py-0.5 font-extrabold shadow ring-1 ring-black/30 ${
                  result > 0 ? 'bg-brass-light text-[#2a1a05]' : result < 0 ? 'bg-banco text-ivory' : 'bg-ivory/80 text-black'
                }`}
                style={{ fontSize: font, top: -font * 1.2, right: -font * 1.2 }}
              >
                {result > 0 ? `+${result.toLocaleString()}` : result < 0 ? result.toLocaleString() : '±0'}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  )
}

function labelTone(label: string) {
  if (label === 'Fold') return 'bg-neutral-700 text-ivory/80'
  if (label === 'All-in') return 'bg-banco text-ivory'
  if (label.startsWith('Raise') || label.startsWith('Bet')) return 'bg-brass-light text-[#2a1a05]'
  return 'bg-ivory text-black'
}

function ThinkingDots({ size }: { size: number }) {
  return (
    <div className="flex items-center gap-0.5 pl-1" aria-label="Thinking">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="rounded-full bg-brass-light"
          style={{ width: size * 0.38, height: size * 0.38 }}
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  )
}
