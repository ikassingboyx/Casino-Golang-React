import http from './http'
import type { User } from '../types/user'

export const getMe = () => http.get<User>('/users/me')

// Adds the hourly chip top-up; returns the updated user.
export const claimChips = () => http.post<User>('/users/me/chips')
