package ws

import (
	"encoding/json"
	"log"
)

type Hub struct {
	rooms      map[string]*Room
	clients    map[*Client]bool
	register   chan *Client
	unregister chan *Client
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[string]*Room),
		clients:    make(map[*Client]bool),
		register:   make(chan *Client, 16),
		unregister: make(chan *Client, 16),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			room := h.getOrCreateRoom(client.RoomID)
			room.add(client)
			log.Printf("client %s joined room %s", client.PlayerID, client.RoomID)

		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				if room, ok := h.rooms[client.RoomID]; ok {
					room.remove(client)
				}
				log.Printf("client %s left room %s", client.PlayerID, client.RoomID)
			}
		}
	}
}

func (h *Hub) getOrCreateRoom(roomID string) *Room {
	if r, ok := h.rooms[roomID]; ok {
		return r
	}
	r := newRoom(roomID)
	h.rooms[roomID] = r
	return r
}

func (h *Hub) handleMessage(c *Client, raw []byte) {
	var msg Message
	if err := json.Unmarshal(raw, &msg); err != nil {
		log.Printf("ws parse error: %v", err)
		return
	}

	room, ok := h.rooms[c.RoomID]
	if !ok {
		return
	}

	switch msg.Type {
	case MsgPing:
		data, _ := json.Marshal(Message{Type: MsgPong})
		c.send <- data
	case MsgStartGame, MsgPlayerAction, MsgPlaceBet, MsgLeaveRoom:
		room.handleMessage(c, msg)
	default:
		log.Printf("unknown ws message type: %s", msg.Type)
	}
}

// Register adds a client to the hub.
func (h *Hub) Register(c *Client) {
	h.register <- c
}

// BroadcastToRoom sends a message to all clients in a room.
func (h *Hub) BroadcastToRoom(roomID string, msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	if room, ok := h.rooms[roomID]; ok {
		room.broadcast(data)
	}
}

// SendToPlayer sends a message to one specific player.
func (h *Hub) SendToPlayer(roomID, playerID string, msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	if room, ok := h.rooms[roomID]; ok {
		room.sendToPlayer(playerID, data)
	}
}
