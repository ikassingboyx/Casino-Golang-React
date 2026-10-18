import { POCKET_STEP, WHEEL_ORDER } from './roulette'

// Ball path for one spin, as plain functions of time so the ball always ends
// exactly in the winning pocket. Angles: degrees clockwise from 12 o'clock.
// Radii in the 600px wheel canvas (track ≈243, pocket ≈168).

const TRACK_R = 243
export const POCKET_R = 168

export interface SpinPlan {
  duration: number // s, until the wheel stops
  settleAt: number // s, when the ball comes to rest in the pocket
  wheel: (t: number) => number
  ball: (t: number) => number // absolute angle
  radius: (t: number) => number
  tilt: (t: number) => number // ball scale: a touch smaller deeper in the bowl
}

const mod = (a: number, n: number) => ((a % n) + n) % n
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const easeOutCubic = (x: number) => 1 - (1 - x) ** 3
const smooth = (x: number) => x * x * (3 - 2 * x)

export function planSpin(winning: number, wheelFrom: number, ballFrom: number, reduceMotion = false): SpinPlan {
  const duration = reduceMotion ? 1.6 : 10
  const settleAt = reduceMotion ? 1.4 : 7.4
  const wheelTurn = (reduceMotion ? 360 : 360 * 2.5) + Math.random() * 360

  const wheel = (t: number) => wheelFrom + wheelTurn * easeOutCubic(clamp01(t / duration))

  // The ball's angle relative to the wheel: it runs counter-clockwise against
  // the wheel, losing speed, and must end over the winning pocket.
  const relFrom = ballFrom - wheelFrom
  const relTo = WHEEL_ORDER.indexOf(winning) * POCKET_STEP
  const travel = mod(relFrom - relTo, 360) + 360 * (reduceMotion ? 1 : 6)
  // Relative speed decays like friction (fast at the launch, crawling at the end).
  const progress = (u: number) => 1 - (1 - u) ** 2.4

  // Random bounces, different on every spin. Each one is a short bump in
  // radius (dr, canvas px) and angle (deg) that is zero when it starts and
  // ends; all of them finish before the ball settles, so it still lands
  // exactly in the winning pocket.
  type Bounce = { at: number; len: number; dr: number; da: number }
  const rand = (a: number, b: number) => a + Math.random() * (b - a)
  const sign = () => (Math.random() < 0.5 ? -1 : 1)
  const HOP_FROM = 0.74
  const bounces: Bounce[] = []
  if (!reduceMotion) {
    // 1–3 knocks off the diamonds while the ball rolls down the bowl.
    const knocks = 1 + Math.floor(Math.random() * 3)
    for (let i = 0; i < knocks; i++) {
      bounces.push({ at: rand(0.53, 0.69), len: rand(0.018, 0.035), dr: rand(5, 14), da: sign() * rand(2, 6) })
    }
    // 2–5 hops across the pocket frets, each lower and shorter than the last.
    let at = HOP_FROM
    let height = rand(10, 16)
    let swing = rand(0.6, 1.2) * POCKET_STEP
    const hops = 2 + Math.floor(Math.random() * 4)
    for (let i = 0; i < hops && at < 0.97; i++) {
      const len = Math.min(rand(0.05, 0.08) * (1 - i * 0.12), 0.985 - at)
      bounces.push({ at, len, dr: height, da: sign() * swing })
      at += len
      height *= rand(0.4, 0.7)
      swing *= rand(0.35, 0.65)
    }
  }
  const bump = (u: number, b: Bounce) => {
    const x = (u - b.at) / b.len
    return x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x)
  }
  const bounceR = (u: number) => bounces.reduce((sum, b) => sum + b.dr * bump(u, b), 0)
  const bounceA = (u: number) => bounces.reduce((sum, b) => sum + b.da * bump(u, b), 0)

  // A small, irregular rattle while the ball runs on the track, fading as it slows.
  const phase1 = rand(0, Math.PI * 2)
  const phase2 = rand(0, Math.PI * 2)
  const rattle = (u: number) =>
    reduceMotion || u < 0.04 || u > 0.5 ? 0 : (1 - u / 0.5) * (0.9 * Math.sin(u * 230 + phase1) + 0.6 * Math.sin(u * 410 + phase2))

  const rel = (t: number) => {
    const u = clamp01(t / settleAt)
    return relFrom - travel * progress(u) + bounceA(u)
  }

  const radius = (t: number) => {
    const u = clamp01(t / settleAt)
    if (reduceMotion) return POCKET_R + (TRACK_R - POCKET_R) * (1 - smooth(clamp01((u - 0.3) / 0.6)))
    let r: number
    if (u < 0.04) r = POCKET_R + (TRACK_R - POCKET_R) * smooth(u / 0.04) // launched onto the track
    else if (u < 0.5) r = TRACK_R // orbiting on the rim
    else if (u < HOP_FROM) r = TRACK_R - (TRACK_R - 178) * smooth((u - 0.5) / (HOP_FROM - 0.5)) // rolls down the bowl
    else r = POCKET_R + 10 * (1 - (u - HOP_FROM) / (1 - HOP_FROM)) ** 3 // drops into the pockets
    return r + rattle(u) + bounceR(u)
  }

  const tilt = (t: number) => 0.9 + 0.1 * clamp01((radius(t) - POCKET_R) / (TRACK_R - POCKET_R))

  return { duration, settleAt, wheel, ball: t => wheel(t) + rel(t), radius, tilt }
}
