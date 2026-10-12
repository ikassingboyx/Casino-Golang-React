package auth

import (
	"context"
	"net/http"

	"casino/internal/models"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

func newGoogleProvider(clientID, clientSecret, redirectURL string) *OAuthProvider {
	return &OAuthProvider{
		Name: "google",
		Config: &oauth2.Config{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			RedirectURL:  redirectURL,
			Scopes:       []string{"openid", "email", "profile"},
			Endpoint:     google.Endpoint,
		},
		FetchProfile: fetchGoogleProfile,
	}
}

func fetchGoogleProfile(ctx context.Context, client *http.Client) (*models.OAuthProfile, error) {
	var u struct {
		Sub           string `json:"sub"`
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
	}
	if err := getJSON(ctx, client, "https://openidconnect.googleapis.com/v1/userinfo", &u); err != nil {
		return nil, err
	}
	return &models.OAuthProfile{
		Provider:      "google",
		ProviderID:    u.Sub,
		Email:         u.Email,
		EmailVerified: u.EmailVerified,
		Name:          u.Name,
		AvatarURL:     u.Picture,
	}, nil
}
