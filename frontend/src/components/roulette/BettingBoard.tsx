import { useEffect, useState } from 'react'
import ChipPile from '../common/ChipPile'

interface Props {
  bets: Record<string, number> // spot name → amount
  onPlace: (spot: string) => void
  disabled: boolean
  winningNumber: number | null
}

// Board artwork: 890x370 canvas. Every bet spot is an element with
// data-bet (spot name) and data-numbers, so the SVG is inlined to make the
// spots clickable and to find where to draw chips.
const BOARD_W = 890
const BOARD_H = 370
const BOARD_URL = '/assets/roulette/roulette-board.svg'
const CHIP_WIDTH = 4.4 // % of board width

type Point = { x: number; y: number }

type Board = { markup: string; spots: Record<string, Point> }

// Load the board once, without the embedded metadata and anything executable,
// and measure the centre of every spot (board coordinates) for placing chips.
let boardPromise: Promise<Board> | null = null
function loadBoard() {
  boardPromise ??= fetch(BOARD_URL)
    .then(r => r.text())
    .then(text => {
      const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
      doc.querySelectorAll('metadata, script, foreignObject').forEach(el => el.remove())
      doc.querySelectorAll('*').forEach(el => {
        for (const attr of [...el.attributes]) if (attr.name.startsWith('on')) el.removeAttribute(attr.name)
      })
      const svg = doc.documentElement
      svg.setAttribute('width', '100%')
      svg.setAttribute('height', '100%')
      const markup = new XMLSerializer().serializeToString(svg)

      // getBBox needs a rendered element, so measure in an off-screen copy.
      const probe = document.createElement('div')
      probe.style.cssText = `position:absolute;left:-10000px;top:0;width:${BOARD_W}px;height:${BOARD_H}px;visibility:hidden`
      probe.innerHTML = markup
      document.body.appendChild(probe)
      const spots: Record<string, Point> = {}
      probe.querySelectorAll<SVGGraphicsElement>('[data-bet]').forEach(el => {
        const name = el.getAttribute('data-bet')
        if (!name || name === '...') return
        const box = el.getBBox()
        spots[name] = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
      })
      probe.remove()
      return { markup, spots }
    })
  return boardPromise
}

export default function BettingBoard({ bets, onPlace, disabled, winningNumber }: Props) {
  const [board, setBoard] = useState<Board | null>(null)

  useEffect(() => {
    let alive = true
    loadBoard().then(b => alive && setBoard(b))
    return () => {
      alive = false
    }
  }, [])

  const markup = board?.markup ?? ''
  const spots = board?.spots ?? {}

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return
    const spot = (e.target as Element).closest('[data-bet]')?.getAttribute('data-bet')
    if (spot && spot !== '...') onPlace(spot)
  }

  const winSpot = winningNumber !== null ? spots[`straight-${winningNumber}`] : undefined

  return (
    <div className="w-full">
      <div className="relative w-full" style={{ aspectRatio: `${BOARD_W} / ${BOARD_H}` }}>
        <div
          onClick={handleClick}
          className={`absolute inset-0 ${disabled ? 'pointer-events-none' : ''}`}
          dangerouslySetInnerHTML={{ __html: markup }}
        />

        <div className="pointer-events-none absolute inset-0">
          {winSpot && (
            <div
              className="absolute aspect-square animate-pulse rounded-full ring-4 ring-brass-light shadow-[0_0_24px_rgba(230,200,120,0.8)]"
              style={{ left: `${(winSpot.x / BOARD_W) * 100}%`, top: `${(winSpot.y / BOARD_H) * 100}%`, width: '6%', transform: 'translate(-50%, -50%)' }}
            />
          )}
          {Object.entries(bets).map(([spot, amount]) => {
            const p = spots[spot]
            if (!p || amount <= 0) return null
            return (
              <div
                key={spot}
                className="absolute"
                style={{ left: `${(p.x / BOARD_W) * 100}%`, top: `${(p.y / BOARD_H) * 100}%`, width: `${CHIP_WIDTH}%`, transform: 'translate(-50%, -50%)' }}
              >
                <ChipPile amount={amount} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
