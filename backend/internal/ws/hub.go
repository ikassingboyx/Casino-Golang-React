package ws

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math/rand"
	"sync"

	"casino/internal/bot"
	"casino/internal/models"
)

// Hub holds the open online rooms, by code. Rooms live in memory; the rooms
// table only records them (and anchors their games in the chip ledger).
type Hub struct {
	db    *sql.DB
	mu    sync.Mutex
	rooms map[string]*Room
}

func NewHub(db *sql.DB) *Hub {
	return &Hub{db: db, rooms: make(map[string]*Room)}
}

var ErrUnknownGame = errors.New("unknown game")

// CreateRoom opens a room with a fresh 5-digit code. The host joins it by
// connecting, like everyone else.
func (h *Hub) CreateRoom(ctx context.Context, gameType, hostID string) (*Room, error) {
	engine, ok := bot.NewEngine(gameType)
	if !ok {
		return nil, ErrUnknownGame
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	for try := 0; try < 20; try++ {
		code := fmt.Sprintf("%05d", 10000+rand.Intn(90000))
		if _, taken := h.rooms[code]; taken {
			continue
		}
		id, err := models.CreateRoom(ctx, h.db, code, gameType, hostID)
		if errors.Is(err, models.ErrRoomCodeTaken) {
			continue
		}
		if err != nil {
			return nil, err
		}
		r := newRoom(h, id, code, gameType, hostID, engine)
		h.rooms[code] = r
		r.mu.Lock()
		r.scheduleCleanup(abandonedRoomTTL)
		r.mu.Unlock()
		return r, nil
	}
	return nil, errors.New("no free room code, try again")
}

// Room returns the open room with this code.
func (h *Hub) Room(code string) (*Room, bool) {
	h.mu.Lock()
	defer h.mu.Unlock()
	r, ok := h.rooms[code]
	return r, ok
}

func (h *Hub) remove(r *Room) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[r.Code] == r {
		delete(h.rooms, r.Code)
	}
}
