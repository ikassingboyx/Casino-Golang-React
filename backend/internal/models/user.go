package models

import "time"

type User struct {
	ID                UUID      `json:"id" db:"id"`
	Email             string    `json:"email" db:"email"`
	PasswordHash      *string   `json:"-" db:"password_hash"`
	DisplayName       string    `json:"displayName" db:"display_name"`
	AvatarURL         *string   `json:"avatarUrl" db:"avatar_url"`
	OAuthProvider     *string   `json:"oauthProvider" db:"oauth_provider"`
	OAuthID           *string   `json:"-" db:"oauth_id"`
	Chips             int64     `json:"chips" db:"chips"`
	LastDailyBonusAt  *time.Time `json:"lastDailyBonusAt" db:"last_daily_bonus_at"`
	CreatedAt         time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt         time.Time `json:"updatedAt" db:"updated_at"`
}

type UUID = string
