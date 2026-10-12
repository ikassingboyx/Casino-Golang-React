import { Navigate, useSearchParams } from 'react-router-dom'
import OAuthButtons from '../components/auth/OAuthButtons'
import { useAuthStore } from '../store/authStore'

const errorMessages: Record<string, string> = {
  cancelled: 'Login was cancelled.',
  invalid_state: 'Login expired or was started in another tab. Please try again.',
  session_failed: 'Could not load your account. Please try again.',
}

export default function LoginPage() {
  const token = useAuthStore(s => s.token)
  const [params] = useSearchParams()
  const error = params.get('error')

  if (token) return <Navigate to="/" replace />

  return (
    <div
      className="relative flex min-h-svh items-center justify-center bg-[#1a0306] bg-cover bg-center px-4"
      style={{ backgroundImage: "url('/assets/images/login-bg.svg')" }}
    >
      {/* Darken the edges and behind the card so the buttons stay readable. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.25)_45%,rgba(0,0,0,0.6)_100%)]" />
      <div className="relative flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl bg-black/55 p-8 shadow-2xl ring-1 ring-yellow-400/30 backdrop-blur-md">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-wide text-yellow-400 drop-shadow-[0_0_12px_rgba(255,190,80,0.6)]">Casino</h1>
          <p className="mt-2 text-sm text-neutral-300">Sign in or create an account to play</p>
        </div>
        {error && (
          <p className="w-full rounded-lg bg-red-500/15 px-3 py-2 text-center text-sm text-red-200">
            {errorMessages[error] ?? 'Login failed. Please try again.'}
          </p>
        )}
        <OAuthButtons />
        <p className="text-center text-xs text-neutral-400">New players start with 1000 chips.</p>
      </div>
    </div>
  )
}
