import DiscardTray from '../common/DiscardTray'
import PlayerSeat from '../common/PlayerSeat'
import SeatRing from '../common/SeatRing'
import Shoe from '../common/Shoe'
import TableMessage from '../common/TableMessage'
import TableStage from '../common/TableStage'
import { arrangeSeats } from '../common/seats'
import { useTableSize } from '../common/tableSize'
import HandDisplay, { type HandOutcome } from './HandDisplay'
import BetAreas, { type SettleStage } from './BetAreas'
import BeadRoad from './BeadRoad'
import { BACCARAT_SPOTS } from '../../utils/baccarat'
import type { Card } from '../../types/game'
import type { BaccaratBets, BaccaratPlayer, BaccaratResult, BaccaratSpot } from '../../types/baccarat'

interface Props {
  playerCards: Card[]
  bankerCards: Card[]
  roundId?: string // the coup, so each one's cards are dealt fresh
  result?: BaccaratResult // set once the coup is decided
  settle: SettleStage
  bets: BaccaratBets // your stakes on the spots
  payouts?: BaccaratBets
  betsLocked: boolean
  onPlace: (spot: BaccaratSpot) => void
  players: BaccaratPlayer[] // everyone at the table
  myId?: string
  myAvatar?: string | null
  myChips: number | null // your chips off the table; null until the game has loaded
  myResult?: number // your net result once the coup is settled
  history: BaccaratResult[]
  message?: string
}

// Real dealing order: player, banker, player, banker; the third cards come
// one at a time afterwards.
const playerOrder = (i: number) => i * 2
const bankerOrder = (i: number) => i * 2 + 1

function handOutcome(side: 'player' | 'banker', result?: BaccaratResult): HandOutcome | undefined {
  if (!result) return undefined
  if (result === 'tie') return 'tie'
  return result === side ? 'win' : 'lose'
}

// Dealer's side: scoreboard, the two hands, discard tray and shoe. Then the
// betting spots across the middle of the felt and the seats along the rail.
export default function BaccaratTable(props: Props) {
  return (
    <TableStage>
      <Felt {...props} />
    </TableStage>
  )
}

function Felt(props: Props) {
  const { playerCards, bankerCards, roundId, result, settle, bets, payouts, betsLocked, onPlace, players, myId, myAvatar, myChips, myResult, history, message } = props
  const { u, portrait } = useTableSize()
  const me = players.find(p => p.id === myId) ?? players[0]
  const seats = arrangeSeats(players, me?.id)
  const trayCard = u * (portrait ? 4.4 : 3.6)
  const cardWidth = u * (portrait ? 5.8 : 5)

  return (
    <>
      <div className="absolute" style={{ left: '4%', top: '5%' }}>
        <BeadRoad results={history} bead={u * (portrait ? 1.5 : 1.25)} />
      </div>
      <div className="absolute flex items-start gap-2" style={{ right: '4%', top: '4%' }}>
        {!portrait && <DiscardTray cardWidth={trayCard} />}
        <Shoe cardWidth={trayCard} />
      </div>

      <div className="absolute inset-x-0 flex justify-center" style={{ top: portrait ? '23%' : '5%', gap: u * 1.2 }}>
        <HandDisplay side="player" cards={playerCards} dealOrder={playerOrder} roundKey={roundId} outcome={handOutcome('player', result)} cardWidth={cardWidth} />
        <HandDisplay side="banker" cards={bankerCards} dealOrder={bankerOrder} roundKey={roundId} outcome={handOutcome('banker', result)} cardWidth={cardWidth} />
      </div>

      <TableMessage text={message} y={portrait ? 46 : 39} />

      <div className="absolute inset-x-0 flex justify-center" style={{ top: portrait ? '50%' : '45%' }}>
        <BetAreas bets={bets} payouts={payouts} result={result} stage={settle} disabled={betsLocked} onPlace={onPlace} />
      </div>

      <SeatRing
        seats={seats.map(p => {
          if (!p) return <PlayerSeat key="open" player={null} />
          const mine = p.id === me?.id
          return (
            <PlayerSeat
              player={{ name: p.name, avatarUrl: mine ? myAvatar : null, chips: mine ? (myChips ?? undefined) : p.chips }}
              isYou={mine}
              result={mine ? myResult : undefined}
            >
              {/* Your stakes are on the spots; other players' are shown at their seat. */}
              {!mine && <SeatBets bets={p.bets} />}
            </PlayerSeat>
          )
        })}
      />
    </>
  )
}

const tagStyle: Record<BaccaratSpot, string> = { player: 'bg-punto', tie: 'bg-jade', banker: 'bg-banco' }

function SeatBets({ bets }: { bets?: BaccaratBets }) {
  const { u } = useTableSize()
  const placed = BACCARAT_SPOTS.filter(s => (bets?.[s.spot] ?? 0) > 0)
  if (!placed.length) return null
  return (
    <div className="flex flex-wrap justify-center gap-1" style={{ fontSize: Math.max(10, u * 1.05) }}>
      {placed.map(s => (
        <span key={s.spot} className={`rounded-full px-1.5 py-0.5 font-bold shadow ${tagStyle[s.spot]}`}>
          {s.label[0]} {bets![s.spot]}
        </span>
      ))}
    </div>
  )
}
