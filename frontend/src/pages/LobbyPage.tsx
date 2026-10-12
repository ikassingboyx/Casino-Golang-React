import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe } from '../api/user'
import UserBadge from '../components/common/UserBadge'
import { useAuthStore } from '../store/authStore'
import type { GameType } from '../types/game'

const games: { id: GameType; name: string; ready: boolean }[] = [
  { id: 'blackjack', name: 'Blackjack', ready: true },
  { id: 'poker', name: 'Poker', ready: false },
  { id: 'baccarat', name: 'Baccarat', ready: false },
  { id: 'roulette', name: 'Roulette', ready: true },
]

export default function LobbyPage() {
  const navigate = useNavigate()

  // Refresh the profile; an expired token gets a 401 and logs out.
  useEffect(() => {
    getMe().then(res => useAuthStore.getState().setUser(res.data)).catch(() => {})
  }, [])

  return (
    <div className="flex min-h-svh flex-col items-center gap-8 bg-neutral-950 px-4 py-6 text-white">
      <div className="flex w-full max-w-4xl justify-end">
        <UserBadge />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <h1 className="text-3xl font-bold text-yellow-400">Casino</h1>
        <div className="grid w-full max-w-md grid-cols-2 gap-4">
          {games.map(g => (
            <button
              key={g.id}
              disabled={!g.ready}
              onClick={() => navigate(`/game/${g.id}/offline`)}
              className="rounded border border-yellow-400 py-6 text-yellow-400 hover:bg-yellow-400 hover:text-black disabled:cursor-not-allowed disabled:border-neutral-700 disabled:text-neutral-600 disabled:hover:bg-transparent"
            >
              {g.name}
              {!g.ready && <div className="mt-1 text-xs">coming soon</div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
