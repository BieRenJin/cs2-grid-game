'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'

export function GameControls() {
  const { betAmount, setBetAmount, spin, isSpinning, balance } = useGameStore()
  const [showSettings, setShowSettings] = useState(false)

  const handleBetChange = (delta: number) => {
    const newBet = Math.max(0.1, Math.min(1000, betAmount + delta))
    setBetAmount(newBet)
  }

  return (
    <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-6 space-y-4">
      {/* Bet Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => handleBetChange(-0.1)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          disabled={isSpinning}
        >
          -
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-400">Bet Amount</p>
          <input
            type="number"
            value={betAmount}
            onChange={e => setBetAmount(parseFloat(e.target.value) || 0.1)}
            className="w-24 px-3 py-1 bg-gray-800 text-white text-center rounded-lg"
            min="0.1"
            max="1000"
            step="0.1"
            disabled={isSpinning}
          />
        </div>

        <button
          onClick={() => handleBetChange(0.1)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          disabled={isSpinning}
        >
          +
        </button>
      </div>

      {/* Spin Button */}
      <motion.button
        onClick={spin}
        disabled={isSpinning || balance < betAmount}
        className="spin-button w-full"
        data-testid="spin-button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {isSpinning ? 'SPINNING...' : 'SPIN'}
      </motion.button>

      {/* Quick Bet Options */}
      <div className="flex justify-center gap-2">
        {[0.5, 1, 2, 5, 10].map(amount => (
          <button
            key={amount}
            onClick={() => setBetAmount(amount)}
            className={`
              px-3 py-1 rounded-lg transition-all
              ${
                betAmount === amount
                  ? 'bg-game-accent text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }
            `}
            disabled={isSpinning}
          >
            ${amount}
          </button>
        ))}
      </div>

      {/* Settings Toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
      >
        {showSettings ? 'Hide' : 'Show'} Settings
      </button>

      {/* Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2 pt-2"
        >
          <button className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm">
            Auto Play
          </button>
          <button className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm">
            Paytable
          </button>
          <button className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm">
            Sound: ON
          </button>
        </motion.div>
      )}
    </div>
  )
}
