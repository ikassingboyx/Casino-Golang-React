import { useCallback, useEffect, useState } from 'react'
import { RoomConnection } from '../api/ws'
import { useRoomStore } from '../store/roomStore'
import type { ActionPayload, GameResponse } from '../api/game'
import type { Room } from '../types/room'
import type { WSError } from '../types/ws'
import type { GameSession } from './useOfflineGame'
import { syncChips } from './useOfflineGame'

// The open connection, shared by the room page and the game it shows.
let connection: RoomConnection | null = null

// Joins the room with this code for as long as the calling component is
// mounted; leaving the page leaves the room.
export function useRoom(code: string) {
  useEffect(() => {
    const store = useRoomStore
    store.getState().reset(code)
    const conn = new RoomConnection(code, {
      onStatus: connected => store.setState({ connected }),
      onMessage: msg => {
        switch (msg.type) {
          case 'room_state': {
            const room = msg.data as Room
            store.setState(s => ({ room, notice: room.status === 'playing' ? null : s.notice }))
            break
          }
          case 'game_state': {
            const game = msg.data as GameResponse<unknown>
            store.setState({ game, deadline: game.timeLeft ? Date.now() + game.timeLeft : null })
            break
          }
          case 'error': {
            const err = msg.data as WSError
            store.setState(err.fatal ? { fatal: err.message } : { notice: err.message })
            break
          }
        }
      },
    })
    connection = conn
    return () => {
      conn.close()
      if (connection === conn) connection = null
      // The balance may have changed at the table; the next page refreshes it.
      const game = store.getState().game
      if (game) syncChips(game.chips)
      store.getState().reset(null)
    }
  }, [code])

  const start = useCallback(() => request('start_game'), [])
  return { start }
}

const request = (type: 'start_game' | 'add_bot' | 'remove_bot', data?: unknown) =>
  connection?.request(type, data) ?? Promise.resolve('Not connected')

// Poker, host only: seat a bot in the next free seat, or take one away. At a
// game in play the change applies from the next hand.
export const addBot = () => request('add_bot')
export const removeBot = (userId: string) => request('remove_bot', { userId })

// The round in the current room, driven like an offline game: actions go to
// the server and the table updates when the server says what happened.
export function useOnlineGame<State>(): GameSession<State> {
  const game = useRoomStore(s => s.game) as GameResponse<State> | null
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const act = useCallback(async (action: string, payload: ActionPayload = {}) => {
    if (!connection) return null
    setBusy(true)
    setError(null)
    const err = await connection.request('player_action', { action, ...payload })
    setBusy(false)
    if (err) {
      setError(err)
      return null
    }
    // Updates arrive before the ack, so the store has the result.
    return useRoomStore.getState().game as GameResponse<State> | null
  }, [])

  // Online the server deals each round; there is nothing to start.
  const start = useCallback(async () => useRoomStore.getState().game as GameResponse<State> | null, [])

  return { game, busy, error, setError, start, act, online: true }
}
