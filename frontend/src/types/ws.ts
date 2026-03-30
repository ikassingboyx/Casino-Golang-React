export interface WSMessage<T = unknown> {
  type: string
  data?: T
}

export type WSMessageType =
  | 'game_state' | 'player_joined' | 'player_left'
  | 'game_started' | 'action_result' | 'game_over'
  | 'timer_tick' | 'error' | 'pong'
  | 'start_game' | 'player_action' | 'place_bet' | 'leave_room' | 'ping'
