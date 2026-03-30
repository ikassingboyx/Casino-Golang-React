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
