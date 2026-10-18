import { AnimatePresence, motion } from 'framer-motion'
import ChipPile from '../common/ChipPile'
import DiscardTray from '../common/DiscardTray'
import Shoe from '../common/Shoe'
import TableMessage from '../common/TableMessage'
import TableStage from '../common/TableStage'
import { useTableSize } from '../common/tableSize'
import CommunityCards from './CommunityCards'
import PlayerHand from './PlayerHand'
import PotDisplay from './PotDisplay'
import { BOARD_Y, POT, openSeatSpots, seatSpots, type Point } from './layout'
import type { Card } from '../../types/game'
import type { PokerGameState } from '../../types/poker'
import type { TableView } from '../../utils/poker'

// Chips moving across the felt: bets swept into the pot, the pot pushed to
// its winner(s).
export interface Flight {
  id: string
  amount: number
  from: { bet: string } | 'pot' // a player's bet spot, or the pot
  to: { plate: string } | 'pot' // a player's seat, or the pot
  delay?: number
}

interface Props {
  state: PokerGameState | null
  view: TableView | null // the table at the step being shown
  roundId?: string
  myId?: string
  myAvatar?: string | null
  holeCardsDealt: boolean // false until the blinds are in
  reveal: boolean // showdown: turn the remaining hands face up
  thinkingId?: string | null
  yourTurn: boolean
  myHandRank?: string
  winners?: string[]
  results?: Record<string, number> // net result per player, once paid out
  flights: Flight[]
  onFlightDone: (id: string) => void
  message?: string
  seatControls?: SeatControls
}

// Online, for the host: seat bots in the empty places, or take them away.
// Changes apply from the next hand.
export interface SeatControls {
  open: number // seats free at the table (bots waiting for the next hand count as taken)
  onAddBot: () => void
  botIds: string[] // bots that can be removed
  onRemoveBot: (id: string) => void
}

const HIDDEN = { hidden: true } as Card

// The oval table: the dealer with the deck and muck at the top, the board
// and pot in the middle, and the players around it with you at the bottom.
export default function PokerTable(props: Props) {
  return (
    <TableStage shape="oval">
      <Felt {...props} />
    </TableStage>
  )
}

function Felt({ state, view, roundId, myId, myAvatar, holeCardsDealt, reveal, thinkingId, yourTurn, myHandRank, winners = [], results, flights, onFlightDone, message, seatControls }: Props) {
  const { u, portrait } = useTableSize()
  const players = state?.players ?? []
  const n = players.length
  const me = Math.max(0, players.findIndex(p => p.id === myId))
  const seated = players.filter(p => p.status !== 'out').length
  const dealer = state?.dealerIndex ?? 0
  const trayCard = u * (portrait ? 3.6 : 3)

  // Seat spots by player id; you are always at the bottom.
  const spotsOf = (index: number) => seatSpots((index - me + n) % Math.max(n, 1), n, portrait)
  const spotById = (id: string) => spotsOf(Math.max(0, players.findIndex(p => p.id === id)))
  const where = (end: Flight['from'] | Flight['to']): Point =>
    end === 'pot' ? POT : 'bet' in end ? spotById(end.bet).bet : spotById(end.plate).plate

  // Hole cards go out one at a time from the dealer's left, twice round.
  const holeOrder = (index: number) => (i: number) => i * seated + ((index - dealer - 1 + n) % n)

  return (
    <>
      <FeltLines />

      {/* The dealer's place: muck on the left, the deck on the right. */}
      <div className="absolute flex items-start justify-center" style={{ left: '50%', top: portrait ? '3.5%' : '4.5%', transform: 'translateX(-50%)', gap: u * 5 }}>
        <DiscardTray cardWidth={trayCard} />
        <div className="self-center whitespace-nowrap text-center font-felt uppercase leading-snug tracking-[0.3em] text-brass/60" style={{ fontSize: Math.max(10, u * 1.05) }}>
          Texas Hold'em
          <div className="tracking-[0.25em] text-brass/40" style={{ fontSize: Math.max(9, u * 0.85) }}>No limit</div>
        </div>
        <Shoe cardWidth={trayCard} />
      </div>

      <div className="absolute" style={{ left: `${POT.x}%`, top: `${POT.y}%`, transform: 'translate(-50%, -50%)' }}>
        <PotDisplay amount={view?.pot ?? 0} sidePots={reveal ? [] : state?.sidePots} />
      </div>

      <div className="absolute" style={{ left: '50%', top: `${BOARD_Y}%`, transform: 'translate(-50%, -50%)' }}>
        <CommunityCards cards={(state?.communityCards ?? []).slice(0, view?.board ?? 0)} roundKey={roundId} />
      </div>

      <TableMessage text={message} y={portrait ? 60 : 61} />

      {state && view && <DealerButton at={spotsOf(dealer).button} />}

      {players.map((p, i) => {
        const seat = view?.seats[p.id]
        if (!seat || seat.status === 'out') return null
        const mine = i === me
        const cards = seat.status === 'folded' || !holeCardsDealt ? [] : mine || reveal ? p.cards : p.cards.map(() => HIDDEN)
        return (
          <PlayerHand
            key={p.id}
            name={p.name}
            avatarUrl={mine ? myAvatar : null}
            isYou={mine}
            seat={seat}
            spots={spotsOf(i)}
            cards={cards}
            dealOrder={holeOrder(i)}
            roundKey={roundId}
            thinking={thinkingId === p.id}
            yourTurn={mine && yourTurn}
            handRank={mine && !reveal ? myHandRank : reveal ? p.handRank : undefined}
            winner={winners.includes(p.id)}
            result={results?.[p.id]}
          />
        )
      })}

      {/* Bets in front of the players on this street. */}
      {players.map((p, i) => {
        const bet = view?.seats[p.id]?.bet ?? 0
        return <BetChips key={`${p.id}:${roundId}:${view?.street}`} amount={bet} from={spotsOf(i).plate} at={spotsOf(i).bet} />
      })}

      {flights.map(f => (
        <ChipFlight key={f.id} flight={f} from={where(f.from)} to={where(f.to)} onDone={() => onFlightDone(f.id)} />
      ))}

      {seatControls && state && (
        <>
          {openSeatSpots(n, portrait).slice(0, seatControls.open).map((at, i) => (
            <button
              key={`open-${i}`}
              onClick={seatControls.onAddBot}
              title="Seat a bot from the next hand"
              className="absolute flex items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-ivory/30 bg-black/30 font-semibold text-ivory/60 transition hover:border-brass-light hover:bg-black/50 hover:text-brass-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light"
              style={{ left: `${at.x}%`, top: `${at.y}%`, transform: 'translate(-50%, -50%)', padding: `${u * 0.6}px ${u * 1.4}px`, fontSize: Math.max(11, u * 1.1) }}
            >
              <span aria-hidden>+</span> Add bot
            </button>
          ))}
          {players.map((p, i) =>
            seatControls.botIds.includes(p.id) ? (
              <button
                key={`remove-${p.id}`}
                onClick={() => seatControls.onRemoveBot(p.id)}
                aria-label={`Remove ${p.name}`}
                title={`Remove ${p.name} after this hand`}
                className="absolute flex items-center justify-center rounded-full bg-[#1a0806] text-ivory/60 shadow ring-1 ring-ivory/25 transition hover:text-ivory hover:ring-banco focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light"
                style={{
                  left: `${spotsOf(i).plate.x}%`,
                  top: `${spotsOf(i).plate.y}%`,
                  width: Math.max(20, u * 2),
                  height: Math.max(20, u * 2),
                  transform: `translate(${u * 6}px, ${-u * 3.2}px)`,
                }}
              >
                <svg viewBox="0 0 24 24" width="55%" height="55%" aria-hidden fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            ) : null,
          )}
        </>
      )}
    </>
  )
}

// The printed betting line around the middle of the felt.
function FeltLines() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <ellipse cx="50" cy="50" rx="37" ry="35" fill="none" stroke="rgba(230,200,120,0.35)" strokeWidth="0.35" vectorEffect="non-scaling-stroke" />
      <ellipse cx="50" cy="50" rx="36" ry="33.8" fill="none" stroke="rgba(230,200,120,0.15)" strokeWidth="0.2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function BetChips({ amount, from, at }: { amount: number; from: Point; at: Point }) {
  const { u } = useTableSize()
  return (
    <AnimatePresence>
      {amount > 0 && (
        <motion.div
          className="pointer-events-none absolute z-10 flex flex-col items-center"
          initial={{ left: `${from.x}%`, top: `${from.y}%`, opacity: 0 }}
          animate={{ left: `${at.x}%`, top: `${at.y}%`, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ x: '-50%', y: '-50%', gap: u * 0.2 }}
        >
          <div style={{ width: u * 2.6 }}>
            <ChipPile amount={amount} maxVisible={5} />
          </div>
          <motion.span
            key={amount}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="whitespace-nowrap rounded-full bg-black/60 px-1.5 font-bold tabular-nums text-ivory"
            style={{ fontSize: Math.max(10, u * 1.05) }}
          >
            {amount.toLocaleString()}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ChipFlight({ flight, from, to, onDone }: { flight: Flight; from: Point; to: Point; onDone: () => void }) {
  const { u } = useTableSize()
  return (
    <motion.div
      className="pointer-events-none absolute z-20"
      initial={{ left: `${from.x}%`, top: `${from.y}%`, opacity: 1 }}
      animate={{ left: `${to.x}%`, top: `${to.y}%`, opacity: [1, 1, 0.9] }}
      transition={{ duration: 0.6, delay: flight.delay ?? 0, ease: [0.45, 0, 0.2, 1] }}
      onAnimationComplete={onDone}
      style={{ x: '-50%', y: '-50%', width: u * 3 }}
    >
      <ChipPile amount={flight.amount} maxVisible={6} />
    </motion.div>
  )
}

function DealerButton({ at }: { at: Point }) {
  const { u } = useTableSize()
  const size = Math.max(18, u * 2.2)
  return (
    <motion.div
      className="pointer-events-none absolute z-10 flex items-center justify-center rounded-full bg-gradient-to-b from-white to-[#d9d2bf] font-black text-[#1a1a1a] shadow-[0_3px_6px_rgba(0,0,0,0.5)] ring-1 ring-black/40"
      initial={false}
      animate={{ left: `${at.x}%`, top: `${at.y}%` }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      style={{ width: size, height: size, x: '-50%', y: '-50%', fontSize: size * 0.5 }}
      title="Dealer button"
    >
      D
    </motion.div>
  )
}
