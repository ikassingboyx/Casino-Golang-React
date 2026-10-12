// Standard chip denominations
export const CHIP_DENOMINATIONS = [1, 5, 25, 100, 500, 1000, 5000]

export function formatChips(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`
  return amount.toString()
}

// Returns the chip color for a given denomination
export function chipColor(denomination: number): string {
  const colors: Record<number, string> = {
    1: '#FFFFFF',
    5: '#FF4444',
    25: '#44BB44',
    100: '#4444FF',
    500: '#AA44AA',
    1000: '#FFAA00',
    5000: '#FF6600',
  }
  return colors[denomination] ?? '#888888'
}

// Side-view chips used for stacks (public/assets/chips/<value>.svg).
export const STACK_CHIPS = [1, 5, 25, 100, 500, 1000, 5000]

// Top-view chips used in the betting menu (public/assets/chips/top-<value>.svg).
export const BET_CHIPS = STACK_CHIPS

export const chipTopSrc = (value: number) => `/assets/chips/top-${value}.svg`
export const chipSideSrc = (value: number) => `/assets/chips/${value}.svg`

export interface ChipPile {
  value: number
  count: number
}

// Splits an amount into the fewest chips, largest first, so smaller chips are
// always exchanged for bigger ones (e.g. 4 x 25 is shown as 1 x 100).
export function breakIntoChips(amount: number, denominations: number[] = STACK_CHIPS): ChipPile[] {
  const piles: ChipPile[] = []
  let rest = Math.max(0, Math.floor(amount))
  for (const value of [...denominations].sort((a, b) => b - a)) {
    const count = Math.floor(rest / value)
    if (count > 0) {
      piles.push({ value, count })
      rest -= count * value
    }
  }
  return piles
}
