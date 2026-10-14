import { useState } from 'react'
import GameDock, { DockChips, DockStat } from '../common/GameDock'
import type { PokerAction } from '../../types/poker'

interface Props {
  chips: number // your stack behind
  myBet: number // what you have in front of you on this street
  currentBet: number
  minRaise: number // smallest total a raise may bring your bet to
  pot: number // everything in the middle, bets included
  actions: PokerAction[] // what you may do now; empty while others act
  disabled: boolean
  handOver: boolean
  onAct: (action: PokerAction, amount?: number) => void
  onNextHand: () => void
}

// The dock under the poker table: your stack, and fold / check / call /
// raise (with a slider and pot-size presets) / all-in on your turn.
export default function PokerControls(props: Props) {
  const { chips, myBet, currentBet, minRaise, pot, actions, disabled, handOver, onAct, onNextHand } = props
  const toCall = Math.max(0, Math.min(currentBet - myBet, chips))
  const can = (a: PokerAction) => !disabled && actions.includes(a)
  const maxTo = chips + myBet // all-in
  const minTo = Math.min(minRaise, maxTo)

  // The raise amount resets whenever the spot changes (a new turn).
  const spot = `${currentBet}:${minRaise}:${myBet}:${actions.join()}`
  const [raise, setRaise] = useState({ spot, to: minTo })
  if (raise.spot !== spot) setRaise({ spot, to: minTo })
  const to = Math.min(Math.max(raise.to, minTo), maxTo)
  const setTo = (v: number) => setRaise({ spot, to: Math.round(v) })

  // Pot-sized raise: call, then raise by the pot after calling.
  const potRaise = (fraction: number) => currentBet + Math.round((pot + toCall) * fraction)
  const presets: [string, number][] = [
    ['Min', minTo],
    ['½ Pot', potRaise(0.5)],
    ['Pot', potRaise(1)],
  ]
  const betWord = currentBet === 0 ? 'Bet' : 'Raise to'

  const info = (
    <>
      <DockChips amount={chips} />
      <DockStat label="Pot" value={pot.toLocaleString()} accent />
      {toCall > 0 && !handOver && <DockStat label="To call" value={toCall.toLocaleString()} />}
    </>
  )

  if (handOver) {
    return (
      <GameDock
        info={info}
        actions={
          <button onClick={onNextHand} disabled={disabled} className="dock-primary">
            Deal next hand
          </button>
        }
      />
    )
  }

  // The raise controls stay in the dock (disabled) between turns so it doesn't change size.
  const raising = can('raise')
  return (
    <GameDock
      info={info}
      chips={
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {presets.map(([label, v]) => (
            <button key={label} onClick={() => setTo(v)} disabled={!raising || v > maxTo} className="dock-btn !px-2.5 !py-1 text-xs">
              {label}
            </button>
          ))}
          <input
            type="range"
            aria-label="Raise amount"
            min={minTo}
            max={maxTo}
            step={Math.max(1, Math.round(minRaise / 20))}
            value={raising ? to : minTo}
            disabled={!raising}
            onChange={e => setTo(Number(e.target.value))}
            className="w-32 accent-[#e6c878] disabled:opacity-35 lg:w-44"
          />
          <input
            type="number"
            aria-label="Raise to"
            min={minTo}
            max={maxTo}
            value={raising ? to : ''}
            disabled={!raising}
            onChange={e => setTo(Number(e.target.value) || minTo)}
            className="w-20 rounded-full bg-black/40 px-3 py-1 text-right text-sm font-bold tabular-nums text-ivory ring-1 ring-brass/40 focus:outline-none focus:ring-brass-light disabled:opacity-35"
          />
        </div>
      }
      actions={
        <>
          <button onClick={() => onAct('fold')} disabled={!can('fold')} className="dock-btn">
            Fold
          </button>
          {actions.includes('call') ? (
            <button onClick={() => onAct('call')} disabled={!can('call')} className="dock-primary !px-5">
              {toCall >= chips ? `Call all-in ${toCall.toLocaleString()}` : `Call ${toCall.toLocaleString()}`}
            </button>
          ) : (
            <button onClick={() => onAct('check')} disabled={!can('check')} className="dock-primary !px-5">
              Check
            </button>
          )}
          <button onClick={() => (to >= maxTo ? onAct('all_in') : onAct('raise', to))} disabled={!raising} className="dock-primary !px-5">
            {!raising ? (currentBet === 0 ? 'Bet' : 'Raise') : to >= maxTo ? 'All-in' : `${betWord} ${to.toLocaleString()}`}
          </button>
          <button onClick={() => onAct('all_in')} disabled={!can('all_in')} className="dock-btn">
            All-in
          </button>
        </>
      }
    />
  )
}
