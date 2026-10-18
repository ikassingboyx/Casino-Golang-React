import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import LobbyPage from './pages/LobbyPage'
import RoomPage from './pages/RoomPage'
import BlackjackPage from './pages/BlackjackPage'
import PokerPage from './pages/PokerPage'
import BaccaratPage from './pages/BaccaratPage'
import RoulettePage from './pages/RoulettePage'
import { rememberReturnPath } from './utils/returnPath'
import { useAuthStore } from './store/authStore'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.token)
  const location = useLocation()
  if (token) return <>{children}</>
  // Come back here after logging in, e.g. to a room from an invite link.
  rememberReturnPath(location.pathname)
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/lobby" replace />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route path="/lobby" element={<PrivateRoute><LobbyPage /></PrivateRoute>} />
        <Route path="/room/:code" element={<PrivateRoute><RoomPage /></PrivateRoute>} />
        {/* Online games are played in their room: /room/:code. */}
        <Route path="/game/blackjack/offline" element={<PrivateRoute><BlackjackPage /></PrivateRoute>} />
        <Route path="/game/poker/offline" element={<PrivateRoute><PokerPage /></PrivateRoute>} />
        <Route path="/game/baccarat/offline" element={<PrivateRoute><BaccaratPage /></PrivateRoute>} />
        <Route path="/game/roulette/offline" element={<PrivateRoute><RoulettePage /></PrivateRoute>} />

        {/* Unknown URLs go to the lobby (or login, via PrivateRoute). */}
        <Route path="*" element={<Navigate to="/lobby" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
