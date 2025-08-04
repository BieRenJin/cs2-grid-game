#!/usr/bin/env node

/**
 * Standalone RTP Performance Test for CS2 Grid Game
 * Tests the backend game logic performance without requiring Supabase
 */

const fs = require('fs')
const path = require('path')

// Import the game logic (we'll need to create simplified JS versions)
class GameRNG {
  constructor(seed) {
    this.seed = seed || Math.floor(Math.random() * 2147483647)
    this.current = this.seed
  }

  // Linear Congruential Generator for fast RNG
  next() {
    this.current = (this.current * 1664525 + 1013904223) % 4294967296
    return this.current / 4294967296
  }

  getRandomInt(min, max) {
    return Math.floor(this.next() * (max - min)) + min
  }

  // Simplified symbol generation
  getRandomSymbol() {
    const symbols = [
      { id: 'flashbang', name: 'Flashbang', rarity: 0.2, tier: 1 },
      { id: 'smoke', name: 'Smoke', rarity: 0.2, tier: 1 },
      { id: 'hegrenade', name: 'HE Grenade', rarity: 0.15, tier: 2 },
      { id: 'kevlar', name: 'Kevlar', rarity: 0.15, tier: 2 },
      { id: 'defuse', name: 'Defuse Kit', rarity: 0.12, tier: 3 },
      { id: 'deagle', name: 'Desert Eagle', rarity: 0.1, tier: 3 },
      { id: 'ak47', name: 'AK-47', rarity: 0.06, tier: 4 },
      { id: 'awp', name: 'AWP', rarity: 0.04, tier: 4 },
      { id: 'rush', name: 'Rush', rarity: 0.008, tier: 5 }, // Special
      { id: 'surge', name: 'Surge', rarity: 0.006, tier: 5 }, // Special
      { id: 'slash', name: 'Slash', rarity: 0.006, tier: 5 }, // Special
    ]

    const rand = this.next()
    let cumulative = 0

    for (const symbol of symbols) {
      cumulative += symbol.rarity
      if (rand <= cumulative) {
        return symbol
      }
    }

    return symbols[0] // Fallback
  }

  generateGrid() {
    const grid = []
    for (let row = 0; row < 7; row++) {
      grid[row] = []
      for (let col = 0; col < 7; col++) {
        grid[row][col] = this.getRandomSymbol()
      }
    }
    return grid
  }
}

class SimpleGameEngine {
  constructor(rng) {
    this.rng = rng
  }

  // Simplified cluster detection using DFS
  findClusters(grid) {
    const visited = Array(7)
      .fill()
      .map(() => Array(7).fill(false))
    const clusters = []

    const dfs = (row, col, symbol, cluster) => {
      if (
        row < 0 ||
        row >= 7 ||
        col < 0 ||
        col >= 7 ||
        visited[row][col] ||
        !grid[row][col] ||
        grid[row][col].id !== symbol.id
      ) {
        return
      }

      visited[row][col] = true
      cluster.push({ row, col })

      // Check 4 directions
      dfs(row + 1, col, symbol, cluster)
      dfs(row - 1, col, symbol, cluster)
      dfs(row, col + 1, symbol, cluster)
      dfs(row, col - 1, symbol, cluster)
    }

    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 7; col++) {
        if (!visited[row][col] && grid[row][col]) {
          const cluster = []
          dfs(row, col, grid[row][col], cluster)

          if (cluster.length >= 5) {
            // Minimum cluster size is 5 now
            clusters.push({
              symbol: grid[row][col],
              positions: cluster,
              size: cluster.length,
              payout: this.calculatePayout(grid[row][col], cluster.length),
            })
          }
        }
      }
    }

    return clusters
  }

  calculatePayout(symbol, clusterSize) {
    // Updated paytables matching backend
    const paytables = {
      flashbang: {
        5: 0.8,
        6: 1.3,
        7: 2.0,
        8: 3.0,
        9: 4.5,
        10: 6.8,
        11: 10.5,
        12: 16.0,
        13: 25.0,
        14: 40.0,
        15: 65.0,
      },
      smoke: {
        5: 0.8,
        6: 1.3,
        7: 2.0,
        8: 3.0,
        9: 4.5,
        10: 6.8,
        11: 10.5,
        12: 16.0,
        13: 25.0,
        14: 40.0,
        15: 65.0,
      },
      hegrenade: {
        5: 1.3,
        6: 2.0,
        7: 3.0,
        8: 4.5,
        9: 6.8,
        10: 10.5,
        11: 16.0,
        12: 25.0,
        13: 40.0,
        14: 65.0,
        15: 105.0,
      },
      kevlar: {
        5: 1.5,
        6: 2.5,
        7: 3.8,
        8: 5.8,
        9: 8.8,
        10: 13.5,
        11: 21.0,
        12: 32.0,
        13: 50.0,
        14: 80.0,
        15: 130.0,
      },
      defuse: {
        5: 2.5,
        6: 4.0,
        7: 6.0,
        8: 9.0,
        9: 13.5,
        10: 21.0,
        11: 32.0,
        12: 50.0,
        13: 80.0,
        14: 130.0,
        15: 210.0,
      },
      deagle: {
        5: 3.2,
        6: 5.0,
        7: 7.5,
        8: 11.5,
        9: 17.5,
        10: 27.0,
        11: 42.0,
        12: 65.0,
        13: 100.0,
        14: 160.0,
        15: 260.0,
      },
      ak47: {
        5: 5.0,
        6: 8.0,
        7: 12.5,
        8: 19.0,
        9: 29.0,
        10: 45.0,
        11: 70.0,
        12: 110.0,
        13: 175.0,
        14: 280.0,
        15: 450.0,
      },
      awp: {
        5: 8.0,
        6: 13.0,
        7: 20.0,
        8: 31.0,
        9: 48.0,
        10: 75.0,
        11: 115.0,
        12: 180.0,
        13: 285.0,
        14: 460.0,
        15: 750.0,
      },
      rush: {
        5: 16.0,
        6: 25.0,
        7: 40.0,
        8: 60.0,
        9: 95.0,
        10: 150.0,
        11: 230.0,
        12: 360.0,
        13: 570.0,
        14: 920.0,
        15: 1500.0,
      },
      surge: {
        5: 20.0,
        6: 32.0,
        7: 50.0,
        8: 77.0,
        9: 120.0,
        10: 185.0,
        11: 290.0,
        12: 460.0,
        13: 730.0,
        14: 1180.0,
        15: 1920.0,
      },
      slash: {
        5: 13.0,
        6: 20.0,
        7: 31.0,
        8: 48.0,
        9: 75.0,
        10: 115.0,
        11: 180.0,
        12: 285.0,
        13: 450.0,
        14: 730.0,
        15: 1180.0,
      },
    }

    const paytable = paytables[symbol.id]
    if (!paytable || clusterSize < 5) return 0

    // Use paytable value or calculate for larger clusters
    const payout = paytable[clusterSize] || paytable[15] * Math.pow(1.3, clusterSize - 15)
    return payout // Return direct multiplier
  }

  // Simplified spin processing
  processSpin(betAmount) {
    let grid = this.rng.generateGrid()
    let totalWin = 0
    let cascadeCount = 0
    const maxCascades = 10 // Prevent infinite loops

    // Process cascades
    while (cascadeCount < maxCascades) {
      const clusters = this.findClusters(grid)

      if (clusters.length === 0) {
        break
      }

      // Calculate wins
      const cascadeWin = clusters.reduce((sum, cluster) => sum + cluster.payout, 0) * betAmount
      totalWin += cascadeWin

      // Apply cascade (simplified - just regenerate affected positions)
      const affectedPositions = clusters.flatMap(c => c.positions)
      for (const pos of affectedPositions) {
        grid[pos.row][pos.col] = null
      }

      // Apply gravity (simplified)
      for (let col = 0; col < 7; col++) {
        const column = []
        for (let row = 6; row >= 0; row--) {
          if (grid[row][col]) {
            column.push(grid[row][col])
          }
        }

        // Fill from bottom
        for (let row = 6; row >= 0; row--) {
          if (column.length > 6 - row) {
            grid[row][col] = column[6 - row]
          } else {
            grid[row][col] = this.rng.getRandomSymbol()
          }
        }
      }

      cascadeCount++
    }

    return {
      grid,
      totalWin,
      cascadeCount,
    }
  }
}

// Performance test function
async function runRTPTest(iterations = 1000000, betAmount = 1) {
  console.log(`🧪 Starting RTP Performance Test`)
  console.log(`⚡ ${iterations.toLocaleString()} iterations @ $${betAmount} bet`)
  console.log(`📊 Testing game engine performance...\n`)

  const startTime = Date.now()
  const rng = new GameRNG()
  const engine = new SimpleGameEngine(rng)

  let totalWagered = 0
  let totalWon = 0
  let winningSpins = 0
  let maxWin = 0
  let minWin = Infinity

  // Progress tracking
  const progressInterval = Math.max(1, Math.floor(iterations / 20))
  let lastProgress = 0

  for (let i = 0; i < iterations; i++) {
    const result = engine.processSpin(betAmount)

    totalWagered += betAmount
    totalWon += result.totalWin

    if (result.totalWin > 0) {
      winningSpins++
      maxWin = Math.max(maxWin, result.totalWin)
      minWin = Math.min(minWin, result.totalWin)
    }

    // Progress reporting
    if (i > 0 && i % progressInterval === 0) {
      const progress = (i / iterations) * 100
      if (progress >= lastProgress + 5) {
        console.log(`Progress: ${progress.toFixed(1)}% - ${i.toLocaleString()} spins completed`)
        lastProgress = progress
      }
    }
  }

  const endTime = Date.now()
  const executionTime = endTime - startTime
  const rtp = (totalWon / totalWagered) * 100
  const winFrequency = (winningSpins / iterations) * 100
  const spinsPerSecond = iterations / (executionTime / 1000)

  // Results
  console.log(`\n🎯 RTP Test Results:`)
  console.log(`═══════════════════════════════════════`)
  console.log(`💰 RTP: ${rtp.toFixed(2)}%`)
  console.log(`🎲 Total Spins: ${iterations.toLocaleString()}`)
  console.log(`💵 Total Wagered: $${totalWagered.toLocaleString()}`)
  console.log(`💸 Total Won: $${totalWon.toLocaleString()}`)
  console.log(`🏆 Win Frequency: ${winFrequency.toFixed(2)}%`)
  console.log(`📈 Max Win: $${maxWin}`)
  console.log(`📉 Min Win: $${minWin === Infinity ? 0 : minWin}`)
  console.log(`⏱️  Execution Time: ${executionTime.toLocaleString()}ms`)
  console.log(`⚡ Performance: ${Math.round(spinsPerSecond).toLocaleString()} spins/second`)

  // Performance rating
  let performanceRating = 'Poor'
  if (spinsPerSecond > 2000) performanceRating = 'Excellent'
  else if (spinsPerSecond > 1000) performanceRating = 'Good'
  else if (spinsPerSecond > 500) performanceRating = 'Fair'

  console.log(`🎖️  Performance Rating: ${performanceRating}`)

  // Recommendations
  console.log(`\n💡 Analysis:`)
  if (rtp < 94) {
    console.log(`⚠️  RTP is low - consider increasing symbol payouts`)
  } else if (rtp > 98) {
    console.log(`⚠️  RTP is high - consider reducing symbol payouts`)
  } else {
    console.log(`✅ RTP is within acceptable range (94-98%)`)
  }

  if (spinsPerSecond < 1000) {
    console.log(`⚠️  Performance could be improved for high-volume testing`)
  } else {
    console.log(`✅ Performance is suitable for high-volume RTP testing`)
  }

  return {
    rtp,
    iterations,
    executionTime,
    spinsPerSecond,
    winFrequency,
    performanceRating,
    totalWagered,
    totalWon,
    maxWin,
    minWin,
  }
}

// Main execution
async function main() {
  try {
    // Test with different iteration counts
    console.log(`🚀 CS2 Grid Game - RTP Performance Test\n`)

    // Quick test first
    await runRTPTest(10000, 1)

    console.log(`\n${'='.repeat(50)}\n`)

    // Full 1M test
    const result = await runRTPTest(1000000, 1)

    // Save results to file
    const resultsFile = path.join(__dirname, 'rtp-test-results.json')
    fs.writeFileSync(resultsFile, JSON.stringify(result, null, 2))
    console.log(`\n📁 Results saved to: ${resultsFile}`)
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { runRTPTest, GameRNG, SimpleGameEngine }
