import http, { API_URL } from './http'

export type OAuthProvider = 'google' | 'facebook' | 'github'

// Full-page navigation target that starts the provider's login flow.
export const oauthLoginURL = (provider: OAuthProvider) => `${API_URL}/auth/${provider}`

// Providers that are configured on the backend.
export const getOAuthProviders = () => http.get<{ providers: OAuthProvider[] }>('/auth/providers')
