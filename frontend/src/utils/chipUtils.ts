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
