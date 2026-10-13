import type { Card } from '../types/game'
import type { BaccaratResult, BaccaratSpot } from '../types/baccarat'

// Aces count 1, tens and faces 0, the rest their number.
export function cardPoints(card: Card): number {
  if (card.rank === 'A') return 1
  if (card.rank === '10' || card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return 0
  return Number(card.rank)
}

// Points modulo 10, so a total is always 0–9.
export function handTotal(cards: Card[]): number {
  return cards.reduce((s, c) => s + cardPoints(c), 0) % 10
}

export function isNatural(cards: Card[]): boolean {
  return cards.length === 2 && handTotal(cards) >= 8
}

// Betting spots in table order, with the payout printed on the felt.
export const BACCARAT_SPOTS: { spot: BaccaratSpot; label: string; odds: string }[] = [
  { spot: 'player', label: 'Player', odds: '1 : 1' },
  { spot: 'tie', label: 'Tie', odds: '8 : 1' },
  { spot: 'banker', label: 'Banker', odds: '0.95 : 1' },
]

export const RESULT_LABEL: Record<BaccaratResult, string> = { player: 'Player', banker: 'Banker', tie: 'Tie' }
