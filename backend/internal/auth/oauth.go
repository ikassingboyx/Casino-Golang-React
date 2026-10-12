package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"casino/internal/config"
	"casino/internal/models"

	"golang.org/x/oauth2"
)

// OAuthProvider is a social login provider (Google, Facebook, GitHub).
type OAuthProvider struct {
	Name   string
	Config *oauth2.Config
	// FetchProfile loads the user's profile using an authorized client.
	FetchProfile func(ctx context.Context, client *http.Client) (*models.OAuthProfile, error)
}

// OAuthProviders returns the providers that have a client ID configured.
func OAuthProviders(cfg *config.Config) map[string]*OAuthProvider {
	callback := func(name string) string { return cfg.APIURL + "/api/auth/" + name + "/callback" }
	all := []*OAuthProvider{
		newGoogleProvider(cfg.GoogleClientID, cfg.GoogleClientSecret, callback("google")),
		newFacebookProvider(cfg.FacebookClientID, cfg.FacebookClientSecret, callback("facebook")),
		newGitHubProvider(cfg.GitHubClientID, cfg.GitHubClientSecret, callback("github")),
	}
	providers := map[string]*OAuthProvider{}
	for _, p := range all {
		if p.Config.ClientID != "" {
			providers[p.Name] = p
		}
	}
	return providers
}

func getJSON(ctx context.Context, client *http.Client, url string, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("GET %s: %s", url, res.Status)
	}
	return json.NewDecoder(res.Body).Decode(out)
}
