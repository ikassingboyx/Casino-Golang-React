package auth

import (
	"context"
	"net/http"

	"casino/internal/models"

	"golang.org/x/oauth2"
)

// Unversioned endpoints use the app's default Graph API version
// (golang.org/x/oauth2/facebook pins the long-retired v3.2).
var facebookEndpoint = oauth2.Endpoint{
	AuthURL:  "https://www.facebook.com/dialog/oauth",
	TokenURL: "https://graph.facebook.com/oauth/access_token",
}

func newFacebookProvider(clientID, clientSecret, redirectURL string) *OAuthProvider {
	return &OAuthProvider{
		Name: "facebook",
		Config: &oauth2.Config{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			RedirectURL:  redirectURL,
			Scopes:       []string{"email", "public_profile"},
			Endpoint:     facebookEndpoint,
		},
		FetchProfile: fetchFacebookProfile,
	}
}

func fetchFacebookProfile(ctx context.Context, client *http.Client) (*models.OAuthProfile, error) {
	var u struct {
		ID      string `json:"id"`
		Name    string `json:"name"`
		Email   string `json:"email"`
		Picture struct {
			Data struct {
				URL string `json:"url"`
			} `json:"data"`
		} `json:"picture"`
	}
	const url = "https://graph.facebook.com/me?fields=id,name,email,picture.width(200).height(200)"
	if err := getJSON(ctx, client, url, &u); err != nil {
		return nil, err
	}
	return &models.OAuthProfile{
		Provider:   "facebook",
		ProviderID: u.ID,
		Email:      u.Email,
		// Facebook only returns an email once the user has confirmed it.
		EmailVerified: u.Email != "",
		Name:          u.Name,
		AvatarURL:     u.Picture.Data.URL,
	}, nil
}
