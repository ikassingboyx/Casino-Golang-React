package ws

import (
	"encoding/json"

	"casino/internal/models"
)

// Message is the envelope for all WebSocket communication. ID is optional:
// a client sets it on a request and the server's ack echoes it.
type Message struct {
	Type string          `json:"type"`
	ID   string          `json:"id,omitempty"`
	Data json.RawMessage `json:"data,omitempty"`
}

// Outbound message types (server → client)
const (
	MsgRoomState = "room_state" // RoomInfo: who is at the table, who hosts, waiting or playing
	MsgGameState = "game_state" // GameUpdate: the current round, as this player may see it
	MsgAck       = "ack"        // Ack: a request (by ID) was handled
	MsgError     = "error"      // ErrorInfo
	MsgPong      = "pong"
)

// Inbound message types (client → server)
const (
	MsgStartGame    = "start_game"    // host only, while the room is waiting
	MsgPlayerAction = "player_action" // data: models.Action
	MsgAddBot       = "add_bot"       // poker, host only: seat a bot in the next free seat
	MsgRemoveBot    = "remove_bot"    // poker, host only; data: { userId }
	MsgLeaveRoom    = "leave_room"
	MsgPing         = "ping"
)

type RoomInfo struct {
	Code       string              `json:"code"`
	GameType   string              `json:"gameType"`
	HostID     string              `json:"hostId"`
	Status     string              `json:"status"` // waiting, playing
	MaxPlayers int                 `json:"maxPlayers"`
	Players    []models.RoomPlayer `json:"players"`
}

// GameUpdate has the same shape as an offline game response, so the game
// pages can show either.
type GameUpdate struct {
	GameID string             `json:"gameId"`
	State  any                `json:"state"`
	Chips  int64              `json:"chips"`            // the player's balance
	Result *models.ChipChange `json:"result,omitempty"` // the player's net win/loss, once the round is over
	// TimeLeft (ms) is how long until the clock runs out on the decision the
	// round is waiting on, or until the next round once it is over. Relative,
	// so the players' clocks don't need to agree with the server's.
	TimeLeft int64  `json:"timeLeft,omitempty"`
	Clock    string `json:"clock,omitempty"` // what the clock is for: bets, turn or next (round)
}

type Ack struct {
	Error string `json:"error,omitempty"`
}

type ErrorInfo struct {
	Message string `json:"message"`
	Fatal   bool   `json:"fatal,omitempty"` // the connection is closed: room not found, full, …
}

func encode(typ string, data any) []byte {
	raw, _ := json.Marshal(data)
	msg, _ := json.Marshal(Message{Type: typ, Data: raw})
	return msg
}
