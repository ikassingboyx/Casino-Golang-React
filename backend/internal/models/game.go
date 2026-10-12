package models

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
)

var (
	ErrGameNotFound      = errors.New("game not found")
	ErrInsufficientChips = errors.New("insufficient chips")
)

// StoredGame is a row of the games table.
type StoredGame struct {
	ID       string
	GameType string
	State    json.RawMessage
	Status   string // active, completed
}

type execQuerier interface {
	rowQuerier
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

// FindActiveOfflineGame returns the user's unfinished game of this type, if any.
func FindActiveOfflineGame(ctx context.Context, db rowQuerier, userID, gameType string) (*StoredGame, error) {
	g := StoredGame{GameType: gameType, Status: "active"}
	err := db.QueryRowContext(ctx,
		`SELECT id, state FROM games
		 WHERE user_id = $1 AND game_type = $2 AND is_offline AND status = 'active'
		 ORDER BY started_at DESC LIMIT 1`,
		userID, gameType,
	).Scan(&g.ID, &g.State)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrGameNotFound
	}
	if err != nil {
		return nil, err
	}
	return &g, nil
}

func CreateOfflineGame(ctx context.Context, db rowQuerier, userID, gameType string, state any) (string, error) {
	data, err := json.Marshal(state)
	if err != nil {
		return "", err
	}
	var id string
	err = db.QueryRowContext(ctx,
		`INSERT INTO games (user_id, game_type, state, is_offline) VALUES ($1, $2, $3, TRUE) RETURNING id`,
		userID, gameType, data,
	).Scan(&id)
	return id, err
}

// LockOfflineGame loads one of the user's offline games and locks the row
// until the transaction ends, so concurrent actions are applied one at a time.
func LockOfflineGame(ctx context.Context, tx *sql.Tx, userID, gameID string) (*StoredGame, error) {
	var g StoredGame
	err := tx.QueryRowContext(ctx,
		`SELECT id, game_type, state, status FROM games
		 WHERE id = $1 AND user_id = $2 AND is_offline
		 FOR UPDATE`,
		gameID, userID,
	).Scan(&g.ID, &g.GameType, &g.State, &g.Status)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrGameNotFound
	}
	if err != nil {
		return nil, err
	}
	return &g, nil
}

func SaveGame(ctx context.Context, db execQuerier, gameID string, state any, completed bool) error {
	data, err := json.Marshal(state)
	if err != nil {
		return err
	}
	if completed {
		_, err = db.ExecContext(ctx, `UPDATE games SET state = $2, status = 'completed', finished_at = NOW() WHERE id = $1`, gameID, data)
	} else {
		_, err = db.ExecContext(ctx, `UPDATE games SET state = $2 WHERE id = $1`, gameID, data)
	}
	return err
}

// ApplyChipChange adds amount (negative to take chips) to the user's balance
// and records it in the chip ledger. It fails with ErrInsufficientChips rather
// than letting the balance go below zero. Returns the new balance.
func ApplyChipChange(ctx context.Context, db execQuerier, userID, gameID string, amount int64, description string) (int64, error) {
	var balance int64
	err := db.QueryRowContext(ctx,
		`UPDATE users SET chips = chips + $2, updated_at = NOW()
		 WHERE id = $1 AND chips + $2 >= 0
		 RETURNING chips`,
		userID, amount,
	).Scan(&balance)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrInsufficientChips
	}
	if err != nil {
		return 0, err
	}
	_, err = db.ExecContext(ctx,
		`INSERT INTO chip_transactions (user_id, game_id, amount, balance_after, description) VALUES ($1, $2, $3, $4, $5)`,
		userID, gameID, amount, balance, description,
	)
	return balance, err
}
