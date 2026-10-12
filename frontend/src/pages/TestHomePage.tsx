import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe } from '../api/user'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../store/authStore'

// Temporary test home page: pick a game to play in the text console.

const games = [
  { id: 'blackjack', name: 'Blackjack', ready: true },
  { id: 'poker', name: 'Poker', ready: false },
  { id: 'baccarat', name: 'Baccarat', ready: false },
  { id: 'roulette', name: 'Roulette', ready: false },
]

export default function TestHomePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  // Refresh the profile; an expired token gets a 401 and logs out.
  useEffect(() => {
    getMe().then(res => useAuthStore.getState().setUser(res.data)).catch(() => {})
  }, [])

  return (
    <div className="min-h-svh flex flex-col items-center justify-center gap-8 px-4 font-mono">
      {user && (
        <div className="fixed right-4 top-4 flex items-center gap-3 text-sm" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
          {user.avatarUrl && <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />}
          <span>{user.displayName}</span>
          <span className="text-yellow-400">{user.chips} chips</span>
          <button onClick={logout} className="text-neutral-400 hover:text-white">Log out</button>
        </div>
      )}
      <h1 className="text-3xl text-green-400">Casino (test)</h1>
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        {games.map(g => (
          <button
            key={g.id}
            disabled={!g.ready}
            onClick={() => navigate(`/test/${g.id}`)}
            className="border border-green-400 text-green-400 py-6 rounded hover:bg-green-400 hover:text-black disabled:border-neutral-700 disabled:text-neutral-600 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          >
            {g.name}
            {!g.ready && <div className="text-xs mt-1">coming soon</div>}
          </button>
        ))}
      </div>
    </div>
  )
}
