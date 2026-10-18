import { useCallback, useState } from 'react'
import { claimChips } from '../../api/user'
import { useAuth } from '../../hooks/useAuth'
import { useCountdown } from '../../hooks/useCountdown'
import { useAuthStore } from '../../store/authStore'
import { apiErrorMessage } from '../../utils/apiError'
import Modal from './Modal'

const CLAIM_AMOUNT = 3000 // models.ChipClaimAmount, once an hour

function formatWait(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// The player's profile: balance, the hourly chip top-up and logging out.
export default function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const next = user?.nextChipClaimAt ? Date.parse(user.nextChipClaimAt) : null
  const wait = useCountdown(next)
  const canClaim = !wait

  const close = useCallback(() => {
    setError(null)
    onClose()
  }, [onClose])

  const claim = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await claimChips()
      useAuthStore.getState().setUser(res.data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (!user) return null
  return (
    <Modal open={open} onClose={close} label="Your profile">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4 pr-8">
          {user.avatarUrl && <img src={user.avatarUrl} alt="" className="h-14 w-14 rounded-full ring-2 ring-brass/50" referrerPolicy="no-referrer" />}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass/80">Your profile</p>
            <h2 className="truncate font-felt text-3xl text-brass-light">{user.displayName}</h2>
          </div>
        </div>

        <div className="rounded-xl bg-black/30 p-4 ring-1 ring-ivory/10">
          <p className="text-sm text-ivory/60">Balance</p>
          <p className="font-felt text-3xl text-yellow-400">{user.chips.toLocaleString()} chips</p>
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={claim} disabled={busy || !canClaim} className="dock-primary">
            {canClaim ? `Add ${CLAIM_AMOUNT.toLocaleString()} chips` : `More chips in ${formatWait(wait)}`}
          </button>
          <p className="text-center text-xs text-ivory/50">You can add {CLAIM_AMOUNT.toLocaleString()} chips once an hour.</p>
        </div>

        {error && <p className="rounded-lg bg-banco/20 px-3 py-2 text-sm text-ivory ring-1 ring-banco/40">{error}</p>}

        <button onClick={logout} className="dock-btn self-center">Log out</button>
      </div>
    </Modal>
  )
}
