import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import UserBadge from './UserBadge'

interface Props {
  title?: string
  dock?: ReactNode // the player's controls, pinned under the table
  children: ReactNode
}

// Page frame for every game, sized to the window so the table never scrolls:
// a slim bar on top, the table filling the middle, the controls docked below.
export default function GameShell({ title, dock, children }: Props) {
  return (
    <div className="flex h-svh flex-col overflow-hidden bg-room bg-[radial-gradient(90%_70%_at_50%_45%,#2a1810_0%,#160d09_70%)] text-ivory">
      <header className="flex h-11 shrink-0 items-center justify-between gap-3 px-4">
        <Link to="/lobby" className="text-sm text-ivory/60 hover:text-ivory">← Lobby</Link>
        {title && <h1 className="hidden font-felt text-lg tracking-wide text-brass-light sm:block">{title}</h1>}
        <UserBadge />
      </header>
      <main className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-2 sm:px-4">{children}</main>
      {dock && <footer className="shrink-0 border-t border-brass/20 bg-black/40 px-3 py-2.5 backdrop-blur">{dock}</footer>}
    </div>
  )
}
