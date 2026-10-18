package models

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/lib/pq"
)

// MaxRoomPlayers is how many players fit at an online table.
const MaxRoomPlayers = 5

type Room struct {
	ID        string          `json:"id" db:"id"`
	Code      string          `json:"code" db:"code"`
	GameType  string          `json:"gameType" db:"game_type"`
	HostID    string          `json:"hostId" db:"host_id"`
	Status    string          `json:"status" db:"status"`
	Settings  json.RawMessage `json:"settings" db:"settings"`
	CreatedAt time.Time       `json:"createdAt" db:"created_at"`
}

type RoomSettings struct {
	BigBlind   int `json:"bigBlind,omitempty"`
	MaxPlayers int `json:"maxPlayers"`
}

type RoomPlayer struct {
	UserID      string  `json:"userId"`
	DisplayName string  `json:"displayName"`
	AvatarURL   *string `json:"avatarUrl"`
	Chips       int64   `json:"chips"`
	IsHost      bool    `json:"isHost"`
	Connected   bool    `json:"connected"`
	IsBot       bool    `json:"isBot"`
}

var ErrRoomCodeTaken = errors.New("room code taken")

// CreateRoom stores a new open room. It fails with ErrRoomCodeTaken if another
// open room already has this code.
func CreateRoom(ctx context.Context, db rowQuerier, code, gameType, hostID string) (string, error) {
	settings, _ := json.Marshal(RoomSettings{MaxPlayers: MaxRoomPlayers})
	var id string
	err := db.QueryRowContext(ctx,
		`INSERT INTO rooms (code, game_type, host_id, settings) VALUES ($1, $2, $3, $4) RETURNING id`,
		code, gameType, hostID, settings,
	).Scan(&id)
	var pqErr *pq.Error
	if errors.As(err, &pqErr) && pqErr.Code == "23505" { // unique_violation
		return "", ErrRoomCodeTaken
	}
	return id, err
}

func SetRoomStatus(ctx context.Context, db execQuerier, id, status string) error {
	_, err := db.ExecContext(ctx, `UPDATE rooms SET status = $2 WHERE id = $1`, id, status)
	return err
}

// CloseOpenRooms marks every room finished. Live rooms are kept in memory, so
// after a restart none of them exist any more and their codes can be reused.
func CloseOpenRooms(ctx context.Context, db *sql.DB) error {
	_, err := db.ExecContext(ctx, `UPDATE rooms SET status = 'finished' WHERE status <> 'finished'`)
	return err
}

// CreateRoomGame stores one round played in a room.
func CreateRoomGame(ctx context.Context, db rowQuerier, roomID, gameType string, state any) (string, error) {
	data, err := json.Marshal(state)
	if err != nil {
		return "", err
	}
	var id string
	err = db.QueryRowContext(ctx,
		`INSERT INTO games (room_id, game_type, state) VALUES ($1, $2, $3) RETURNING id`,
		roomID, gameType, data,
	).Scan(&id)
	return id, err
}
