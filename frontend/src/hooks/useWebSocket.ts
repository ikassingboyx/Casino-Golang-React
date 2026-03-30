import { useEffect, useRef, useCallback } from 'react'
import { createWebSocket } from '../api/ws'
import { useGameStore } from '../store/gameStore'
import type { WSMessage } from '../types/ws'

export function useWebSocket(roomId: string | null) {
  const ws = useRef<WebSocket | null>(null)
  const setGameState = useGameStore(s => s.setGameState)
  const setConnected = useGameStore(s => s.setConnected)

  useEffect(() => {
    if (!roomId) return

    ws.current = createWebSocket(roomId)

    ws.current.onopen = () => setConnected(true)
    ws.current.onclose = () => setConnected(false)

    ws.current.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data)
      if (msg.type === 'game_state' || msg.type === 'game_started') {
        setGameState(msg.data as any)
      }
    }

    return () => {
      ws.current?.close()
    }
  }, [roomId])

  const send = useCallback((type: string, data?: unknown) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, data }))
    }
  }, [])

  return { send }
}
