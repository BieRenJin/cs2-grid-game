import { supabase } from '@/lib/supabase'
import { Symbol, Cluster, Position } from '@/types/game'

export interface SpinResult {
  session_id: string
  grid: Symbol[][]
  clusters: Cluster[]
  win_amount: number
  total_win: number
  special_effects: any[]
  execution_time_ms: number
  rng_seed: number
}

export interface RTPTestResult {
  totalSpins: number
  totalWagered: number
  totalWon: number
  rtp: number
  executionTimeMs: number
  winFrequency: number
  averageWin: number
  maxWin: number
  minWin: number
  winRanges: Array<{
    range: string
    count: number
    percentage: number
  }>
  specialSymbolStats: {
    rush: { count: number; totalWin: number }
    surge: { count: number; totalWin: number }
    slash: { count: number; totalWin: number }
  }
  clusterStats: Array<{
    size: number
    count: number
    totalPayout: number
  }>
}

export class GameService {
  // Perform a spin using Supabase Edge Function
  static async spin(betAmount: number, seed?: number): Promise<SpinResult> {
    try {
      console.log(`🎰 Calling spin API: $${betAmount} bet`)

      const { data, error } = await supabase.functions.invoke('spin', {
        body: {
          bet_amount: betAmount,
          seed: seed,
        },
      })

      if (error) {
        console.error('Spin API error:', error)
        throw error
      }

      console.log(`✅ Spin result: $${data.win_amount} won in ${data.execution_time_ms}ms`)
      return data
    } catch (error) {
      console.error('Spin error:', error)
      throw new Error(`Spin failed: ${error.message}`)
    }
  }

  // Run RTP test using Supabase Edge Function
  static async runRTPTest(
    iterations: number = 100000,
    betAmount: number = 1,
    testType: 'quick' | 'full' | 'scenario' = 'full',
    scenario?: string
  ): Promise<{ results: RTPTestResult; summary: any }> {
    try {
      console.log(`🧪 Starting RTP test: ${iterations.toLocaleString()} iterations`)

      const { data, error } = await supabase.functions.invoke('rtp-test', {
        body: {
          iterations,
          bet_amount: betAmount,
          test_type: testType,
          scenario,
        },
      })

      if (error) {
        console.error('RTP Test API error:', error)
        throw error
      }

      console.log(`✅ RTP Test complete: ${data.results.rtp.toFixed(2)}% RTP`)
      return data
    } catch (error) {
      console.error('RTP Test error:', error)
      throw new Error(`RTP test failed: ${error.message}`)
    }
  }

  // Test game engine functions
  static async testGameEngine(
    action: 'test-spin' | 'test-special' | 'benchmark' | 'analyze-symbols',
    options: {
      betAmount?: number
      seed?: number
      iterations?: number
      specialType?: 'rush' | 'surge' | 'slash'
    } = {}
  ) {
    try {
      console.log(`🔧 Testing game engine: ${action}`)

      const { data, error } = await supabase.functions.invoke('game-engine', {
        body: {
          action,
          bet_amount: options.betAmount || 1,
          seed: options.seed,
          iterations: options.iterations || 1000,
          special_type: options.specialType,
        },
      })

      if (error) {
        console.error('Game Engine API error:', error)
        throw error
      }

      console.log(`✅ Game engine test complete: ${action}`)
      return data
    } catch (error) {
      console.error('Game Engine test error:', error)
      throw new Error(`Game engine test failed: ${error.message}`)
    }
  }

  // Quick RTP test (10K iterations)
  static async quickRTPTest(): Promise<{ results: RTPTestResult; summary: any }> {
    return this.runRTPTest(10000, 1, 'quick')
  }

  // Full RTP test (1M iterations)
  static async fullRTPTest(): Promise<{ results: RTPTestResult; summary: any }> {
    return this.runRTPTest(1000000, 1, 'full')
  }

  // Test specific scenarios
  static async testScenario(
    scenario: string,
    iterations: number = 100000
  ): Promise<{ results: RTPTestResult; summary: any }> {
    return this.runRTPTest(iterations, 1, 'scenario', scenario)
  }

  // Benchmark game performance
  static async benchmarkPerformance(iterations: number = 1000) {
    return this.testGameEngine('benchmark', { iterations })
  }

  // Analyze symbol distribution
  static async analyzeSymbols(iterations: number = 10000) {
    return this.testGameEngine('analyze-symbols', { iterations })
  }

  // Test special symbols
  static async testSpecialSymbols(iterations: number = 1000) {
    return this.testGameEngine('test-special', { iterations })
  }

  // Get user statistics (database)
  static async getUserStats(userId: string) {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Get user stats error:', error)
      return null
    }
  }

  // Get leaderboard (database)
  static async getLeaderboard(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('win_amount', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data
    } catch (error) {
      console.error('Get leaderboard error:', error)
      return []
    }
  }
}
