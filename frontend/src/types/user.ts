export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  chips: number
  lastDailyBonusAt?: string
}

export interface AuthToken {
  token: string
  user: User
}
