import type { ReactNode } from 'react'
import { chipTopSrc } from '../../utils/chipUtils'

interface Props {
  info?: ReactNode // left: balance, total bet
  chips?: ReactNode // middle: the chip rack
  actions?: ReactNode // right: game buttons
}

// The control bar under the table.
export default function GameDock({ info, chips, actions }: Props) {
  return (
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 md:justify-between">
      <div className="flex min-w-[9rem] items-center gap-5">{info}</div>
      {chips && <div className="order-first w-full md:order-none md:w-auto">{chips}</div>}
      <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
    </div>
  )
}

export function DockStat({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="leading-tight">
      <div className="text-[11px] text-ivory/50">{label}</div>
      <div className={`text-lg font-extrabold tabular-nums ${accent ? 'text-brass-light' : 'text-ivory'}`}>{value}</div>
    </div>
  )
}

// Your chips off the table.
export function DockChips({ amount }: { amount: number }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-black/40 py-1 pl-1 pr-4 ring-1 ring-brass/40">
      <img src={chipTopSrc(100)} alt="" className="h-8 w-8" draggable={false} />
      <div className="leading-tight">
        <div className="text-[11px] text-ivory/50">Chips</div>
        <div className="text-lg font-extrabold tabular-nums text-ivory">{amount.toLocaleString()}</div>
      </div>
    </div>
  )
}
