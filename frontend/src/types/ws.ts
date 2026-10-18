// Envelope of every WebSocket message. A request may carry an id; the
// server's `ack` for it echoes the id.
export interface WSMessage<T = unknown> {
  type: WSMessageType
  id?: string
  data?: T
}

export type WSMessageType =
  // server → client
  | 'room_state' | 'game_state' | 'ack' | 'error' | 'pong'
  // client → server
  | 'start_game' | 'player_action' | 'add_bot' | 'remove_bot' | 'leave_room' | 'ping'

export interface WSAck {
  error?: string
}

export interface WSError {
  message: string
  fatal?: boolean // the server closed the connection: no such table, table full…
}
