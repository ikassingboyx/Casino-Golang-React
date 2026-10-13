import { useEffect, useLayoutEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import { planSpin, POCKET_R } from '../../utils/roulettePhysics'

interface Props {
  // Changing `id` starts a new spin that lands on `winning`.
  spin: { winning: number; id: number } | null
  // Called when the ball has come to rest (the wheel keeps slowing down).
  onSpinEnd: () => void
}

const CANVAS = 600 // wheel artwork size; ball artwork is 16px at this scale
const BALL = 16

// Layered wheel (static rim + rotating wheel) with a ball driven frame by
// frame from a physics-like plan. Only transforms are animated.
export default function RouletteWheel({ spin, onSpinEnd }: Props) {
  const reduceMotion = useReducedMotion() ?? false
  const box = useRef<HTMLDivElement>(null)
  const wheelEl = useRef<HTMLImageElement>(null)
  const ballLayer = useRef<HTMLDivElement>(null)
  const ballEl = useRef<HTMLImageElement>(null)
  const pose = useRef({ wheel: 0, ball: 0, radius: POCKET_R, tilt: 0.9 })
  const onEnd = useRef(onSpinEnd)
  useLayoutEffect(() => {
    onEnd.current = onSpinEnd
  })

  const draw = () => {
    const size = box.current?.offsetWidth ?? CANVAS
    const scale = size / CANVAS
    const { wheel, ball, radius, tilt } = pose.current
    if (wheelEl.current) wheelEl.current.style.transform = `rotate(${wheel}deg)`
    if (ballLayer.current) ballLayer.current.style.transform = `rotate(${ball}deg)`
    if (ballEl.current) {
      ballEl.current.style.width = `${BALL * scale}px`
      // Counter-rotate so the highlight stays where the light is.
      ballEl.current.style.transform = `translate(-50%, -50%) translateY(${-radius * scale}px) rotate(${-ball}deg) scale(${tilt})`
    }
  }

  // Initial pose, and keep it right when the wheel is resized.
  useLayoutEffect(() => {
    draw()
    const ro = new ResizeObserver(draw)
    if (box.current) ro.observe(box.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!spin) return
    const plan = planSpin(spin.winning, pose.current.wheel, pose.current.ball, reduceMotion)
    const start = performance.now()
    let ended = false
    let frame = 0
    const tick = (now: number) => {
      const t = (now - start) / 1000
      pose.current = { wheel: plan.wheel(t), ball: plan.ball(t), radius: plan.radius(t), tilt: plan.tilt(t) }
      draw()
      if (!ended && t >= plan.settleAt) {
        ended = true
        onEnd.current()
      }
      if (t < plan.duration) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [spin, reduceMotion])

  return (
    <div ref={box} className="relative aspect-square w-full select-none" role="img" aria-label="Roulette wheel">
      <img ref={wheelEl} src="/assets/roulette/roulette-inner.svg" alt="" draggable={false} className="absolute inset-0 h-full w-full will-change-transform" />
      <img src="/assets/roulette/roulette-outer.svg" alt="" draggable={false} className="absolute inset-0 h-full w-full" />
      {/* Full-size layer rotated to the ball's angle; the ball sits above its centre. */}
      <div ref={ballLayer} className="pointer-events-none absolute inset-0 will-change-transform">
        <img ref={ballEl} src="/assets/roulette/roulette-ball.svg" alt="" draggable={false} className="absolute left-1/2 top-1/2" />
      </div>
    </div>
  )
}
