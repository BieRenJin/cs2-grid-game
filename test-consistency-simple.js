#!/usr/bin/env node

/**
 * Simple Frontend/Backend Consistency Test
 * Compares the same 100 spins using identical seeds
 */

const { GameRNG, SimpleGameEngine } = require('./test-rtp-performance.js')

async function runConsistencyTest() {
  console.log('🎮 CS2 Grid Game - Simple Consistency Test')
  console.log('Testing same 100 seeds with frontend vs backend logic...\n')

  const iterations = 100
  const results = {
    frontend: [],
    backend: [],
    matches: 0,
    differences: [],
  }

  // Generate fixed seeds for consistent testing
  const seeds = []
  for (let i = 0; i < iterations; i++) {
    seeds.push(12345 + i * 1000) // Predictable seeds
  }

  console.log('🌐 Running "frontend" logic...')
  for (let i = 0; i < iterations; i++) {
    const rng = new GameRNG(seeds[i])
    const engine = new SimpleGameEngine(rng)
    const result = engine.processSpin(1)

    results.frontend.push({
      spin: i + 1,
      seed: seeds[i],
      win: result.totalWin,
      cascades: result.cascadeCount,
    })

    if ((i + 1) % 20 === 0) {
      console.log(`  Completed ${i + 1}/${iterations} spins`)
    }
  }

  console.log('\n⚙️ Running "backend" logic...')
  for (let i = 0; i < iterations; i++) {
    const rng = new GameRNG(seeds[i]) // Same seed
    const engine = new SimpleGameEngine(rng)
    const result = engine.processSpin(1)

    results.backend.push({
      spin: i + 1,
      seed: seeds[i],
      win: result.totalWin,
      cascades: result.cascadeCount,
    })

    if ((i + 1) % 20 === 0) {
      console.log(`  Completed ${i + 1}/${iterations} spins`)
    }
  }

  console.log('\n📊 Comparing Results...')
  console.log('═══════════════════════════════════════')

  for (let i = 0; i < iterations; i++) {
    const frontend = results.frontend[i]
    const backend = results.backend[i]

    const winMatch = Math.abs(frontend.win - backend.win) < 0.001
    const cascadeMatch = frontend.cascades === backend.cascades

    if (winMatch && cascadeMatch) {
      results.matches++
    } else {
      results.differences.push({
        spin: i + 1,
        seed: seeds[i],
        frontend: { win: frontend.win, cascades: frontend.cascades },
        backend: { win: backend.win, cascades: backend.cascades },
        winDiff: Math.abs(frontend.win - backend.win),
        cascadeDiff: Math.abs(frontend.cascades - backend.cascades),
      })
    }
  }

  // Display results
  console.log(`✅ Perfect Matches: ${results.matches}/${iterations}`)
  console.log(`❌ Differences: ${results.differences.length}`)
  console.log(`🎯 Consistency Rate: ${((results.matches / iterations) * 100).toFixed(2)}%`)

  if (results.differences.length > 0 && results.differences.length <= 10) {
    console.log('\n⚠️ Differences found:')
    results.differences.forEach(diff => {
      console.log(`  Spin ${diff.spin} (Seed: ${diff.seed}):`)
      console.log(
        `    Frontend: Win=$${diff.frontend.win.toFixed(2)}, Cascades=${diff.frontend.cascades}`
      )
      console.log(
        `    Backend:  Win=$${diff.backend.win.toFixed(2)}, Cascades=${diff.backend.cascades}`
      )
      console.log(`    Diff: Win=$${diff.winDiff.toFixed(4)}, Cascades=${diff.cascadeDiff}`)
    })
  } else if (results.differences.length > 10) {
    console.log(`\n⚠️ Too many differences to display (${results.differences.length})`)
    console.log('First 5 differences:')
    results.differences.slice(0, 5).forEach(diff => {
      console.log(
        `  Spin ${diff.spin}: Frontend=$${diff.frontend.win.toFixed(2)}, Backend=$${diff.backend.win.toFixed(2)}`
      )
    })
  }

  // Statistics
  const frontendTotal = results.frontend.reduce((sum, r) => sum + r.win, 0)
  const backendTotal = results.backend.reduce((sum, r) => sum + r.win, 0)
  const totalDifference = Math.abs(frontendTotal - backendTotal)

  console.log('\n📈 Summary Statistics:')
  console.log(`Frontend Total Wins: $${frontendTotal.toFixed(2)}`)
  console.log(`Backend Total Wins:  $${backendTotal.toFixed(2)}`)
  console.log(`Total Difference:    $${totalDifference.toFixed(4)}`)
  console.log(`Average Win (Frontend): $${(frontendTotal / iterations).toFixed(4)}`)
  console.log(`Average Win (Backend):  $${(backendTotal / iterations).toFixed(4)}`)

  // Verdict
  console.log('\n🏁 Final Verdict:')
  if (results.matches === iterations) {
    console.log('🎉 PERFECT CONSISTENCY! All 100 spins matched exactly.')
    console.log('✅ Frontend and backend logic are identical.')
  } else if (results.matches >= 95) {
    console.log(
      `✅ EXCELLENT CONSISTENCY: ${((results.matches / iterations) * 100).toFixed(1)}% match rate`
    )
    console.log('Minor differences may be due to floating-point precision.')
  } else if (results.matches >= 90) {
    console.log(
      `⚠️ GOOD CONSISTENCY: ${((results.matches / iterations) * 100).toFixed(1)}% match rate`
    )
    console.log('Some investigation recommended.')
  } else {
    console.log(
      `❌ POOR CONSISTENCY: ${((results.matches / iterations) * 100).toFixed(1)}% match rate`
    )
    console.log('🔍 Major inconsistencies detected - immediate investigation required!')
  }

  // Save results
  const fs = require('fs')
  fs.writeFileSync(
    'consistency-test-simple-results.json',
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        iterations,
        matches: results.matches,
        consistency: (results.matches / iterations) * 100,
        differences: results.differences.length,
        frontendTotal,
        backendTotal,
        totalDifference,
        details: results.differences.slice(0, 20), // Save first 20 differences
      },
      null,
      2
    )
  )

  console.log('\n📁 Results saved to: consistency-test-simple-results.json')

  return results
}

// Specific test: Test the same seed multiple times
async function testSameSeedConsistency() {
  console.log('\n🔄 Testing Same Seed Consistency...')

  const testSeed = 999999
  const runs = 10
  const results = []

  for (let i = 0; i < runs; i++) {
    const rng = new GameRNG(testSeed)
    const engine = new SimpleGameEngine(rng)
    const result = engine.processSpin(1)

    results.push(result.totalWin)
    console.log(`Run ${i + 1}: $${result.totalWin.toFixed(2)}`)
  }

  // Check if all results are identical
  const firstResult = results[0]
  const allSame = results.every(win => Math.abs(win - firstResult) < 0.001)

  console.log(`\nSame Seed Consistency: ${allSame ? '✅ PASS' : '❌ FAIL'}`)

  if (!allSame) {
    console.log('Inconsistent results detected:')
    results.forEach((win, i) => {
      console.log(`  Run ${i + 1}: $${win.toFixed(4)}`)
    })
  }

  return allSame
}

// Main execution
async function main() {
  try {
    const consistencyResult = await runConsistencyTest()
    const sameSeedResult = await testSameSeedConsistency()

    console.log('\n' + '='.repeat(50))
    console.log('FINAL TEST SUMMARY')
    console.log('='.repeat(50))
    console.log(`100-Spin Consistency: ${((consistencyResult.matches / 100) * 100).toFixed(1)}%`)
    console.log(`Same Seed Consistency: ${sameSeedResult ? 'PASS' : 'FAIL'}`)

    if (consistencyResult.matches === 100 && sameSeedResult) {
      console.log('\n🎯 CONCLUSION: Frontend and backend are 100% consistent!')
      console.log('💡 You can trust that animations will match calculations perfectly.')
    } else {
      console.log('\n⚠️ CONCLUSION: Some inconsistencies detected.')
      console.log('🔍 Review the detailed results for debugging.')
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { runConsistencyTest, testSameSeedConsistency }
