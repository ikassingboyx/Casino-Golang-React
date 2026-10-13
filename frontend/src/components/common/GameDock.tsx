import type { ReactNode } from 'react'

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
