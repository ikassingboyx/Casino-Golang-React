package models

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

type User struct {
	ID               UUID       `json:"id" db:"id"`
	Email            *string    `json:"email" db:"email"`
	DisplayName      string     `json:"displayName" db:"display_name"`
	AvatarURL        *string    `json:"avatarUrl" db:"avatar_url"`
	Chips            int64      `json:"chips" db:"chips"`
	LastDailyBonusAt *time.Time `json:"lastDailyBonusAt" db:"last_daily_bonus_at"`
	CreatedAt        time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt        time.Time  `json:"updatedAt" db:"updated_at"`
}

type UUID = string

// OAuthProfile is the user info returned by a social login provider.
type OAuthProfile struct {
	Provider      string
	ProviderID    string
	Email         string
	EmailVerified bool
	Name          string
	AvatarURL     string
}

var ErrUserNotFound = errors.New("user not found")

const userColumns = `id, email, display_name, avatar_url, chips, last_daily_bonus_at, created_at, updated_at`

type rowQuerier interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

func GetUserByID(ctx context.Context, db rowQuerier, id string) (*User, error) {
	var u User
	err := db.QueryRowContext(ctx, `SELECT `+userColumns+` FROM users WHERE id = $1`, id).Scan(
		&u.ID, &u.Email, &u.DisplayName, &u.AvatarURL, &u.Chips, &u.LastDailyBonusAt, &u.CreatedAt, &u.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// FindOrCreateOAuthUser returns the user linked to this provider login. A
// first-time login is linked to an existing user with the same verified
// email, or creates a new user.
func FindOrCreateOAuthUser(ctx context.Context, db *sql.DB, p *OAuthProfile) (*User, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var userID string
	err = tx.QueryRowContext(ctx,
		`SELECT user_id FROM user_identities WHERE provider = $1 AND provider_user_id = $2`,
		p.Provider, p.ProviderID,
	).Scan(&userID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	if userID == "" {
		// Only trust emails the provider has verified.
		var email *string
		if p.EmailVerified && p.Email != "" {
			e := strings.ToLower(p.Email)
			email = &e
			err = tx.QueryRowContext(ctx, `SELECT id FROM users WHERE email = $1`, e).Scan(&userID)
			if err != nil && !errors.Is(err, sql.ErrNoRows) {
				return nil, err
			}
		}

		if userID == "" {
			var avatar *string
			if p.AvatarURL != "" {
				avatar = &p.AvatarURL
			}
			err = tx.QueryRowContext(ctx,
				`INSERT INTO users (email, display_name, avatar_url) VALUES ($1, $2, $3) RETURNING id`,
				email, displayName(p), avatar,
			).Scan(&userID)
			if err != nil {
				return nil, err
			}
		}

		_, err = tx.ExecContext(ctx,
			`INSERT INTO user_identities (user_id, provider, provider_user_id) VALUES ($1, $2, $3)`,
			userID, p.Provider, p.ProviderID,
		)
		if err != nil {
			return nil, err
		}
	}

	user, err := GetUserByID(ctx, tx, userID)
	if err != nil {
		return nil, err
	}
	return user, tx.Commit()
}

// displayName picks a name that fits users.display_name (VARCHAR(50)).
func displayName(p *OAuthProfile) string {
	name := strings.TrimSpace(p.Name)
	if name == "" && p.Email != "" {
		name = strings.SplitN(p.Email, "@", 2)[0]
	}
	if name == "" {
		name = "Player"
	}
	if r := []rune(name); len(r) > 50 {
		name = string(r[:50])
	}
	return name
}
