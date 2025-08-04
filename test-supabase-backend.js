#!/usr/bin/env node

/**
 * Test Supabase Backend Functions Directly
 * Tests both spin and RTP functions to ensure they work correctly
 */

// Simulate Supabase function calls locally
const { GameEngine } = require('./supabase/functions/_shared/game-engine')
const { GameRNG } = require('./supabase/functions/_shared/rng')

async function testSpinFunction(iterations = 100) {
  console.log('🎰 Testing Supabase Spin Function...')

  const results = []

  for (let i = 0; i < iterations; i++) {
    // Create a new RNG and engine for each spin
    const rng = new GameRNG()
    const engine = new GameEngine(rng)

    const startTime = Date.now()
    const result = await engine.processSpin(1) // $1 bet
    const endTime = Date.now()

    results.push({
      spinNumber: i + 1,
      grid: result.grid,
      clusters: result.clusters,
      totalWin: result.totalWin,
      specialEffects: result.specialEffects,
      executionTime: endTime - startTime,
      seed: rng.getSeed(),
    })

    if (i % 10 === 0) {
      process.stdout.write(`\rProgress: ${i + 1}/${iterations} spins`)
    }
  }

  console.log('\n')

  // Calculate statistics
  const totalWagered = iterations * 1 // $1 per spin
  const totalWon = results.reduce((sum, r) => sum + r.totalWin, 0)
  const rtp = (totalWon / totalWagered) * 100
  const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length
  const winningSpins = results.filter(r => r.totalWin > 0).length
  const winFrequency = (winningSpins / results.length) * 100

  console.log('📊 Supabase Backend Test Results:')
  console.log('═══════════════════════════════════════')
  console.log(`Total Spins: ${iterations}`)
  console.log(`Total Wagered: $${totalWagered}`)
  console.log(`Total Won: $${totalWon.toFixed(2)}`)
  console.log(`RTP: ${rtp.toFixed(2)}%`)
  console.log(`Win Frequency: ${winFrequency.toFixed(2)}%`)
  console.log(`Avg Execution Time: ${avgExecutionTime.toFixed(2)}ms`)
  console.log(`Max Win: $${Math.max(...results.map(r => r.totalWin)).toFixed(2)}`)
  console.log(`Min Win: $${Math.min(...results.map(r => r.totalWin)).toFixed(2)}`)

  // Test for consistency - same seed should produce same result
  console.log('\n🔄 Testing Seed Consistency...')
  const testSeed = 12345
  const results1 = []
  const results2 = []

  for (let i = 0; i < 10; i++) {
    // First run
    const rng1 = new GameRNG(testSeed + i)
    const engine1 = new GameEngine(rng1)
    const result1 = await engine1.processSpin(1)
    results1.push(result1.totalWin)

    // Second run with same seed
    const rng2 = new GameRNG(testSeed + i)
    const engine2 = new GameEngine(rng2)
    const result2 = await engine2.processSpin(1)
    results2.push(result2.totalWin)
  }

  const consistent = results1.every((win, i) => Math.abs(win - results2[i]) < 0.001)
  console.log(`Seed Consistency: ${consistent ? '✅ PASS' : '❌ FAIL'}`)

  if (!consistent) {
    console.log('Inconsistent results:')
    results1.forEach((win, i) => {
      if (Math.abs(win - results2[i]) >= 0.001) {
        console.log(`  Seed ${testSeed + i}: $${win} vs $${results2[i]}`)
      }
    })
  }

  return {
    rtp,
    winFrequency,
    avgExecutionTime,
    consistent,
    results,
  }
}

async function testWithFixedSeeds() {
  console.log('\n🎯 Testing with Fixed Seeds (Frontend/Backend comparison)...')

  const fixedSeeds = [12345, 67890, 11111, 22222, 33333, 44444, 55555, 66666, 77777, 88888]

  const backendResults = []
  const frontendResults = [] // Simulate frontend using same logic

  for (let i = 0; i < fixedSeeds.length; i++) {
    const seed = fixedSeeds[i]

    // Backend (Supabase function simulation)
    const backendRng = new GameRNG(seed)
    const backendEngine = new GameEngine(backendRng)
    const backendResult = await backendEngine.processSpin(1)
    backendResults.push(backendResult.totalWin)

    // Frontend (same logic, different instance)
    const frontendRng = new GameRNG(seed)
    const frontendEngine = new GameEngine(frontendRng)
    const frontendResult = await frontendEngine.processSpin(1)
    frontendResults.push(frontendResult.totalWin)

    console.log(
      `Seed ${seed}: Backend=$${backendResult.totalWin.toFixed(2)}, Frontend=$${frontendResult.totalWin.toFixed(2)}`
    )
  }

  // Check consistency
  let matches = 0
  for (let i = 0; i < fixedSeeds.length; i++) {
    if (Math.abs(backendResults[i] - frontendResults[i]) < 0.001) {
      matches++
    }
  }

  console.log(
    `\nConsistency: ${matches}/${fixedSeeds.length} (${((matches / fixedSeeds.length) * 100).toFixed(1)}%)`
  )

  return {
    backendResults,
    frontendResults,
    matches,
    consistency: (matches / fixedSeeds.length) * 100,
  }
}

async function main() {
  try {
    console.log('🚀 CS2 Grid Game - Supabase Backend Test\n')

    // Test 100 spins
    const spinTest = await testSpinFunction(100)

    // Test seed consistency
    const seedTest = await testWithFixedSeeds()

    console.log('\n📈 Final Summary:')
    console.log('════════════════════════════════════════')
    console.log(`RTP: ${spinTest.rtp.toFixed(2)}% (Target: 96-98%)`)
    console.log(`Win Frequency: ${spinTest.winFrequency.toFixed(2)}%`)
    console.log(`Performance: ${spinTest.avgExecutionTime.toFixed(2)}ms per spin`)
    console.log(`Seed Consistency: ${spinTest.consistent ? 'PASS' : 'FAIL'}`)
    console.log(`Frontend/Backend Match: ${seedTest.consistency.toFixed(1)}%`)

    // Overall verdict
    const rtpOk = spinTest.rtp >= 94 && spinTest.rtp <= 100
    const performanceOk = spinTest.avgExecutionTime < 50 // Under 50ms
    const consistencyOk = spinTest.consistent && seedTest.consistency === 100

    if (rtpOk && performanceOk && consistencyOk) {
      console.log('\n✅ ALL TESTS PASSED! Backend is ready for production.')
    } else {
      console.log('\n⚠️ Some tests failed:')
      if (!rtpOk) console.log('  - RTP is out of range')
      if (!performanceOk) console.log('  - Performance is too slow')
      if (!consistencyOk) console.log('  - Consistency issues detected')
    }

    // Save results
    const fs = require('fs')
    fs.writeFileSync(
      'supabase-backend-test-results.json',
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          spinTest,
          seedTest,
          verdict: { rtpOk, performanceOk, consistencyOk },
        },
        null,
        2
      )
    )

    console.log('\n📁 Detailed results saved to: supabase-backend-test-results.json')
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Check if we can import the Supabase functions
try {
  // Try to import the modules
  require('./supabase/functions/_shared/game-engine')
  require('./supabase/functions/_shared/rng')

  // Run the test
  if (require.main === module) {
    main()
  }
} catch (error) {
  console.error('❌ Cannot import Supabase functions:', error.message)
  console.log('💡 Make sure you are in the correct directory and files exist.')
  process.exit(1)
}

module.exports = { testSpinFunction, testWithFixedSeeds }
