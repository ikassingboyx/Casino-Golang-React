export interface User {
  id: string
  email: string | null
  displayName: string
  avatarUrl: string | null
  chips: number
  nextChipClaimAt: string | null // when chips can next be added; null means now
}
