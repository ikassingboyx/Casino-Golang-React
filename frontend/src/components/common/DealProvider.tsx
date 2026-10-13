import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { DEAL_STAGGER, DealContext, DealingContext, type DealTurn, type Ticket } from './dealing'

// Wraps a card table; see dealing.ts.
export default function DealProvider({ children }: { children: ReactNode }) {
  const shoeRef = useRef<HTMLDivElement | null>(null)
  const discardRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState(0)
  const batch = useRef<Ticket[] | null>(null)
  const queueEnd = useRef(0) // when the previous deal finishes (performance.now ms)

  const requestTurn = useCallback((order: number, duration: number): DealTurn => {
    let resolve!: (d: number) => void
    const delay = new Promise<number>(r => (resolve = r))
    const ticket: Ticket = { order, cancelled: false, resolve }
    let finished = false
    setActive(n => n + 1)
    const finish = () => {
      if (finished) return
      finished = true
      setActive(n => n - 1)
    }

    if (!batch.current) {
      batch.current = []
      // Every card mounted in this React commit has registered by now.
      queueMicrotask(() => {
        const tickets = (batch.current ?? []).filter(t => !t.cancelled).sort((a, b) => a.order - b.order)
        batch.current = null
        const now = performance.now()
        const start = Math.max(0, queueEnd.current - now) / 1000
        tickets.forEach((t, i) => t.resolve(start + i * DEAL_STAGGER))
        if (tickets.length) queueEnd.current = now + (start + (tickets.length - 1) * DEAL_STAGGER + duration) * 1000
      })
    }
    batch.current.push(ticket)

    return {
      delay,
      done: finish,
      cancel: () => {
        ticket.cancelled = true
        finish()
      },
    }
  }, [])

  const value = useMemo(() => ({ shoeRef, discardRef, requestTurn }), [requestTurn])
  return (
    <DealContext.Provider value={value}>
      <DealingContext.Provider value={active > 0}>{children}</DealingContext.Provider>
    </DealContext.Provider>
  )
}
