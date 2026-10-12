import { motion } from 'framer-motion'
import type { Card as CardType } from '../../types/game'
import { cardLabel, cardSrc } from '../../utils/cardUtils'

interface Props {
  card: CardType
  width?: number
}

// Card image (240x336 artwork) that slides in when dealt.
export default function Card({ card, width = 96 }: Props) {
  return (
    <motion.img
      src={cardSrc(card)}
      alt={cardLabel(card)}
      width={width}
      height={(width * 336) / 240}
      draggable={false}
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="drop-shadow-lg select-none"
    />
  )
}
