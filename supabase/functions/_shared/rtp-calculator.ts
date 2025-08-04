import { GameEngine, GameResult } from './game-engine.ts'
import { GameRNG } from './rng.ts'

export interface RTPTestResult {
  totalSpins: number
  totalWagered: number
  totalWon: number
  rtp: number
  executionTimeMs: number

  // Detailed statistics
  winFrequency: number // % of spins that won
  averageWin: number
  maxWin: number
  minWin: number

  // Win distribution
  winRanges: {
    range: string
    count: number
    percentage: number
  }[]

  // Special symbol statistics
  specialSymbolStats: {
    rush: { count: number; totalWin: number }
    surge: { count: number; totalWin: number }
    slash: { count: number; totalWin: number }
  }

  // Cluster size distribution
  clusterStats: {
    size: number
    count: number
    totalPayout: number
  }[]
}

/**
 * High-performance RTP calculator for massive testing
 */
export class RTPCalculator {
  private engine: GameEngine
  private rng: GameRNG

  constructor(seed?: number) {
    this.rng = new GameRNG(seed)
    this.engine = new GameEngine(this.rng)
  }

  /**
   * Run massive RTP test (optimized for performance)
   */
  async runRTPTest(
    iterations: number = 1000000,
    betAmount: number = 1,
    progressCallback?: (progress: number) => void
  ): Promise<RTPTestResult> {
    console.log(`Starting RTP test: ${iterations.toLocaleString()} spins at $${betAmount} bet`)

    const startTime = Date.now()
    let totalWagered = 0
    let totalWon = 0
    let winningSpins = 0
    let maxWin = 0
    let minWin = Infinity

    // Statistics tracking
    const winRanges = [
      { min: 0, max: 0, count: 0 },
      { min: 0.01, max: 1, count: 0 },
      { min: 1.01, max: 5, count: 0 },
      { min: 5.01, max: 10, count: 0 },
      { min: 10.01, max: 25, count: 0 },
      { min: 25.01, max: 50, count: 0 },
      { min: 50.01, max: 100, count: 0 },
      { min: 100.01, max: Infinity, count: 0 },
    ]

    const specialSymbolStats = {
      rush: { count: 0, totalWin: 0 },
      surge: { count: 0, totalWin: 0 },
      slash: { count: 0, totalWin: 0 },
    }

    const clusterStats = new Map<number, { count: number; totalPayout: number }>()

    // Progress tracking
    const progressInterval = Math.floor(iterations / 100)

    // Main testing loop (optimized)
    for (let i = 0; i < iterations; i++) {
      totalWagered += betAmount

      // Process spin
      const result = await this.engine.processSpin(betAmount)
      const winAmount = result.totalWin

      totalWon += winAmount

      if (winAmount > 0) {
        winningSpins++
        maxWin = Math.max(maxWin, winAmount)
        minWin = Math.min(minWin, winAmount)

        // Track win ranges
        const winMultiplier = winAmount / betAmount
        for (const range of winRanges) {
          if (winMultiplier >= range.min && winMultiplier <= range.max) {
            range.count++
            break
          }
        }
      }

      // Track special symbols
      for (const effect of result.specialEffects) {
        specialSymbolStats[effect.type].count++
        specialSymbolStats[effect.type].totalWin += winAmount
      }

      // Track cluster statistics
      for (const cluster of result.clusters) {
        if (!clusterStats.has(cluster.size)) {
          clusterStats.set(cluster.size, { count: 0, totalPayout: 0 })
        }
        const stats = clusterStats.get(cluster.size)!
        stats.count++
        stats.totalPayout += cluster.payout * betAmount
      }

      // Progress reporting
      if (progressCallback && i % progressInterval === 0) {
        progressCallback((i / iterations) * 100)
      }
    }

    const endTime = Date.now()
    const executionTimeMs = endTime - startTime

    // Calculate final statistics
    const rtp = (totalWon / totalWagered) * 100
    const winFrequency = (winningSpins / iterations) * 100
    const averageWin = winningSpins > 0 ? totalWon / winningSpins : 0

    if (minWin === Infinity) minWin = 0

    console.log(`RTP Test Complete: ${rtp.toFixed(2)}% RTP in ${executionTimeMs}ms`)

    return {
      totalSpins: iterations,
      totalWagered,
      totalWon,
      rtp,
      executionTimeMs,
      winFrequency,
      averageWin,
      maxWin,
      minWin,
      winRanges: winRanges.map(r => ({
        range: r.max === Infinity ? `${r.min}x+` : `${r.min}x-${r.max}x`,
        count: r.count,
        percentage: (r.count / iterations) * 100,
      })),
      specialSymbolStats,
      clusterStats: Array.from(clusterStats.entries())
        .map(([size, stats]) => ({
          size,
          count: stats.count,
          totalPayout: stats.totalPayout,
        }))
        .sort((a, b) => a.size - b.size),
    }
  }

  /**
   * Quick RTP test for development
   */
  async quickRTPTest(iterations: number = 10000): Promise<RTPTestResult> {
    return this.runRTPTest(iterations, 1)
  }

  /**
   * Test specific scenarios
   */
  async testScenario(scenario: string, iterations: number = 100000): Promise<RTPTestResult> {
    // Reset RNG with specific seed for consistent results
    switch (scenario) {
      case 'high-variance':
        this.rng.setSeed(12345)
        break
      case 'low-variance':
        this.rng.setSeed(54321)
        break
      case 'special-heavy':
        this.rng.setSeed(99999)
        break
      default:
        this.rng.setSeed(Date.now())
    }

    return this.runRTPTest(iterations, 1)
  }

  /**
   * Compare RTP across different bet amounts
   */
  async testBetAmounts(
    amounts: number[],
    iterations: number = 100000
  ): Promise<Map<number, RTPTestResult>> {
    const results = new Map<number, RTPTestResult>()

    for (const amount of amounts) {
      console.log(`Testing bet amount: $${amount}`)
      const result = await this.runRTPTest(iterations, amount)
      results.set(amount, result)
    }

    return results
  }
}
