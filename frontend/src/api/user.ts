import http from './http'
import type { User } from '../types/user'

export const getMe = () => http.get<User>('/users/me')

export const updateMe = (data: Partial<Pick<User, 'displayName' | 'avatarUrl'>>) =>
  http.patch<User>('/users/me', data)

export const claimDailyBonus = () =>
  http.post<{ chips: number; amount: number }>('/users/me/daily-bonus')
