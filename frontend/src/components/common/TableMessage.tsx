import { AnimatePresence, motion } from 'framer-motion'
import { useTableSize } from './tableSize'

// The dealer's announcement in the middle of the felt.
export default function TableMessage({ text, y }: { text?: string; y: number }) {
  const { u } = useTableSize()
  return (
    <div className="pointer-events-none absolute inset-x-0 flex justify-center" style={{ top: `${y}%` }} aria-live="polite">
      <AnimatePresence mode="wait">
        {text && (
          <motion.div
            key={text}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="-translate-y-1/2 rounded-full bg-black/45 px-4 py-1 text-center font-bold text-ivory shadow-[0_4px_14px_rgba(0,0,0,0.35)] ring-1 ring-brass/30"
            style={{ fontSize: Math.max(13, u * 1.5) }}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
