// Lines shown on the table that every game shares.
export const WAITING_FOR_BETS = 'Waiting for the other players to bet'
export const IN_NEXT_ROUND = "You're in from the next round"
export const OUT_OF_CHIPS = "You're out of chips. Add more from your profile in the lobby."

// A round's outcome for the player; `even` is shown when they broke even.
export function netResult(net: number, even: string): string {
  if (net > 0) return `You win +${net}`
  if (net < 0) return `You lose ${-net}`
  return even
}
