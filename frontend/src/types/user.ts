export interface User {
  id: string
  email: string | null
  displayName: string
  avatarUrl: string | null
  chips: number
  lastDailyBonusAt?: string
}
