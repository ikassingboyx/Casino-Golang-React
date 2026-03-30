import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const navigate = useNavigate()
  const { user, token, login, logout } = useAuthStore()

  const signOut = () => {
    logout()
    navigate('/login')
  }

  return { user, token, isLoggedIn: !!token, login, logout: signOut }
}
