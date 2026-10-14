import type { PokerEvent, PokerGameState, PokerPlayerStatus } from '../types/poker'

// What a seat shows at some point of the hand.
export interface SeatView {
  chips: number // stack behind
  bet: number // in front of the player on this street
  status: PokerPlayerStatus
  label?: string // the player's last action on this street, e.g. "Call 200"
}

export interface TableView {
  seats: Record<string, SeatView>
  pot: number // chips already swept into the middle
  board: number // community cards dealt
  street: number // 0 pre-flop … 3 river; changes when bets are swept
  currentBet: number // highest bet on this street
}

const BOARD: Record<string, number> = { flop: 3, turn: 4, river: 5 }

// The table after the first `upto` events of the hand, so the steps between
// two server states (bots' turns, new streets) can be shown one at a time.
export function replay(state: PokerGameState, upto: number): TableView {
  const seats: Record<string, SeatView> = {}
  for (const p of state.players) {
    seats[p.id] = { chips: p.startChips ?? p.chips, bet: 0, status: p.status === 'out' ? 'out' : 'active' }
  }
  let total = 0
  let board = 0
  let street = 0
  let currentBet = 0
  for (const e of state.log.slice(0, upto)) {
    total = e.pot
    if (e.action === 'collect') {
      for (const s of Object.values(seats)) s.bet = 0
      street++
      currentBet = 0
      continue
    }
    if (e.action in BOARD) {
      board = BOARD[e.action]
      for (const s of Object.values(seats)) if (s.status === 'active') s.label = undefined
      continue
    }
    const s = e.playerId ? seats[e.playerId] : undefined
    if (!s) continue
    s.label = e.action === 'return' ? s.label : actionLabel(e, currentBet)
    s.bet = e.bet
    s.chips = e.chips
    if (e.action === 'fold') s.status = 'folded'
    else if (e.chips === 0) s.status = 'all_in'
    else if (s.status === 'all_in') s.status = 'active'
    currentBet = Math.max(...Object.values(seats).map(v => v.bet))
  }
  const onStreet = Object.values(seats).reduce((n, s) => n + s.bet, 0)
  return { seats, pot: total - onStreet, board, street, currentBet }
}

// Short label for a seat: "Raise to 600", "Check".
export function actionLabel(e: PokerEvent, betBefore: number): string {
  const n = e.bet.toLocaleString()
  switch (e.action) {
    case 'small_blind':
      return `Small blind ${n}`
    case 'big_blind':
      return `Big blind ${n}`
    case 'fold':
      return 'Fold'
    case 'check':
      return 'Check'
    case 'call':
      return e.chips === 0 ? 'All-in' : `Call ${n}`
    case 'raise':
    case 'bet':
      if (e.chips === 0) return 'All-in'
      return betBefore === 0 ? `Bet ${n}` : `Raise to ${n}`
    case 'all_in':
      return 'All-in'
  }
  return ''
}

// The dealer's announcement for an event: "Ace raises to 600".
export function describeEvent(e: PokerEvent, name: string, betBefore: number): string {
  const n = e.bet.toLocaleString()
  switch (e.action) {
    case 'small_blind':
      return `${name} posts the small blind`
    case 'big_blind':
      return `${name} posts the big blind`
    case 'fold':
      return `${name} folds`
    case 'check':
      return `${name} checks`
    case 'call':
      return e.chips === 0 ? `${name} calls all-in` : `${name} calls ${n}`
    case 'raise':
    case 'bet':
      if (e.chips === 0) return `${name} is all-in for ${n}`
      return betBefore === 0 ? `${name} bets ${n}` : `${name} raises to ${n}`
    case 'all_in':
      return `${name} is all-in for ${n}`
    case 'return':
      return `Uncalled bet returned to ${name}`
    case 'flop':
      return 'The flop'
    case 'turn':
      return 'The turn'
    case 'river':
      return 'The river'
  }
  return ''
}

// "a Flush", "Two Pair" — reads well after "with".
export function withHand(rank: string): string {
  return /^(Flush|Straight|Full House|Royal Flush|Straight Flush|Pair|One Pair)$/.test(rank) ? `a ${rank.replace('One ', '')}` : rank
}
