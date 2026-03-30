package ws

import "encoding/json"

// Message is the envelope for all WebSocket communication.
type Message struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data,omitempty"`
}

// Outbound message types (server → client)
const (
	MsgGameState    = "game_state"
	MsgPlayerJoined = "player_joined"
	MsgPlayerLeft   = "player_left"
	MsgGameStarted  = "game_started"
	MsgActionResult = "action_result"
	MsgGameOver     = "game_over"
	MsgTimerTick    = "timer_tick"
	MsgError        = "error"
	MsgPong         = "pong"
)

// Inbound message types (client → server)
const (
	MsgStartGame    = "start_game"
	MsgPlayerAction = "player_action"
	MsgPlaceBet     = "place_bet"
	MsgLeaveRoom    = "leave_room"
	MsgPing         = "ping"
)
