package models

import (
	"encoding/json"
	"time"
)

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
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
	AvatarURL   string `json:"avatarUrl"`
	IsHost      bool   `json:"isHost"`
}
