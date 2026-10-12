import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { blackjackAction, newBlackjackSession, type BlackjackAction, type DevBlackjackResponse } from '../api/devBlackjack'
import BlackjackTable from '../components/blackjack/BlackjackTable'
import BetControls from '../components/blackjack/BetControls'
import BlackjackControls from '../components/blackjack/BlackjackControls'

// Temporary blackjack table backed by the in-memory /api/dev/blackjack API.

function errorMessage(err: unknown) {
  if (axios.isAxiosError(err)) return err.response?.data?.error ?? err.message
  return String(err)
}

function resultMessage(amount: number) {
  if (amount > 0) return `You win +${amount}`
  if (amount < 0) return `You lose ${amount}`
  return 'Push'
}

export default function BlackjackTestPage() {
  const [game, setGame] = useState<DevBlackjackResponse | null>(null)
  const [bet, setBet] = useState(0)
  const [lastBet, setLastBet] = useState(0)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const startSession = async () => {
    setBusy(true)
    try {
      setGame(await newBlackjackSession())
      setBet(0)
      setMessage('Place your bet')
    } catch (err) {
      setMessage(`${errorMessage(err)} (is the backend running on :8080?)`)
    } finally {
      setBusy(false)
    }
  }

  // Guard against StrictMode running the mount effect twice in dev.
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    startSession()
  }, [])

  const act = async (action: BlackjackAction, amount?: number) => {
    if (!game) return
    setBusy(true)
    try {
      const res = await blackjackAction(game.sessionId, action, amount)
      setGame(res)
      if (res.result) {
        const chips = res.state.players[0].chips
        setMessage(chips > 0 ? resultMessage(res.result.amount) : `${resultMessage(res.result.amount)} · Out of chips`)
        setBet(lastBet <= chips ? lastBet : 0) // rebet the same amount by default
      } else {
        setMessage('')
      }
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const deal = () => {
    setLastBet(bet)
    act('bet', bet)
  }

  const player = game?.state.players[0]
  const hand = player?.hands?.[0]
  const chips = player?.chips ?? 0
  const inHand = game?.state.phase === 'player_turns'

  return (
    <div className="flex min-h-svh flex-col items-center gap-4 bg-neutral-950 px-4 py-6 text-white">
      <div className="flex w-full max-w-4xl items-center justify-between">
        <Link to="/" className="text-sm text-neutral-400 hover:text-white">← back to games</Link>
        <button onClick={startSession} disabled={busy} className="text-sm text-neutral-400 hover:text-white">New game (1000 chips)</button>
      </div>

      <BlackjackTable
        dealerCards={game?.state.dealerHand.cards ?? []}
        dealerTotal={game?.dealerTotal ?? 0}
        playerCards={hand?.cards ?? []}
        playerTotal={game?.playerTotal ?? 0}
        handStatus={hand?.status}
        betAmount={inHand ? (hand?.bet ?? 0) : bet}
        stackAmount={inHand ? chips : chips - bet}
        message={message}
        controls={
          !game ? null : inHand ? (
            <BlackjackControls
              busy={busy}
              canDouble={!!hand && hand.cards.length === 2 && chips >= hand.bet}
              onHit={() => act('hit')}
              onStand={() => act('stand')}
              onDouble={() => act('double')}
            />
          ) : chips > 0 ? (
            <BetControls bet={bet} chips={chips} busy={busy} onChange={setBet} onDeal={deal} />
          ) : (
            <button onClick={startSession} className="rounded bg-yellow-400 px-5 py-2 font-bold text-black">New game</button>
          )
        }
      />
    </div>
  )
}
