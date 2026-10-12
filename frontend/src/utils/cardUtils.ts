import type { Card } from '../types/game'

export function cardLabel(card: Card): string {
  if (card.hidden) return '?'
  return `${card.rank}${suitSymbol(card.suit)}`
}

export function suitSymbol(suit: Card['suit']): string {
  return { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[suit]
}

export function isRed(card: Card): boolean {
  return card.suit === 'hearts' || card.suit === 'diamonds'
}

// Image path for a card (public/assets/cards/<suit>-<rank>.svg); hidden cards show the back.
export function cardSrc(card: Card): string {
  if (card.hidden) return '/assets/cards/back.svg'
  return `/assets/cards/${card.suit}-${card.rank}.svg`
}
