'use client'

import { motion } from 'framer-motion'
import { Symbol, Position } from '@/types/game'
import { useGameStore } from '@/store/gameStore'

interface GridCellProps {
  symbol: Symbol | null
  position: Position
}

export function GridCell({ symbol, position }: GridCellProps) {
  const { clusters } = useGameStore()

  const isWinning = clusters.some(cluster =>
    cluster.positions.some(pos => pos.row === position.row && pos.col === position.col)
  )

  if (!symbol) {
    return <div className="grid-cell grid-cell-empty" />
  }

  return (
    <motion.div
      className={`
        grid-cell grid-cell-filled
        ${isWinning ? 'winning-cell' : ''}
        ${symbol.isWild ? 'ring-2 ring-game-gold' : ''}
        ${symbol.isSpecial ? 'ring-2 ring-game-purple' : ''}
      `}
      style={{ backgroundColor: `${symbol.color}33` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="text-3xl">{symbol.icon}</span>
    </motion.div>
  )
}
