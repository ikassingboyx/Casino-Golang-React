// Seats around the curved side of the table.
export const SEAT_COUNT = 5

// Puts the player `myId` in the middle seat and the others after them in
// table order, so everyone sees themselves in front of the dealer.
export function arrangeSeats<P extends { id: string }>(players: P[], myId: string | undefined, count = SEAT_COUNT): (P | null)[] {
  const seats: (P | null)[] = Array(count).fill(null)
  const me = Math.max(0, players.findIndex(p => p.id === myId))
  const ordered = [...players.slice(me), ...players.slice(0, me)].slice(0, count)
  const mid = Math.floor(count / 2)
  ordered.forEach((p, k) => (seats[(mid + k) % count] = p))
  return seats
}

// Where seat `i` of `count` sits: the bottom-centre of the seat as % of the
// table, on an arc just inside the curved rail (see .table-d / .table-d-tall).
export function seatPosition(i: number, count: number, portrait: boolean) {
  const [from, to] = portrait ? [155, 25] : [140, 40]
  const deg = count === 1 ? 90 : from - (i * (from - to)) / (count - 1)
  const a = (deg * Math.PI) / 180
  // The curve's ellipse: centre and radii in %, then pulled in by k.
  const [cy, ry, k] = portrait ? [62, 38, 0.88] : [4, 96, 0.9]
  return { x: 50 + 50 * k * Math.cos(a), y: cy + ry * k * Math.sin(a) }
}
