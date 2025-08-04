'use client'

import { GameBoard } from '@/components/GameBoard'
import { GameHeader } from '@/components/GameHeader'
import { GameControls } from '@/components/GameControls'
import { useGameStore } from '@/store/gameStore'

export default function Home() {
  const { isInitialized } = useGameStore()

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-4">
        <GameHeader />
        <GameBoard />
        <GameControls />
      </div>
    </main>
  )
}
