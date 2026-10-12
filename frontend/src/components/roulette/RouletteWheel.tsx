import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { spinTargets } from '../../utils/roulette'

interface Props {
  // Changing `id` starts a new spin that lands on `winning`.
  spin: { winning: number; id: number } | null
  onSpinEnd: () => void
}

// Asset geometry (600x600 canvas, see assets/roulette): the ball orbits on
// the track at r≈243 and rests in a pocket at r≈168; it is 16px wide.
const CANVAS = 600
const TRACK_R = 243
const POCKET_R = 168
const BALL = 16
const SPIN_SECONDS = 7

// Ball position as a % offset from the top of the wheel for a given radius.
const topFor = (r: number) => `${((CANVAS / 2 - r - BALL / 2) / CANVAS) * 100}%`

export default function RouletteWheel({ spin, onSpinEnd }: Props) {
  const [wheelDeg, setWheelDeg] = useState(0)
  const [ballDeg, setBallDeg] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const angles = useRef({ wheel: 0, ball: 0 })

  useEffect(() => {
    if (!spin) return
    const t = spinTargets(spin.winning, angles.current.wheel, angles.current.ball)
    angles.current = { wheel: t.wheelDeg, ball: t.ballDeg }
    setWheelDeg(t.wheelDeg)
    setBallDeg(t.ballDeg)
    setSpinning(true)
  }, [spin])

  const ease = [0.12, 0.6, 0.22, 1] as const // fast start, long slow-down

  return (
    <div className="relative aspect-square w-full select-none" role="img" aria-label="Roulette wheel">
      <motion.img
        src="/assets/roulette/roulette-inner.svg"
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full"
        initial={false}
        animate={{ rotate: wheelDeg }}
        transition={{ duration: SPIN_SECONDS, ease }}
        onAnimationComplete={() => {
          if (!spinning) return
          setSpinning(false)
          onSpinEnd()
        }}
      />
      <img src="/assets/roulette/roulette-outer.svg" alt="" draggable={false} className="absolute inset-0 h-full w-full" />

      {/* The ball rides a full-size layer that rotates; its distance from the
          top of that layer is its distance from the wheel's center. */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={false}
        animate={{ rotate: ballDeg }}
        transition={{ duration: SPIN_SECONDS, ease }}
      >
        <motion.img
          src="/assets/roulette/roulette-ball.svg"
          alt=""
          draggable={false}
          className="absolute"
          style={{ left: `${((CANVAS / 2 - BALL / 2) / CANVAS) * 100}%`, width: `${(BALL / CANVAS) * 100}%` }}
          initial={false}
          animate={{
            top: spinning
              // out to the track, orbit, then drop and bounce into the pocket
              ? [topFor(POCKET_R), topFor(TRACK_R), topFor(TRACK_R), topFor(205), topFor(184), topFor(174), topFor(POCKET_R)]
              : topFor(POCKET_R),
          }}
          transition={spinning ? { duration: SPIN_SECONDS, times: [0, 0.05, 0.58, 0.72, 0.82, 0.91, 1] } : { duration: 0 }}
        />
      </motion.div>
    </div>
  )
}
