'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'
import { GridCell } from './GridCell'

export function GameBoard() {
  const { grid, initializeGrid, isInitialized } = useGameStore()

  useEffect(() => {
    if (!isInitialized) {
      initializeGrid()
    }
  }, [isInitialized, initializeGrid])

  return (
    <div className="relative bg-black/50 p-4 rounded-2xl backdrop-blur-sm">
      <div className="grid grid-cols-7 gap-1 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {grid.map((row, rowIndex) =>
            row.map((symbol, colIndex) => (
              <GridCell
                key={`${rowIndex}-${colIndex}`}
                symbol={symbol}
                position={{ row: rowIndex, col: colIndex }}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
