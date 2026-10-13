import CardRow from '../common/CardRow'
import ChipPile from '../common/ChipPile'
import DiscardTray from '../common/DiscardTray'
import FeltPrint from '../common/FeltPrint'
import PlayerSeat from '../common/PlayerSeat'
import SeatRing from '../common/SeatRing'
import Shoe from '../common/Shoe'
import TableMessage from '../common/TableMessage'
import TableStage from '../common/TableStage'
import { useDealing } from '../common/dealing'
import { arrangeSeats } from '../common/seats'
import { useTableSize } from '../common/tableSize'
import type { BlackjackGameState, BlackjackPlayer } from '../../types/blackjack'

interface Props {
  state: BlackjackGameState | null
  roundId?: string // the game round, so each round's cards are dealt fresh
  myId?: string
  myAvatar?: string | null
  myBet: number // chips on your betting circle (while betting, the bet being made)
  myChips: number // your chips off the table
  myResult?: number // your net result once the round is over
  message?: string
}

const statusNotes: Record<string, string> = { bust: 'Bust', blackjack: 'Blackjack' }

// Real dealing order with `n` players: one card each from the dealer's left,
// the dealer's up card, a second card each, the hole card; then hits, then
// the hole card is turned (Card adds 100 to a reveal) and the dealer draws.
const playerOrder = (seat: number, n: number) => (i: number) => (i < 2 ? i * (n + 1) + seat : 50 + i)
const dealerOrder = (n: number) => (i: number) => (i < 2 ? i * (n + 1) + n : 200 + i)

// Dealer on the flat edge with the shoe and discard tray, the rules printed
// across the felt, and the players' seats along the curved rail.
export default function BlackjackTable(props: Props) {
  return (
    <TableStage>
      <Felt {...props} />
    </TableStage>
  )
}

function Felt({ state, roundId, myId, myAvatar, myBet, myChips, myResult, message }: Props) {
  const { u, portrait } = useTableSize()
  const players = state?.players ?? []
  const n = Math.max(players.length, 1)
  const me = players.find(p => p.id === myId) ?? players[0]
  const seats = arrangeSeats(players, me?.id)
  const turn = state?.phase === 'player_turns' ? players[state.currentPlayerIndex] : undefined
  const trayCard = u * 3.6

  return (
    <>
      <div className="absolute" style={{ left: '4%', top: '5%' }}>
        <DiscardTray cardWidth={trayCard} />
      </div>
      <div className="absolute" style={{ right: '4%', top: '4%' }}>
        <Shoe cardWidth={trayCard} />
      </div>

      <div className="absolute inset-x-0 flex justify-center" style={{ top: '6%' }}>
        <CardRow
          label="Dealer"
          cards={state?.dealerHand.cards ?? []}
          value={state?.dealerHand.value}
          cardWidth={u * (portrait ? 7 : 6.4)}
          overlap={0.35}
          dealOrder={dealerOrder(n)}
          roundKey={roundId}
        />
      </div>

      <FeltPrint text={portrait ? 'Blackjack pays 3 to 2' : 'Blackjack pays 3 to 2 · Dealer stands on all 17s'} y={portrait ? 27 : 32} sag={portrait ? 3 : 9} spread={portrait ? 70 : 56} />
      <TableMessage text={message} y={portrait ? 37 : 45} />

      <SeatRing
        seats={seats.map(p => {
          if (!p) return <PlayerSeat key="open" player={null} />
          const mine = p.id === me?.id
          return (
            <PlayerSeat
              player={{ name: p.name, avatarUrl: mine ? myAvatar : null, chips: mine ? myChips : p.chips }}
              isYou={mine}
              active={turn?.id === p.id && players.length > 1}
              result={mine ? myResult : undefined}
            >
              <SeatHand player={p} seat={players.indexOf(p)} n={n} roundId={roundId} bet={mine ? myBet : (p.hands?.[0]?.bet ?? 0)} />
            </PlayerSeat>
          )
        })}
      />
    </>
  )
}

function SeatHand({ player, seat, n, roundId, bet }: { player: BlackjackPlayer; seat: number; n: number; roundId?: string; bet: number }) {
  const { u, portrait } = useTableSize()
  const dealing = useDealing()
  const hand = player.hands?.[0]
  const cardWidth = u * (portrait ? 5.4 : 5)
  const note = hand && !dealing ? statusNotes[hand.status] : undefined
  const spot = u * 4.4

  return (
    <>
      <div className="relative">
        <CardRow cards={hand?.cards ?? []} cardWidth={cardWidth} overlap={0.55} dealOrder={playerOrder(seat, n)} roundKey={roundId} />
        {hand && hand.cards.length > 0 && !dealing && (
          <span
            className={`absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center justify-center whitespace-nowrap rounded-full px-2 font-extrabold shadow ring-1 ring-black/30 ${
              hand.status === 'bust' ? 'bg-banco text-ivory' : hand.status === 'blackjack' ? 'bg-brass-light text-[#2a1a05]' : 'bg-ivory text-black'
            }`}
            style={{ height: Math.max(18, u * 2), fontSize: Math.max(11, u * 1.15) }}
          >
            {note ? `${note} ${hand.status === 'bust' ? hand.value : ''}`.trim() : hand.value}
          </span>
        )}
      </div>
      {/* The betting circle in front of the seat. */}
      <div
        className="flex items-center justify-center rounded-full border-2 border-brass/50"
        style={{ width: spot, height: spot }}
        title={bet ? `Bet ${bet}` : undefined}
      >
        {bet > 0 && (
          <div style={{ width: spot * 0.72 }}>
            <ChipPile amount={bet} maxVisible={5} />
          </div>
        )}
      </div>
    </>
  )
}
