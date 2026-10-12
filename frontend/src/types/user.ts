export interface User {
  id: string
  email: string | null
  displayName: string
  avatarUrl: string | null
  chips: number
  lastDailyBonusAt?: string
}

export interface AuthToken {
  token: string
  user: User
}
