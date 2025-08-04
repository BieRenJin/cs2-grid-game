import { create } from 'zustand'
import { Symbol, Cluster, GameState, Position } from '@/types/game'

interface GameStore {
  // State
  grid: Symbol[][]
  balance: number
  betAmount: number
  winAmount: number
  isSpinning: boolean
  clusters: Cluster[]
  specialSymbols: Position[]
  isInitialized: boolean

  // Actions
  initializeGrid: () => void
  setBetAmount: (amount: number) => void
  spin: () => Promise<void>
  updateGrid: (grid: Symbol[][]) => void
  processClusters: (clusters: Cluster[]) => void
  updateBalance: (balance: number) => void
  setWinAmount: (amount: number) => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  grid: Array(7)
    .fill(null)
    .map(() => Array(7).fill(null)),
  balance: 1000,
  betAmount: 1,
  winAmount: 0,
  isSpinning: false,
  clusters: [],
  specialSymbols: [],
  isInitialized: false,

  // Actions
  initializeGrid: () => {
    const newGrid = Array(7)
      .fill(null)
      .map(() =>
        Array(7)
          .fill(null)
          .map(() => generateRandomSymbol())
      )
    set({ grid: newGrid, isInitialized: true })
  },

  setBetAmount: amount => set({ betAmount: amount }),

  spin: async () => {
    const state = get()
    if (state.isSpinning || state.balance < state.betAmount) return

    set({ isSpinning: true, winAmount: 0 })

    // This will be replaced with actual API call to Supabase
    // For now, simulate with local logic
    await new Promise(resolve => setTimeout(resolve, 1000))

    const newGrid = Array(7)
      .fill(null)
      .map(() =>
        Array(7)
          .fill(null)
          .map(() => generateRandomSymbol())
      )

    set({
      grid: newGrid,
      balance: state.balance - state.betAmount,
      isSpinning: false,
    })
  },

  updateGrid: grid => set({ grid }),

  processClusters: clusters => {
    const totalWin = clusters.reduce((sum, cluster) => sum + calculateClusterPayout(cluster), 0)
    set(state => ({
      clusters,
      winAmount: totalWin,
      balance: state.balance + totalWin,
    }))
  },

  updateBalance: balance => set({ balance }),

  setWinAmount: amount => set({ winAmount: amount }),
}))

// Helper functions (temporary - will move to API)
function generateRandomSymbol(): Symbol {
  const symbols = [
    { id: 'flashbang', name: 'Flashbang', icon: '💥', color: '#808080', tier: 1 },
    { id: 'smoke', name: 'Smoke', icon: '💨', color: '#696969', tier: 1 },
    { id: 'hegrenade', name: 'HE Grenade', icon: '💣', color: '#8B4513', tier: 2 },
    { id: 'kevlar', name: 'Kevlar', icon: '🛡️', color: '#4169E1', tier: 2 },
    { id: 'defuse', name: 'Defuse Kit', icon: '🔧', color: '#32CD32', tier: 3 },
    { id: 'deagle', name: 'Desert Eagle', icon: '🔫', color: '#DAA520', tier: 3 },
    { id: 'ak47', name: 'AK-47', icon: '🔫', color: '#8B0000', tier: 4 },
    { id: 'awp', name: 'AWP', icon: '🎯', color: '#4B0082', tier: 4 },
  ]
  return symbols[Math.floor(Math.random() * symbols.length)]
}

function calculateClusterPayout(cluster: Cluster): number {
  // Simplified payout calculation
  const basePayouts: Record<number, number> = {
    5: 0.5,
    6: 1,
    7: 2,
    8: 3,
    9: 5,
    10: 10,
  }
  return basePayouts[Math.min(cluster.size, 10)] || 0
}
