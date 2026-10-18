import { useEffect, useState } from 'react'

// Whole seconds left until `deadline` (ms, this browser's clock), ticking
// down; null without a deadline.
export function useCountdown(deadline: number | null): number | null {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!deadline) return
    const tick = () => setNow(Date.now())
    const t = setInterval(tick, 250)
    tick()
    return () => clearInterval(t)
  }, [deadline])
  if (!deadline) return null
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}
