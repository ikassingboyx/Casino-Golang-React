package models

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

type User struct {
	ID              UUID       `json:"id" db:"id"`
	Email           *string    `json:"email" db:"email"`
	DisplayName     string     `json:"displayName" db:"display_name"`
	AvatarURL       *string    `json:"avatarUrl" db:"avatar_url"`
	Chips           int64      `json:"chips" db:"chips"`
	LastChipClaimAt *time.Time `json:"-" db:"last_chip_claim_at"`
	// NextChipClaimAt is when the user may next claim chips; nil means now.
	NextChipClaimAt *time.Time `json:"nextChipClaimAt"`
	CreatedAt       time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt       time.Time  `json:"updatedAt" db:"updated_at"`
}

// Chips a user can add to their balance from their profile, once per
// ChipClaimInterval.
const (
	ChipClaimAmount   = 3000
	ChipClaimInterval = time.Hour
)

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

const userColumns = `id, email, display_name, avatar_url, chips, last_chip_claim_at, created_at, updated_at`

type rowQuerier interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

func GetUserByID(ctx context.Context, db rowQuerier, id string) (*User, error) {
	var u User
	err := db.QueryRowContext(ctx, `SELECT `+userColumns+` FROM users WHERE id = $1`, id).Scan(
		&u.ID, &u.Email, &u.DisplayName, &u.AvatarURL, &u.Chips, &u.LastChipClaimAt, &u.CreatedAt, &u.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	if u.LastChipClaimAt != nil {
		if next := u.LastChipClaimAt.Add(ChipClaimInterval); next.After(time.Now()) {
			u.NextChipClaimAt = &next
		}
	}
	return &u, nil
}

var ErrChipClaimTooSoon = errors.New("you can add more chips once the hour is up")

// ClaimChips adds ChipClaimAmount to the user's balance if their last claim
// was at least ChipClaimInterval ago, and records it in the chip ledger.
func ClaimChips(ctx context.Context, db *sql.DB, userID string) (*User, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var balance int64
	err = tx.QueryRowContext(ctx,
		`UPDATE users SET chips = chips + $2, last_chip_claim_at = NOW(), updated_at = NOW()
		 WHERE id = $1 AND (last_chip_claim_at IS NULL OR last_chip_claim_at <= NOW() - make_interval(secs => $3))
		 RETURNING chips`,
		userID, ChipClaimAmount, ChipClaimInterval.Seconds(),
	).Scan(&balance)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrChipClaimTooSoon
	}
	if err != nil {
		return nil, err
	}
	_, err = tx.ExecContext(ctx,
		`INSERT INTO chip_transactions (user_id, amount, balance_after, description) VALUES ($1, $2, $3, 'chip_claim')`,
		userID, ChipClaimAmount, balance,
	)
	if err != nil {
		return nil, err
	}
	user, err := GetUserByID(ctx, tx, userID)
	if err != nil {
		return nil, err
	}
	return user, tx.Commit()
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
