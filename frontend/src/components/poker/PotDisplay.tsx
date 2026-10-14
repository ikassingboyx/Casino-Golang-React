import { AnimatePresence, motion } from 'framer-motion'
import ChipPile from '../common/ChipPile'
import { useTableSize } from '../common/tableSize'
import type { SidePot } from '../../types/poker'

interface Props {
  amount: number // chips swept into the middle
  sidePots?: SidePot[] // main pot first, when there is more than one
}

// The pot in the middle of the felt.
export default function PotDisplay({ amount, sidePots = [] }: Props) {
  const { u } = useTableSize()
  const pile = u * 3.6
  return (
    <AnimatePresence>
      {amount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          className="flex flex-col items-center"
          style={{ gap: u * 0.4 }}
        >
          <div style={{ width: pile }}>
            <ChipPile amount={amount} maxVisible={7} />
          </div>
          <motion.div
            key={amount}
            initial={{ scale: 1.25 }}
            animate={{ scale: 1 }}
            className="whitespace-nowrap rounded-full bg-black/55 px-3 py-0.5 font-extrabold tabular-nums text-ivory ring-1 ring-brass/40"
            style={{ fontSize: Math.max(12, u * 1.3) }}
          >
            Pot {amount.toLocaleString()}
          </motion.div>
          {sidePots.length > 1 && (
            <div className="whitespace-nowrap text-ivory/70" style={{ fontSize: Math.max(10, u * 1.05) }}>
              {sidePots.map((p, i) => `${i === 0 ? 'Main' : `Side ${i}`} ${p.amount.toLocaleString()}`).join(' · ')}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
