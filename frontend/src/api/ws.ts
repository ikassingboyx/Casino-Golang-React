import { useAuthStore } from '../store/authStore'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080'

export function createWebSocket(roomId: string): WebSocket {
  const token = useAuthStore.getState().token ?? ''
  return new WebSocket(`${WS_URL}/ws?token=${token}&roomId=${roomId}`)
}
