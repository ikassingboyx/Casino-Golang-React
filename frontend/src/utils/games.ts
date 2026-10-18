import type { GameType } from '../types/game'

export const GAME_NAMES: Record<GameType, string> = {
  blackjack: 'Blackjack',
  poker: 'Poker',
  baccarat: 'Baccarat',
  roulette: 'Roulette',
}

// What playing alone means for each game.
export const OFFLINE_BLURB: Record<GameType, string> = {
  blackjack: 'Just you against the dealer',
  poker: 'You against four bots',
  baccarat: 'Just you against the house',
  roulette: 'Your own wheel, at your pace',
}

export const ROOM_CODE_LENGTH = 5

export const inviteLink = (code: string) => `${window.location.origin}/room/${code}`
