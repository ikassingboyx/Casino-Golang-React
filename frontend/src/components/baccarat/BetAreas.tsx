import { motion, type TargetAndTransition } from 'framer-motion'
import ChipPile from '../common/ChipPile'
import { useTableSize } from '../common/tableSize'
import { BACCARAT_SPOTS } from '../../utils/baccarat'
import type { BaccaratBets, BaccaratResult, BaccaratSpot } from '../../types/baccarat'

// How the chips on the felt are settled once the coup is decided:
// reveal → the winning spot lights up; pay → losing stakes are taken by the
// dealer and winnings are pushed next to winning stakes; collect → everything
// left slides back to the player.
export type SettleStage = 'none' | 'reveal' | 'pay' | 'collect'

interface Props {
  bets: BaccaratBets
  payouts?: BaccaratBets
  result?: BaccaratResult
  stage: SettleStage
  disabled: boolean
  onPlace: (spot: BaccaratSpot) => void
}

// Printed on the felt: a coloured outline and wash, the name in the felt's lettering.
const spotStyle: Record<BaccaratSpot, string> = {
  player: 'bg-punto/15 ring-punto/80 text-[#b9d5f3]',
  tie: 'bg-jade/15 ring-jade/80 text-[#a9e3c6]',
  banker: 'bg-banco/15 ring-banco/80 text-[#f4bab4]',
}

function outcomeOf(spot: BaccaratSpot, result: BaccaratResult): 'win' | 'push' | 'lose' {
  if (spot === result) return 'win'
  return result === 'tie' ? 'push' : 'lose'
}

// The three betting spots on the felt; clicking one places the selected chip.
export default function BetAreas({ bets, payouts, result, stage, disabled, onPlace }: Props) {
  const { u } = useTableSize()
  return (
    <div className="grid grid-cols-[1fr_0.75fr_1fr]" style={{ width: u * 46, gap: u }}>
      {BACCARAT_SPOTS.map(({ spot, label, odds }) => (
        <BetSpot
          key={spot}
          label={label}
          odds={odds}
          spot={spot}
          stake={bets[spot]}
          payout={payouts?.[spot] ?? 0}
          outcome={result && stage !== 'none' ? outcomeOf(spot, result) : undefined}
          stage={stage}
          disabled={disabled}
          onPlace={() => onPlace(spot)}
        />
      ))}
    </div>
  )
}

interface SpotProps {
  spot: BaccaratSpot
  label: string
  odds: string
  stake: number
  payout: number
  outcome?: 'win' | 'push' | 'lose'
  stage: SettleStage
  disabled: boolean
  onPlace: () => void
}

const onFelt = { y: 0, opacity: 1, scale: 1 }

function BetSpot({ spot, label, odds, stake, payout, outcome, stage, disabled, onPlace }: SpotProps) {
  const { u } = useTableSize()
  // Chips slide up to the dealer, or down to your seat.
  const toDealer = { y: -u * 22, opacity: 0, scale: 0.7 }
  const toPlayer = { y: u * 22, opacity: 0, scale: 0.9 }
  const pile = { width: u * 4.4 }
  const paying = stage === 'pay' || stage === 'collect'
  const won = outcome === 'win'
  const winnings = won ? payout - stake : 0

  let stakeTarget: TargetAndTransition = onFelt
  if (outcome === 'lose' && paying) stakeTarget = toDealer
  else if (outcome && stage === 'collect') stakeTarget = toPlayer

  return (
    <motion.button
      type="button"
      onClick={onPlace}
      disabled={disabled}
      animate={{ scale: won ? [1, 1.04, 1] : 1, opacity: outcome === 'lose' ? 0.5 : 1 }}
      transition={won ? { scale: { duration: 0.9, repeat: Infinity } } : { duration: 0.3 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className={`relative flex flex-col items-center justify-between rounded-[1.25rem] transition-[filter,background-color] enabled:hover:bg-ivory/10 focus-visible:outline-none focus-visible:ring-ivory disabled:cursor-default ${spotStyle[spot]} ${
        won ? 'ring-4 !ring-brass-light' : 'ring-2'
      }`}
      style={{ height: u * 11, padding: `${u * 0.8}px ${u * 0.4}px` }}
    >
      <div className="text-center leading-tight">
        <div className="font-felt tracking-[0.15em]" style={{ fontSize: Math.max(12, u * 1.6) }}>{label}</div>
        <div className="text-ivory/60" style={{ fontSize: Math.max(10, u * 0.95) }}>pays {odds}</div>
      </div>

      <div className="flex items-end justify-center" style={{ height: u * 5, gap: u * 0.5 }}>
        {stake > 0 && (
          // Re-keyed on every placement so the pile drops onto the felt.
          <motion.div
            key={stake}
            style={pile}
            initial={{ y: -28, scale: 1.25, opacity: 0 }}
            animate={stakeTarget}
            transition={{ type: 'spring', stiffness: 420, damping: 24, opacity: { duration: 0.35 } }}
          >
            <ChipPile amount={stake} />
          </motion.div>
        )}
        {winnings > 0 && paying && (
          <motion.div
            style={pile}
            initial={toDealer}
            animate={stage === 'collect' ? toPlayer : onFelt}
            transition={{ type: 'spring', stiffness: 260, damping: 24, opacity: { duration: 0.35 } }}
          >
            <ChipPile amount={winnings} />
          </motion.div>
        )}
      </div>

      <div className="font-bold text-ivory" style={{ height: Math.max(14, u * 1.5), fontSize: Math.max(11, u * 1.15) }}>
        {stake > 0 && <span>{stake}</span>}
        {winnings > 0 && paying && <span className="ml-1 text-brass-light">+{winnings}</span>}
      </div>
    </motion.button>
  )
}
