import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  background?: string // the game's own floor, shown behind the table
  dock?: ReactNode // the player's controls and chips, pinned under the table
  children: ReactNode
}

// Page frame for every game, sized to the window so the table never scrolls:
// the table fills the screen, a close button leads back to the lobby and
// the controls are docked below.
export default function GameShell({ background, dock, children }: Props) {
  return (
    <div className="relative isolate flex h-svh flex-col overflow-hidden bg-room text-ivory">
      {background && <div className="absolute inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: `url('${background}')` }} />}
      <Link
        to="/lobby"
        aria-label="Leave the table"
        title="Back to the lobby"
        className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-[#1a0806] text-ivory/80 shadow-[0_4px_12px_rgba(0,0,0,0.5)] ring-1 ring-brass/50 transition hover:text-ivory hover:ring-brass-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </Link>
      {/* On narrow screens the table reaches the top edge, so leave room for the close button. */}
      <main className="relative flex min-h-0 flex-1 items-center justify-center p-2 max-sm:pt-14 sm:px-4">{children}</main>
      {dock && <footer className="shrink-0 border-t border-brass/25 bg-[#1a0806] px-3 py-2.5">{dock}</footer>}
    </div>
  )
}
