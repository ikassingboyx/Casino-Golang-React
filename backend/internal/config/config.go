package config

import "os"

type Config struct {
	Port        string
	FrontendURL string
	DatabaseURL string
	JWTSecret   string
	JWTExpiry   string

	GoogleClientID       string
	GoogleClientSecret   string
	GoogleRedirectURL    string

	FacebookClientID     string
	FacebookClientSecret string
	FacebookRedirectURL  string
}

func Load() *Config {
	return &Config{
		Port:        getEnv("PORT", "8080"),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:5173"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://casino:password@localhost:5432/casino_db?sslmode=disable"),
		JWTSecret:   getEnv("JWT_SECRET", "change-me-in-production"),
		JWTExpiry:   getEnv("JWT_EXPIRY", "168h"),

		GoogleClientID:       os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret:   os.Getenv("GOOGLE_CLIENT_SECRET"),
		GoogleRedirectURL:    os.Getenv("GOOGLE_REDIRECT_URL"),

		FacebookClientID:     os.Getenv("FACEBOOK_CLIENT_ID"),
		FacebookClientSecret: os.Getenv("FACEBOOK_CLIENT_SECRET"),
		FacebookRedirectURL:  os.Getenv("FACEBOOK_REDIRECT_URL"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
