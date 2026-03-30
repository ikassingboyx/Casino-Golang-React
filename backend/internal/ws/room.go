package ws

import "log"

type Room struct {
	id      string
	clients map[*Client]bool
}

func newRoom(id string) *Room {
	return &Room{
		id:      id,
		clients: make(map[*Client]bool),
	}
}

func (r *Room) add(c *Client) {
	r.clients[c] = true
}

func (r *Room) remove(c *Client) {
	delete(r.clients, c)
}

func (r *Room) broadcast(data []byte) {
	for c := range r.clients {
		select {
		case c.send <- data:
		default:
			log.Printf("ws send buffer full for player %s", c.PlayerID)
		}
	}
}

func (r *Room) sendToPlayer(playerID string, data []byte) {
	for c := range r.clients {
		if c.PlayerID == playerID {
			select {
			case c.send <- data:
			default:
			}
			return
		}
	}
}

func (r *Room) handleMessage(c *Client, msg Message) {
	// TODO: route to game engine
	log.Printf("room %s received %s from player %s", r.id, msg.Type, c.PlayerID)
}
