'use client'

import { useGameStore } from '@/store/gameStore'
import { motion } from 'framer-motion'

export function GameHeader() {
  const { balance, winAmount, betAmount } = useGameStore()

  return (
    <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-6">
      <h1 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-game-accent to-orange-500 bg-clip-text text-transparent">
        CS2 Grid Battle
      </h1>

      <div className="flex justify-between items-center">
        <StatDisplay label="Balance" value={`$${balance.toFixed(2)}`} />
        <StatDisplay label="Bet" value={`$${betAmount.toFixed(2)}`} />
        <StatDisplay
          label="Win"
          value={`$${winAmount.toFixed(2)}`}
          highlight={winAmount > 0}
          testId="win-amount"
        />
      </div>
    </div>
  )
}

function StatDisplay({
  label,
  value,
  highlight = false,
  testId,
}: {
  label: string
  value: string
  highlight?: boolean
  testId?: string
}) {
  return (
    <div className="text-center">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <motion.p
        className={`text-2xl font-bold ${highlight ? 'text-game-gold' : 'text-white'}`}
        animate={highlight ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.3 }}
        data-testid={testId}
      >
        {value}
      </motion.p>
    </div>
  )
}
