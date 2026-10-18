import type { KeyboardEvent } from 'react'

export interface Spot {
  id: string
  name: string
  x: number // top-left of the station artwork in the scene (1920x1080)
  y: number
  ready: boolean
}

const SPOT_W = 440
const SPOT_H = 560
const CEILING = 140 // where the banner chains hang from
const BANNER_Y = -52 // banner top, relative to the station (it hangs above the dealer)
const BANNER_W = 300
const BANNER_H = 78

interface Props {
  spot: Spot
  onOpen: () => void
}

// One game in the casino scene: its station artwork (dealer and table), the
// banner with its name hanging above, and a spotlight that comes on when
// the station is hovered or focused.
export default function GameSpot({ spot, onOpen }: Props) {
  const cx = spot.x + SPOT_W / 2
  const by = spot.y + BANNER_Y
  const open = () => spot.ready && onOpen()
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open()
    }
  }
  const bulbs = Array.from({ length: 9 }, (_, i) => -BANNER_W / 2 + 22 + (i * (BANNER_W - 44)) / 8)

  return (
    <g
      className="game-spot"
      role={spot.ready ? 'link' : undefined}
      tabIndex={spot.ready ? 0 : undefined}
      aria-label={spot.ready ? `Play ${spot.name}` : `${spot.name}, coming soon`}
      aria-disabled={!spot.ready || undefined}
      onClick={open}
      onKeyDown={onKey}
    >
      <title>{spot.ready ? `Play ${spot.name}` : `${spot.name} — coming soon`}</title>

      {/* Spotlight from the ceiling onto the table, and its pool on the carpet. */}
      <g className="spot-light" pointerEvents="none">
        <path d={`M${cx - 50} 0 H${cx + 50} L${cx + 250} ${spot.y + 500} H${cx - 250} Z`} fill="url(#spotBeam)" />
        <ellipse cx={cx} cy={spot.y + 500} rx={260} ry={70} fill="url(#spotPool)" />
      </g>

      {/* Generous hit area: banner down to the stools. */}
      <rect x={spot.x} y={by} width={SPOT_W} height={SPOT_H - BANNER_Y} fill="transparent" />

      <g className="spot-art">
        <image href={`/assets/images/lobby-${spot.id}.svg`} x={spot.x} y={spot.y} width={SPOT_W} height={SPOT_H} />
      </g>

      <g className="spot-banner" transform={`translate(${cx} ${by})`}>
        {[-1, 1].map(side => (
          <path key={side} d={`M${side * 110} 0 V${CEILING - by}`} stroke="#c88a2c" strokeWidth={3} strokeDasharray="7 4" />
        ))}
        <rect x={-BANNER_W / 2} y={0} width={BANNER_W} height={BANNER_H} rx={14} fill="#2a0407" stroke="url(#bannerGold)" strokeWidth={5} />
        {bulbs.flatMap(x =>
          [9, BANNER_H - 9].map(y => <circle key={`${x}:${y}`} className="spot-bulb" cx={x} cy={y} r={4} fill="url(#bannerBulb)" />),
        )}
        <text className="spot-name-glow font-felt" x={0} y={BANNER_H / 2 + 13} textAnchor="middle" fontSize={38} fill="#ff9a40" filter="url(#bannerGlow)">
          {spot.name}
        </text>
        <text className="font-felt" x={0} y={BANNER_H / 2 + 13} textAnchor="middle" fontSize={38} fill="#ffe7a3" letterSpacing={2}>
          {spot.name}
        </text>
      </g>

      {spot.ready ? (
        <g className="spot-cta" transform={`translate(${cx} ${spot.y + 468})`} pointerEvents="none">
          <rect x={-95} y={-22} width={190} height={44} rx={22} fill="url(#bannerGold)" stroke="#5a3608" strokeWidth={2} />
          <text x={0} y={7} textAnchor="middle" fontSize={20} fontWeight={800} fill="#2a1a05">
            Play {spot.name}
          </text>
        </g>
      ) : (
        <g transform={`translate(${cx} ${spot.y + 468})`} pointerEvents="none">
          <rect x={-80} y={-18} width={160} height={36} rx={18} fill="#7a0b12" stroke="#c88a2c" strokeWidth={2} />
          <text x={0} y={6} textAnchor="middle" fontSize={17} fontWeight={700} fill="#f1e8d2">
            Coming soon
          </text>
        </g>
      )}
    </g>
  )
}
