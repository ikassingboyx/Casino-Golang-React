import { useEffect, useState } from 'react'
import { getOAuthProviders, oauthLoginURL, type OAuthProvider } from '../../api/auth'

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
)

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
    <path fill="currentColor" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
  </svg>
)

const GitHubIcon = () => (
  <svg viewBox="0 0 16 16" className="h-5 w-5" aria-hidden>
    <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
)

const buttons: { provider: OAuthProvider; label: string; icon: () => React.ReactElement; className: string }[] = [
  { provider: 'google', label: 'Continue with Google', icon: GoogleIcon, className: 'bg-white text-neutral-800 hover:bg-neutral-100' },
  { provider: 'facebook', label: 'Continue with Facebook', icon: FacebookIcon, className: 'bg-[#1877F2] text-white hover:bg-[#166FE5]' },
  { provider: 'github', label: 'Continue with GitHub', icon: GitHubIcon, className: 'bg-[#24292F] text-white ring-1 ring-white/20 hover:bg-[#32383F]' },
]

// Social login buttons. Signing in for the first time also creates the account.
// Providers the backend hasn't configured are shown disabled.
export default function OAuthButtons() {
  const [enabled, setEnabled] = useState<OAuthProvider[] | null>(null)
  const [unreachable, setUnreachable] = useState(false)

  useEffect(() => {
    getOAuthProviders()
      .then(res => setEnabled(res.data.providers))
      .catch(() => setUnreachable(true))
  }, [])

  return (
    <div className="flex w-full flex-col gap-3">
      {buttons.map(({ provider, label, icon: Icon, className }) => {
        const available = enabled?.includes(provider)
        return available ? (
          <a key={provider} href={oauthLoginURL(provider)} className={`flex items-center justify-center gap-3 rounded-lg px-4 py-3 font-medium transition-colors ${className}`}>
            <Icon />
            {label}
          </a>
        ) : (
          <div key={provider} title="Not configured on the server" className={`flex cursor-not-allowed items-center justify-center gap-3 rounded-lg px-4 py-3 font-medium opacity-40 ${className}`}>
            <Icon />
            {label}
          </div>
        )
      })}
      {unreachable && <p className="text-center text-sm text-red-400">Can't reach the server. Is the backend running?</p>}
    </div>
  )
}
