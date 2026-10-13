import { useLayoutEffect, useRef } from 'react'
import GameSpot, { type Spot } from './GameSpot'

export const SCENE_W = 1920
export const SCENE_H = 1080

interface Props {
  spots: Spot[]
  onOpen: (spot: Spot) => void
}

// The lobby: an illustrated casino floor with one station per game. It
// fills the screen; on narrow screens it keeps its proportions and scrolls
// sideways, starting in the middle of the room.
export default function CasinoInterior({ spots, onOpen }: Props) {
  const scroller = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
  }, [])

  return (
    <div ref={scroller} className="h-full w-full overflow-x-auto overflow-y-hidden">
      <svg
        viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="block h-full min-w-full select-none"
        style={{ aspectRatio: `${SCENE_W} / ${SCENE_H}` }}
        role="group"
        aria-label="Casino floor: pick a table"
      >
        <defs>
          <linearGradient id="spotBeam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff1c4" stopOpacity=".55" />
            <stop offset=".7" stopColor="#ffb050" stopOpacity=".18" />
            <stop offset="1" stopColor="#ff9a40" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="spotPool">
            <stop offset="0" stopColor="#ffd27a" stopOpacity=".55" />
            <stop offset="1" stopColor="#ff9a40" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="bannerGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe7a3" />
            <stop offset=".5" stopColor="#e2a83c" />
            <stop offset="1" stopColor="#9a6416" />
          </linearGradient>
          <radialGradient id="bannerBulb">
            <stop offset="0" stopColor="#fff8e0" />
            <stop offset=".5" stopColor="#ffd77a" />
            <stop offset="1" stopColor="#ff9a30" />
          </radialGradient>
          <filter id="bannerGlow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <image href="/assets/images/lobby-room.svg" width={SCENE_W} height={SCENE_H} preserveAspectRatio="xMidYMid slice" />

        {spots.map(spot => (
          <GameSpot key={spot.id} spot={spot} onOpen={() => onOpen(spot)} />
        ))}
      </svg>
    </div>
  )
}
