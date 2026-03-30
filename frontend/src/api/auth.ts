import http from './http'
import type { AuthToken } from '../types/user'

export const register = (email: string, password: string, displayName: string) =>
  http.post<AuthToken>('/auth/register', { email, password, displayName })

export const login = (email: string, password: string) =>
  http.post<AuthToken>('/auth/login', { email, password })

export const getGoogleOAuthURL = () =>
  `${import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'}/auth/google`

export const getFacebookOAuthURL = () =>
  `${import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'}/auth/facebook`
