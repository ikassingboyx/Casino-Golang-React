package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	APIURL      string // public URL of this backend, used for OAuth callbacks
	FrontendURL string
	DatabaseURL string
	JWTSecret   string
	JWTExpiry   string

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
		DatabaseURL: getEnv("DATABASE_URL", "postgres://casino:password@localhost:5432/casino_db?sslmode=disable"),
		JWTSecret:   getEnv("JWT_SECRET", "change-me-in-production"),
		JWTExpiry:   getEnv("JWT_EXPIRY", "168h"),

		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),

		FacebookClientID:     os.Getenv("FACEBOOK_CLIENT_ID"),
		FacebookClientSecret: os.Getenv("FACEBOOK_CLIENT_SECRET"),

		GitHubClientID:     os.Getenv("GITHUB_CLIENT_ID"),
		GitHubClientSecret: os.Getenv("GITHUB_CLIENT_SECRET"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
