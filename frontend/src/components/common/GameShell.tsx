import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import UserBadge from './UserBadge'

// Page frame for every game: back to the lobby on the left, the user on the right.
export default function GameShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center gap-4 bg-neutral-950 px-4 py-6 text-white">
      <div className="flex w-full max-w-4xl flex-wrap items-center justify-between gap-3">
        <Link to="/lobby" className="text-sm text-neutral-400 hover:text-white">← Lobby</Link>
        <UserBadge />
      </div>
      {children}
    </div>
  )
}
