import { useAuthStore } from '../store/authStore'
import type { WSAck, WSMessage, WSMessageType } from '../types/ws'

// Same origin as the app unless VITE_WS_URL says otherwise.
const WS_URL = import.meta.env.VITE_WS_URL ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`

const RETRY_MS = [500, 1000, 2000, 4000, 8000]

interface Handlers {
  onMessage: (msg: WSMessage) => void
  onStatus: (connected: boolean) => void
}

// A player's connection to an online room. Connecting joins the room; if the
// connection drops it reconnects (the server holds the seat meanwhile), until
// close() is called or the server turns the player away (a fatal error).
export class RoomConnection {
  private ws: WebSocket | null = null
  private closed = false
  private retries = 0
  private retryTimer: number | undefined
  private seq = 0
  private pending = new Map<string, (ack: WSAck) => void>()
  private readonly code: string
  private readonly handlers: Handlers

  constructor(code: string, handlers: Handlers) {
    this.code = code
    this.handlers = handlers
    this.connect()
  }

  private connect() {
    const token = useAuthStore.getState().token ?? ''
    const ws = new WebSocket(`${WS_URL}/ws?token=${encodeURIComponent(token)}&code=${encodeURIComponent(this.code)}`)
    this.ws = ws
    ws.onopen = () => {
      this.retries = 0
      this.handlers.onStatus(true)
    }
    ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data)
      if (msg.type === 'ack' && msg.id) {
        this.pending.get(msg.id)?.(msg.data as WSAck)
        this.pending.delete(msg.id)
        return
      }
      if (msg.type === 'error' && (msg.data as { fatal?: boolean })?.fatal) this.closed = true
      this.handlers.onMessage(msg)
    }
    ws.onclose = () => {
      if (this.ws !== ws) return
      this.handlers.onStatus(false)
      for (const resolve of this.pending.values()) resolve({ error: 'Connection lost' })
      this.pending.clear()
      if (this.closed) return
      const wait = RETRY_MS[Math.min(this.retries++, RETRY_MS.length - 1)]
      this.retryTimer = window.setTimeout(() => this.connect(), wait)
    }
  }

  send(type: WSMessageType, data?: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type, data }))
  }

  // Sends a request and resolves once the server has handled it, with the
  // server's error if it was refused.
  request(type: WSMessageType, data?: unknown): Promise<string | null> {
    if (this.ws?.readyState !== WebSocket.OPEN) return Promise.resolve('Not connected to the table')
    const id = String(++this.seq)
    return new Promise(resolve => {
      this.pending.set(id, ack => resolve(ack.error ?? null))
      this.ws!.send(JSON.stringify({ type, id, data }))
    })
  }

  // Leaves the room for good.
  close() {
    this.closed = true
    window.clearTimeout(this.retryTimer)
    this.send('leave_room')
    this.ws?.close()
    this.ws = null
  }
}
