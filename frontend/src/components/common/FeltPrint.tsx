import { useTableSize } from './tableSize'

interface Props {
  text: string
  y: number // % of the table height at the arc's ends
  sag?: number // how far the middle dips, % of the table height
  spread?: number // width of the arc, % of the table width
}

// Lettering printed on the felt, following the curve of the rail.
export default function FeltPrint({ text, y, sag = 9, spread = 56 }: Props) {
  const { width, height, u } = useTableSize()
  const x1 = (width * (100 - spread)) / 200
  const x2 = width - x1
  const top = (height * y) / 100
  const path = `M ${x1} ${top} Q ${width / 2} ${top + (2 * height * sag) / 100} ${x2} ${top}`
  return (
    <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden>
      <path id={`felt-${y}`} d={path} fill="none" />
      <text className="font-felt" fill="rgba(230,200,120,0.55)" fontSize={Math.max(10, u * 1.25)} letterSpacing={u * 0.25}>
        <textPath href={`#felt-${y}`} startOffset="50%" textAnchor="middle">
          {text}
        </textPath>
      </text>
    </svg>
  )
}
