// Where things sit on the oval poker table, in % of the table box. The
// dealer stands at the top; you sit at the bottom and the other seats follow
// clockwise in table order.

export interface Point {
  x: number
  y: number
}

// Five seats starting at the bottom (90°, y grows downwards) and going
// clockwise, leaving the top for the dealer. Landscape spaces them evenly; a
// tall table keeps them off its narrow sides, clear of the board.
const SLOT_ANGLES = { landscape: [90, 162, 234, 306, 18], portrait: [90, 142, 222, 318, 38] }

// Which of the five places are used with fewer players.
const SLOTS: Record<number, number[]> = { 1: [0], 2: [0, 3], 3: [0, 2, 3], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4] }

function onOval(deg: number, k: number): Point {
  const a = (deg * Math.PI) / 180
  return { x: 50 + 50 * k * Math.cos(a), y: 50 + 50 * k * Math.sin(a) }
}

export interface SeatSpots {
  plate: Point // the nameplate on the rail
  cards: Point // the hole cards
  bet: Point // chips bet on this street
  button: Point // the dealer button, when this seat has it
  top: boolean // a seat on the far side of the table
}

// `offset` is how many places clockwise from you the seat is.
export function seatSpots(offset: number, players: number, portrait: boolean): SeatSpots {
  const slots = SLOTS[Math.min(Math.max(players, 1), 5)]
  const deg = SLOT_ANGLES[portrait ? 'portrait' : 'landscape'][slots[offset % slots.length]]
  const you = deg === 90
  const k = portrait
    ? { plate: 0.88, cards: you ? 0.56 : 0.64, bet: 0.44, button: 0.66 }
    : { plate: 0.84, cards: you ? 0.56 : 0.57, bet: 0.4, button: 0.64 }
  return {
    plate: onOval(deg, k.plate),
    cards: onOval(deg, k.cards),
    // Your bet sits beside your cards, leaving the middle for the dealer's messages.
    bet: you ? (portrait ? { x: 50, y: 67 } : { x: 39, y: 71 }) : onOval(deg, k.bet),
    button: onOval(deg + (you ? 14 : 16), k.button),
    top: deg > 180 && deg < 360,
  }
}

export const POT: Point = { x: 50, y: 29 }
export const BOARD_Y = 47 // centre of the community cards
