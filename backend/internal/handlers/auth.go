package handlers

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"log"
	"net/http"
	"net/url"
	"sort"

	"casino/internal/auth"
	"casino/internal/config"
	"casino/internal/models"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	db        *sql.DB
	cfg       *config.Config
	providers map[string]*auth.OAuthProvider
}

func NewAuthHandler(db *sql.DB, cfg *config.Config) *AuthHandler {
	return &AuthHandler{db: db, cfg: cfg, providers: auth.OAuthProviders(cfg)}
}

// Providers lists the social login providers that are configured.
func (h *AuthHandler) Providers(c *gin.Context) {
	names := make([]string, 0, len(h.providers))
	for name := range h.providers {
		names = append(names, name)
	}
	sort.Strings(names)
	c.JSON(http.StatusOK, gin.H{"providers": names})
}

const oauthStateCookie = "oauth_state"

// OAuthRedirect sends the browser to the provider's consent screen.
func (h *AuthHandler) OAuthRedirect(c *gin.Context) {
	p, ok := h.providers[c.Param("provider")]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "unknown or unconfigured provider"})
		return
	}
	state, err := randomState()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not start login"})
		return
	}
	// The state cookie ties the callback to this browser (CSRF protection).
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(oauthStateCookie, state, 600, "/api/auth", "", isHTTPS(c), true)
	c.Redirect(http.StatusFound, p.Config.AuthCodeURL(state))
}

// OAuthCallback finishes the login, then redirects to the frontend with a
// JWT in the URL fragment (fragments are not sent to servers or logged).
func (h *AuthHandler) OAuthCallback(c *gin.Context) {
	p, ok := h.providers[c.Param("provider")]
	if !ok {
		h.failLogin(c, "unknown_provider")
		return
	}

	state, _ := c.Cookie(oauthStateCookie)
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(oauthStateCookie, "", -1, "/api/auth", "", isHTTPS(c), true)
	if state == "" || c.Query("state") != state {
		h.failLogin(c, "invalid_state")
		return
	}
	if c.Query("error") != "" {
		h.failLogin(c, "cancelled")
		return
	}

	ctx := c.Request.Context()
	tok, err := p.Config.Exchange(ctx, c.Query("code"))
	if err != nil {
		log.Printf("oauth %s: exchange: %v", p.Name, err)
		h.failLogin(c, "exchange_failed")
		return
	}
	profile, err := p.FetchProfile(ctx, p.Config.Client(ctx, tok))
	if err != nil {
		log.Printf("oauth %s: profile: %v", p.Name, err)
		h.failLogin(c, "profile_failed")
		return
	}
	user, err := models.FindOrCreateOAuthUser(ctx, h.db, profile)
	if err != nil {
		log.Printf("oauth %s: user: %v", p.Name, err)
		h.failLogin(c, "server_error")
		return
	}
	jwt, err := auth.GenerateToken(user.ID, h.cfg.JWTSecret, h.cfg.JWTExpiry)
	if err != nil {
		log.Printf("oauth %s: token: %v", p.Name, err)
		h.failLogin(c, "server_error")
		return
	}
	c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/auth/callback#token="+url.QueryEscape(jwt))
}

func (h *AuthHandler) failLogin(c *gin.Context, reason string) {
	c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/login?error="+url.QueryEscape(reason))
}

func randomState() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func isHTTPS(c *gin.Context) bool {
	return c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https"
}
