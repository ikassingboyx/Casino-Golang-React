package auth

import (
	"context"
	"net/http"
	"strconv"

	"casino/internal/models"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
)

func newGitHubProvider(clientID, clientSecret, redirectURL string) *OAuthProvider {
	return &OAuthProvider{
		Name: "github",
		Config: &oauth2.Config{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			RedirectURL:  redirectURL,
			Scopes:       []string{"read:user", "user:email"},
			Endpoint:     github.Endpoint,
		},
		FetchProfile: fetchGitHubProfile,
	}
}

func fetchGitHubProfile(ctx context.Context, client *http.Client) (*models.OAuthProfile, error) {
	var u struct {
		ID        int64  `json:"id"`
		Login     string `json:"login"`
		Name      string `json:"name"`
		AvatarURL string `json:"avatar_url"`
	}
	if err := getJSON(ctx, client, "https://api.github.com/user", &u); err != nil {
		return nil, err
	}
	// The profile email may be hidden; use the primary verified address instead.
	var emails []struct {
		Email    string `json:"email"`
		Primary  bool   `json:"primary"`
		Verified bool   `json:"verified"`
	}
	if err := getJSON(ctx, client, "https://api.github.com/user/emails", &emails); err != nil {
		return nil, err
	}
	profile := &models.OAuthProfile{
		Provider:   "github",
		ProviderID: strconv.FormatInt(u.ID, 10),
		Name:       u.Name,
		AvatarURL:  u.AvatarURL,
	}
	if profile.Name == "" {
		profile.Name = u.Login
	}
	for _, e := range emails {
		if e.Primary && e.Verified {
			profile.Email, profile.EmailVerified = e.Email, true
		}
	}
	return profile, nil
}
