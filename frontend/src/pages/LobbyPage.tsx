import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe } from '../api/user'
import UserBadge from '../components/common/UserBadge'
import CasinoInterior from '../components/lobby/CasinoInterior'
import type { Spot } from '../components/lobby/GameSpot'
import { useAuthStore } from '../store/authStore'

// Stations on the casino floor, left to right (scene coordinates).
const spots: Spot[] = [
  { id: 'blackjack', name: 'Blackjack', x: 40, y: 440, ready: true },
  { id: 'poker', name: 'Poker', x: 505, y: 415, ready: false },
  { id: 'baccarat', name: 'Baccarat', x: 975, y: 415, ready: true },
  { id: 'roulette', name: 'Roulette', x: 1440, y: 440, ready: true },
]

export default function LobbyPage() {
  const navigate = useNavigate()

  // Refresh the profile; an expired token gets a 401 and logs out.
  useEffect(() => {
    getMe().then(res => useAuthStore.getState().setUser(res.data)).catch(() => {})
  }, [])

  return (
    <div className="relative h-svh overflow-hidden bg-[#160205] text-ivory">
      <CasinoInterior spots={spots} onOpen={spot => navigate(`/game/${spot.id}/offline`)} />
      <div className="absolute right-3 top-3 rounded-full bg-black/55 px-4 py-2 ring-1 ring-brass/30 backdrop-blur">
        <UserBadge />
      </div>
    </div>
  )
}
