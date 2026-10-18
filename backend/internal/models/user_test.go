package models

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"os"
	"testing"

	_ "github.com/lib/pq"
)

// These tests use the local development database and clean up after
// themselves. They are skipped when the database is unavailable.
func testDB(t *testing.T) *sql.DB {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		url = "postgres://casino:password@localhost:5432/casino_db?sslmode=disable"
	}
	db, err := sql.Open("postgres", url)
	if err == nil {
		err = db.Ping()
	}
	if err != nil {
		t.Skipf("database unavailable: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func randomID(t *testing.T) string {
	b := make([]byte, 6)
	rand.Read(b)
	return "test-" + hex.EncodeToString(b)
}

func deleteUser(t *testing.T, db *sql.DB, id string) {
	t.Cleanup(func() { db.Exec(`DELETE FROM users WHERE id = $1`, id) })
}

func TestFindOrCreateOAuthUser(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	email := randomID(t) + "@Example.com"

	google := &OAuthProfile{Provider: "google", ProviderID: randomID(t), Email: email, EmailVerified: true, Name: "Ann"}
	u1, err := FindOrCreateOAuthUser(ctx, db, google)
	if err != nil {
		t.Fatal(err)
	}
	deleteUser(t, db, u1.ID)
	if u1.Chips != 1000 || u1.DisplayName != "Ann" || u1.Email == nil {
		t.Fatalf("unexpected new user: %+v", u1)
	}

	// Same provider login returns the same user.
	again, err := FindOrCreateOAuthUser(ctx, db, google)
	if err != nil || again.ID != u1.ID {
		t.Fatalf("second login: id %v err %v, want %s", again, err, u1.ID)
	}

	// Another provider with the same verified email is linked.
	gh := &OAuthProfile{Provider: "github", ProviderID: randomID(t), Email: email, EmailVerified: true, Name: "ann-gh"}
	linked, err := FindOrCreateOAuthUser(ctx, db, gh)
	if err != nil || linked.ID != u1.ID {
		t.Fatalf("verified email not linked: %v err %v", linked, err)
	}

	// An unverified email is never linked or stored.
	fb := &OAuthProfile{Provider: "facebook", ProviderID: randomID(t), Email: email, EmailVerified: false}
	other, err := FindOrCreateOAuthUser(ctx, db, fb)
	if err != nil {
		t.Fatal(err)
	}
	deleteUser(t, db, other.ID)
	if other.ID == u1.ID || other.Email != nil || other.DisplayName == "" {
		t.Fatalf("unverified email handled wrong: %+v", other)
	}
}

func TestClaimChips(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	u, err := FindOrCreateOAuthUser(ctx, db, &OAuthProfile{Provider: "google", ProviderID: randomID(t), Name: "Cal"})
	if err != nil {
		t.Fatal(err)
	}
	deleteUser(t, db, u.ID)
	if u.NextChipClaimAt != nil {
		t.Fatalf("new user should be able to claim now, next at %v", u.NextChipClaimAt)
	}

	claimed, err := ClaimChips(ctx, db, u.ID)
	if err != nil {
		t.Fatal(err)
	}
	if claimed.Chips != u.Chips+ChipClaimAmount || claimed.NextChipClaimAt == nil {
		t.Fatalf("after claim: chips %d next %v, want %d and a next claim time", claimed.Chips, claimed.NextChipClaimAt, u.Chips+ChipClaimAmount)
	}

	// A second claim within the hour is refused and adds nothing.
	if _, err := ClaimChips(ctx, db, u.ID); err != ErrChipClaimTooSoon {
		t.Fatalf("second claim: err %v, want ErrChipClaimTooSoon", err)
	}

	// Once the hour has passed it works again.
	if _, err := db.Exec(`UPDATE users SET last_chip_claim_at = NOW() - INTERVAL '61 minutes' WHERE id = $1`, u.ID); err != nil {
		t.Fatal(err)
	}
	again, err := ClaimChips(ctx, db, u.ID)
	if err != nil || again.Chips != u.Chips+2*ChipClaimAmount {
		t.Fatalf("claim after the hour: %+v err %v", again, err)
	}
}
