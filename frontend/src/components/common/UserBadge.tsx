import { useAuth } from '../../hooks/useAuth'

// Logged-in user's avatar, name, chip balance and a logout button.
export default function UserBadge() {
  const { user, logout } = useAuth()
  if (!user) return null

  return (
    <div className="flex items-center gap-3 text-sm">
      {user.avatarUrl && <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />}
      <span>{user.displayName}</span>
      <span className="text-yellow-400">{user.chips} chips</span>
      <button onClick={logout} className="text-neutral-400 hover:text-white">Log out</button>
    </div>
  )
}
