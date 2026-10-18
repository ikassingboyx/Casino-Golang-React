export function formatChips(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`
  return amount.toString()
}

// Chip denominations; each has a top-view image (public/assets/chips/top-<value>.svg).
export const BET_CHIPS = [1, 5, 25, 100, 500, 1000, 5000]

export const chipTopSrc = (value: number) => `/assets/chips/top-${value}.svg`

interface ChipPile {
  value: number
  count: number
}

// Splits an amount into the fewest chips, largest first, so smaller chips are
// always exchanged for bigger ones (e.g. 4 x 25 is shown as 1 x 100).
export function breakIntoChips(amount: number, denominations: number[] = BET_CHIPS): ChipPile[] {
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
