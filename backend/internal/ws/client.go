package ws

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 16 * 1024
)

type Client struct {
	conn     *websocket.Conn
	send     chan []byte
	closed   bool
	PlayerID string
	room     *Room
}

func NewClient(conn *websocket.Conn, playerID string) *Client {
	return &Client{conn: conn, send: make(chan []byte, 256), PlayerID: playerID}
}

func Reject(conn *websocket.Conn, reason string) {
	conn.SetWriteDeadline(time.Now().Add(writeWait))
	conn.WriteMessage(websocket.TextMessage, encode(MsgError, ErrorInfo{Message: reason, Fatal: true}))
	conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
	conn.Close()
}

func (c *Client) Run() {
	go c.writePump()
	c.readPump()
}

// shutdown closes the send channel, once, which ends writePump and the
// connection; the caller holds the room's lock.
func (c *Client) shutdown() {
	if !c.closed {
		c.closed = true
		close(c.send)
	}
}

// queue sends without blocking; the caller holds the room's lock.
func (c *Client) queue(data []byte) {
	if c.closed {
		return
	}
	select {
	case c.send <- data:
	default:
		log.Printf("ws send buffer full for player %s", c.PlayerID)
	}
}

func (c *Client) readPump() {
	defer func() {
		c.room.disconnect(c)
		c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	for {
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseNormalClosure, websocket.CloseNoStatusReceived) {
				log.Printf("ws read error: %v", err)
			}
			return
		}
		var msg Message
		if err := json.Unmarshal(raw, &msg); err != nil {
			log.Printf("ws parse error: %v", err)
			continue
		}
		c.room.handleMessage(c, msg)
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
