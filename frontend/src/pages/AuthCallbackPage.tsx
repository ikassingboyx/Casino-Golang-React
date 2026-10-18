import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe } from '../api/user'
import { useAuthStore } from '../store/authStore'
import { takeReturnPath } from '../utils/returnPath'

// The backend redirects here after a social login with the JWT in the URL
// fragment (#token=...). Store it, load the user, then go to the app.
export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
    if (!token) {
      navigate('/login?error=session_failed', { replace: true })
      return
    }

    // Set the token first so the request below is authenticated.
    useAuthStore.setState({ token })
    getMe()
      .then(res => {
        useAuthStore.getState().login(token, res.data)
        navigate(takeReturnPath() ?? '/', { replace: true })
      })
      .catch(() => {
        useAuthStore.getState().logout()
        navigate('/login?error=session_failed', { replace: true })
      })
  }, [navigate])

  return <div className="flex min-h-svh items-center justify-center text-neutral-400">Signing you in…</div>
}
