import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import LobbyPage from './pages/LobbyPage'
import RoomPage from './pages/RoomPage'
import BlackjackPage from './pages/BlackjackPage'
import PokerPage from './pages/PokerPage'
import BaccaratPage from './pages/BaccaratPage'
import RoulettePage from './pages/RoulettePage'
import ProfilePage from './pages/ProfilePage'
import { useAuthStore } from './store/authStore'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/lobby" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/lobby" element={<PrivateRoute><LobbyPage /></PrivateRoute>} />
        <Route path="/room/:code" element={<PrivateRoute><RoomPage /></PrivateRoute>} />
        <Route path="/game/blackjack/offline" element={<PrivateRoute><BlackjackPage offline /></PrivateRoute>} />
        <Route path="/game/blackjack/:roomId" element={<PrivateRoute><BlackjackPage /></PrivateRoute>} />
        <Route path="/game/poker/offline" element={<PrivateRoute><PokerPage offline /></PrivateRoute>} />
        <Route path="/game/poker/:roomId" element={<PrivateRoute><PokerPage /></PrivateRoute>} />
        <Route path="/game/baccarat/offline" element={<PrivateRoute><BaccaratPage offline /></PrivateRoute>} />
        <Route path="/game/baccarat/:roomId" element={<PrivateRoute><BaccaratPage /></PrivateRoute>} />
        <Route path="/game/roulette/offline" element={<PrivateRoute><RoulettePage offline /></PrivateRoute>} />
        <Route path="/game/roulette/:roomId" element={<PrivateRoute><RoulettePage /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
