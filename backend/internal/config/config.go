package config

import (
	"errors"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	APIURL      string // public URL of this backend, used for OAuth callbacks
	FrontendURL string
	DatabaseURL string
	JWTSecret   string
	JWTExpiry   string
	// TrustedProxies are the reverse proxies (IPs or CIDRs) whose
	// X-Forwarded-For header is believed; none by default.
	TrustedProxies []string

	GoogleClientID     string
	GoogleClientSecret string

	FacebookClientID     string
	FacebookClientSecret string

	GitHubClientID     string
	GitHubClientSecret string
}

// Load reads configuration from the environment. For local development,
// values are also read from backend/.env and the repo-root .env if present;
// real environment variables take precedence.
func Load() *Config {
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")

	port := getEnv("PORT", "8080")
	return &Config{
		Port:        port,
		APIURL:      getEnv("API_URL", "http://localhost:"+port),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:5173"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://casino:wwawwa123@localhost:5432/casino_db?sslmode=disable"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
		JWTExpiry:   getEnv("JWT_EXPIRY", "168h"),

		TrustedProxies: splitList(os.Getenv("TRUSTED_PROXIES")),

		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),

		FacebookClientID:     os.Getenv("FACEBOOK_CLIENT_ID"),
		FacebookClientSecret: os.Getenv("FACEBOOK_CLIENT_SECRET"),

		GitHubClientID:     os.Getenv("GITHUB_CLIENT_ID"),
		GitHubClientSecret: os.Getenv("GITHUB_CLIENT_SECRET"),
	}
}

// minJWTSecretLen is the shortest accepted JWT_SECRET; anyone who knows or
// guesses the secret can forge a login token for any user.
const minJWTSecretLen = 32

// Validate rejects settings that are unsafe to run with.
func (c *Config) Validate() error {
	if c.JWTSecret == "" || c.JWTSecret == "change-me-in-production" {
		return errors.New("JWT_SECRET is not set; generate one with: openssl rand -base64 48")
	}
	if len(c.JWTSecret) < minJWTSecretLen {
		return errors.New("JWT_SECRET is too short; use at least 32 characters (openssl rand -base64 48)")
	}
	return nil
}

func splitList(s string) []string {
	var out []string
	for _, v := range strings.Split(s, ",") {
		if v = strings.TrimSpace(v); v != "" {
			out = append(out, v)
		}
	}
	return out
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
