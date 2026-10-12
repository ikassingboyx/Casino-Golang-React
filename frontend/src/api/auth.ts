import http, { API_URL } from './http'
import type { AuthToken } from '../types/user'

export const register = (email: string, password: string, displayName: string) =>
  http.post<AuthToken>('/auth/register', { email, password, displayName })

export const login = (email: string, password: string) =>
  http.post<AuthToken>('/auth/login', { email, password })

export type OAuthProvider = 'google' | 'facebook' | 'github'

// Full-page navigation target that starts the provider's login flow.
export const oauthLoginURL = (provider: OAuthProvider) => `${API_URL}/auth/${provider}`

// Providers that are configured on the backend.
export const getOAuthProviders = () => http.get<{ providers: OAuthProvider[] }>('/auth/providers')
