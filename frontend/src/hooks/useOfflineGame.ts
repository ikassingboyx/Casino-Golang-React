import { useCallback, useEffect, useRef, useState } from 'react'
import { offlineAction, startOfflineGame, type ActionPayload, type GameResponse } from '../api/game'
import { useAuthStore } from '../store/authStore'
import { apiErrorMessage } from '../utils/apiError'
import type { GameType } from '../types/game'

interface Options {
  // Update the balance shown in the header as soon as a response arrives.
  // Games that animate the outcome (roulette) turn this off and call
  // syncChips themselves once the animation has finished.
  autoSyncChips?: boolean
}

// Shows a new balance in the header (auth store).
export function syncChips(chips: number) {
  const { user, setUser } = useAuthStore.getState()
  if (user) setUser({ ...user, chips })
}

// Drives an offline game of any type: starts (or resumes) a round on mount,
// sends actions, and keeps the user's chip balance in sync.
export function useOfflineGame<State>(gameType: GameType, { autoSyncChips = true }: Options = {}) {
  const [game, setGame] = useState<GameResponse<State> | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (request: () => Promise<GameResponse<State>>) => {
    setBusy(true)
    setError(null)
    try {
      const res = await request()
      setGame(res)
      if (autoSyncChips) syncChips(res.chips)
      return res
    } catch (err) {
      setError(apiErrorMessage(err))
      return null
    } finally {
      setBusy(false)
    }
  }, [autoSyncChips])

  const start = useCallback(() => run(() => startOfflineGame<State>(gameType)), [run, gameType])

  // gameId defaults to the current game; pass one to act on a round that was just started.
  const act = useCallback(
    (action: string, payload?: ActionPayload, gameId = game?.gameId) =>
      gameId ? run(() => offlineAction<State>(gameId, action, payload)) : Promise.resolve(null),
    [run, game?.gameId],
  )

  // Guard against StrictMode running the mount effect twice in dev.
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    start()
  }, [start])

  return { game, busy, error, setError, start, act }
}
