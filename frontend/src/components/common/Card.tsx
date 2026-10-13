import { useEffect, useLayoutEffect, useRef } from 'react'
import { motion, useAnimate, usePresence, useReducedMotion } from 'framer-motion'
import type { Card as CardType } from '../../types/game'
import { cardLabel, cardSrc } from '../../utils/cardUtils'
import { CARD_FLIP, DEAL_TRAVEL, useDeal } from './dealing'

interface Props {
  card: CardType
  width?: number
  // Position in the real dealing order (lower is dealt first) for cards that
  // arrive together. A reveal (face-down → face-up) uses dealOrder + 100.
  dealOrder?: number
  marginLeft?: number // negative to tuck under the previous card
}

const BACK = '/assets/cards/back.svg'
const glide = [0.22, 1, 0.36, 1] as const // quick launch, soft landing
const REVEAL_ORDER = 100

// Centre-to-centre offset from `el` to `target`, in px.
function offsetTo(target: Element | null | undefined, el: Element) {
  if (!target) return null
  const a = target.getBoundingClientRect()
  const b = el.getBoundingClientRect()
  return { x: a.left + a.width / 2 - (b.left + b.width / 2), y: a.top + a.height / 2 - (b.top + b.height / 2) }
}

// A playing card with two faces. Inside a <DealProvider> it is dealt from
// the shoe (flying face-down, turning over as it lands), flips when it is
// revealed, slides when its row changes and flies to the discard tray when
// removed (inside AnimatePresence).
export default function Card({ card, width = 96, dealOrder = 0, marginLeft = 0 }: Props) {
  const deal = useDeal()
  const reduceMotion = useReducedMotion()
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const flipper = useRef<HTMLDivElement>(null)
  const [isPresent, safeToRemove] = usePresence()
  const faceUp = !card.hidden
  const shownFaceUp = useRef(faceUp)
  const height = (width * 336) / 240

  // Dealt from the shoe on mount.
  useLayoutEffect(() => {
    const el = scope.current
    const flip = flipper.current!
    const from = deal && !reduceMotion ? offsetTo(deal.shoeRef.current, el) : null
    if (!deal || !from) {
      flip.style.transform = `rotateY(${faceUp ? 0 : 180}deg)`
      return
    }
    el.style.opacity = '0'
    flip.style.transform = 'rotateY(180deg)'
    const turn = deal.requestTurn(dealOrder, DEAL_TRAVEL + CARD_FLIP * 0.5)
    let cancelled = false
    turn.delay.then(async delay => {
      if (cancelled) return
      el.style.zIndex = '20'
      // Start at the shoe (still invisible), appear when this card's turn comes.
      animate(el, { x: from.x, y: from.y, rotate: -18 }, { duration: 0 })
      await Promise.all([
        animate(el, { opacity: 1 }, { duration: 0.08, delay }),
        animate(el, { x: [from.x, 0], y: [from.y, 0], rotate: [-18, 0] }, { duration: DEAL_TRAVEL, delay, ease: glide }),
        faceUp
          ? animate(flip, { rotateY: [180, 0] }, { duration: CARD_FLIP, delay: delay + DEAL_TRAVEL * 0.55, ease: glide })
          : Promise.resolve(),
      ])
      if (cancelled) return
      el.style.zIndex = ''
      shownFaceUp.current = faceUp
      turn.done()
    })
    return () => {
      cancelled = true
      turn.cancel()
    }
    // Runs once per card; later changes are handled by the reveal effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Turned over when it is revealed (e.g. the dealer's hole card).
  useEffect(() => {
    if (faceUp === shownFaceUp.current) return
    shownFaceUp.current = faceUp
    const flip = flipper.current!
    const target = faceUp ? 0 : 180
    if (!deal || reduceMotion) {
      flip.style.transform = `rotateY(${target}deg)`
      return
    }
    const turn = deal.requestTurn(dealOrder + REVEAL_ORDER, CARD_FLIP)
    let cancelled = false
    turn.delay.then(async delay => {
      if (cancelled) return
      await animate(flip, { rotateY: [180 - target, target] }, { duration: CARD_FLIP, delay, ease: glide })
      turn.done()
    })
    return () => {
      cancelled = true
      turn.cancel()
    }
  }, [faceUp, deal, reduceMotion, dealOrder, animate])

  // Swept to the discard tray when removed.
  useEffect(() => {
    if (isPresent) return
    const el = scope.current
    const to = deal && !reduceMotion ? offsetTo(deal.discardRef.current, el) : null
    if (!to) {
      safeToRemove?.()
      return
    }
    el.style.zIndex = '20'
    animate(el, { x: to.x, y: to.y, rotate: 12, opacity: [1, 1, 0] }, { duration: 0.5, ease: glide }).then(() => safeToRemove?.())
  }, [isPresent, safeToRemove, deal, reduceMotion, animate, scope])

  const face = 'absolute inset-0 h-full w-full rounded-[6%] shadow-[0_6px_14px_rgba(0,0,0,0.35)] [backface-visibility:hidden]'
  return (
    // The slot slides when the row's layout changes; the inner element flies.
    <motion.div layout transition={{ type: 'spring', stiffness: 380, damping: 32 }} style={{ width, height, marginLeft }} className="relative">
      <div ref={scope} className="relative h-full w-full [perspective:900px]">
        {/* No filter (e.g. drop-shadow) on the 3D element: it would flatten
            the flip and show the face mirrored instead of the back. */}
        <div ref={flipper} className="relative h-full w-full [transform-style:preserve-3d]">
          <img src={faceUp ? cardSrc(card) : BACK} alt={cardLabel(card)} draggable={false} className={`${face} select-none`} />
          <img src={BACK} alt="" draggable={false} className={`${face} select-none [transform:rotateY(180deg)]`} />
        </div>
      </div>
    </motion.div>
  )
}
