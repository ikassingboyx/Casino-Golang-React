import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import ProfileModal from './ProfileModal'

// Logged-in user's avatar, name and chip balance; opens their profile.
export default function UserBadge() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  if (!user) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open your profile"
        className="flex items-center gap-3 rounded-full text-sm transition hover:text-brass-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light"
      >
        {user.avatarUrl && <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />}
        <span>{user.displayName}</span>
        <span className="text-yellow-400">{user.chips.toLocaleString()} chips</span>
      </button>
      <ProfileModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
