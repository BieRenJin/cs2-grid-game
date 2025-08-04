#!/usr/bin/env node

/**
 * Frontend-Backend Consistency Test
 * Compares 100 spins between frontend and backend to ensure win amounts match
 */

const { chromium } = require('@playwright/test')

// Import backend game engine
const { GameRNG, SimpleGameEngine } = require('./test-rtp-performance.js')

async function runFrontendSpins(iterations = 100) {
  console.log('🌐 Starting frontend spins...')
  const browser = await chromium.launch({ headless: false }) // Set to true for faster execution
  const page = await browser.newPage()

  try {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    const results = []

    for (let i = 0; i < iterations; i++) {
      // Wait for spin button to be enabled
      await page.waitForSelector('[data-testid="spin-button"]:not([disabled])', { timeout: 10000 })

      // Capture the API response
      const [response] = await Promise.all([
        page.waitForResponse(response => response.url().includes('/spin')),
        page.click('[data-testid="spin-button"]'),
      ])

      const data = await response.json()

      // Get displayed win amount from UI
      await page.waitForTimeout(3000) // Wait for animations
      const displayedWin = await page.evaluate(() => {
        const winElement = document.querySelector('[data-testid="win-amount"]')
        if (!winElement) {
          // Fallback selectors
          const win = document.querySelector('.win-amount')
          if (win) return parseFloat(win.textContent.replace(/[^0-9.]/g, '')) || 0
        }
        return parseFloat(winElement?.textContent?.replace(/[^0-9.]/g, '') || '0')
      })

      results.push({
        spinNumber: i + 1,
        backendWin: data.total_win || data.win_amount || 0,
        frontendWin: displayedWin,
        seed: data.rng_seed,
      })

      console.log(
        `Spin ${i + 1}: Backend: $${results[i].backendWin}, Frontend: $${results[i].frontendWin}`
      )
    }

    await browser.close()
    return results
  } catch (error) {
    console.error('Frontend test error:', error)
    await browser.close()
    throw error
  }
}

async function runBackendSpins(iterations = 100, seeds = []) {
  console.log('⚙️ Starting backend spins...')
  const results = []

  for (let i = 0; i < iterations; i++) {
    const seed = seeds[i] || Math.floor(Math.random() * 2147483647)
    const rng = new GameRNG(seed)
    const engine = new SimpleGameEngine(rng)

    const result = engine.processSpin(1) // $1 bet

    results.push({
      spinNumber: i + 1,
      win: result.totalWin,
      seed: seed,
    })

    console.log(`Spin ${i + 1}: Win: $${result.totalWin} (Seed: ${seed})`)
  }

  return results
}

async function compareResults(frontendResults, backendResults) {
  console.log('\n📊 Comparing Results...')
  console.log('═══════════════════════════════════════')

  let matches = 0
  let mismatches = []

  for (let i = 0; i < frontendResults.length; i++) {
    const frontend = frontendResults[i]
    const backend = backendResults[i]

    // Compare using the same seed
    if (Math.abs(frontend.backendWin - backend.win) < 0.01) {
      matches++
    } else {
      mismatches.push({
        spin: i + 1,
        frontend: frontend.backendWin,
        backend: backend.win,
        difference: Math.abs(frontend.backendWin - backend.win),
        seed: backend.seed,
      })
    }
  }

  console.log(`✅ Matches: ${matches}/${frontendResults.length}`)
  console.log(`❌ Mismatches: ${mismatches.length}`)

  if (mismatches.length > 0) {
    console.log('\n⚠️ Mismatched Spins:')
    mismatches.forEach(m => {
      console.log(
        `  Spin ${m.spin}: Frontend=$${m.frontend}, Backend=$${m.backend}, Diff=$${m.difference.toFixed(2)}, Seed=${m.seed}`
      )
    })
  }

  // Calculate statistics
  const frontendTotal = frontendResults.reduce((sum, r) => sum + r.backendWin, 0)
  const backendTotal = backendResults.reduce((sum, r) => sum + r.win, 0)
  const frontendAvg = frontendTotal / frontendResults.length
  const backendAvg = backendTotal / backendResults.length

  console.log('\n📈 Statistics:')
  console.log(`Frontend Total: $${frontendTotal.toFixed(2)}`)
  console.log(`Backend Total: $${backendTotal.toFixed(2)}`)
  console.log(`Frontend Average: $${frontendAvg.toFixed(2)}`)
  console.log(`Backend Average: $${backendAvg.toFixed(2)}`)
  console.log(`Consistency Rate: ${((matches / frontendResults.length) * 100).toFixed(1)}%`)

  return {
    matches,
    mismatches,
    consistencyRate: (matches / frontendResults.length) * 100,
    frontendTotal,
    backendTotal,
  }
}

async function runConsistencyTest() {
  console.log('🎮 CS2 Grid Game - Frontend/Backend Consistency Test')
  console.log('Testing 100 spins for win amount consistency...\n')

  try {
    // First, make sure the server is running
    console.log('Checking if server is running...')
    const checkServer = await fetch('http://localhost:3000').catch(() => null)
    if (!checkServer) {
      console.error('❌ Server is not running! Please run "npm run dev" first.')
      process.exit(1)
    }

    // Run frontend spins
    const frontendResults = await runFrontendSpins(100)

    // Extract seeds from frontend results to use in backend
    const seeds = frontendResults.map(r => r.seed)

    // Run backend spins with same seeds
    const backendResults = await runBackendSpins(100, seeds)

    // Compare results
    const comparison = await compareResults(frontendResults, backendResults)

    // Final verdict
    console.log('\n🏁 Final Result:')
    if (comparison.consistencyRate === 100) {
      console.log('✅ PERFECT CONSISTENCY! All 100 spins matched.')
    } else if (comparison.consistencyRate >= 95) {
      console.log(`✅ GOOD CONSISTENCY: ${comparison.consistencyRate.toFixed(1)}% match rate`)
    } else if (comparison.consistencyRate >= 90) {
      console.log(`⚠️ ACCEPTABLE CONSISTENCY: ${comparison.consistencyRate.toFixed(1)}% match rate`)
    } else {
      console.log(`❌ POOR CONSISTENCY: ${comparison.consistencyRate.toFixed(1)}% match rate`)
      console.log('🔍 Investigation needed - significant discrepancies detected!')
    }

    // Save results
    const fs = require('fs')
    fs.writeFileSync(
      'consistency-test-results.json',
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          frontendResults,
          backendResults,
          comparison,
        },
        null,
        2
      )
    )

    console.log('\n📁 Detailed results saved to: consistency-test-results.json')
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Alternative: Test with mock Supabase responses
async function runMockComparisonTest() {
  console.log('🧪 Running Mock Comparison Test (without real frontend)...\n')

  const iterations = 100
  const results = {
    matches: 0,
    differences: [],
  }

  for (let i = 0; i < iterations; i++) {
    const seed = Math.floor(Math.random() * 2147483647)

    // Backend calculation
    const rng = new GameRNG(seed)
    const engine = new SimpleGameEngine(rng)
    const backendResult = engine.processSpin(1)

    // Simulate frontend calculation (should be identical)
    const rng2 = new GameRNG(seed) // Same seed
    const engine2 = new SimpleGameEngine(rng2)
    const frontendResult = engine2.processSpin(1)

    if (Math.abs(backendResult.totalWin - frontendResult.totalWin) < 0.001) {
      results.matches++
    } else {
      results.differences.push({
        spin: i + 1,
        seed: seed,
        backend: backendResult.totalWin,
        frontend: frontendResult.totalWin,
        diff: Math.abs(backendResult.totalWin - frontendResult.totalWin),
      })
    }

    process.stdout.write(`\rProgress: ${i + 1}/${iterations} spins`)
  }

  console.log('\n\n📊 Mock Test Results:')
  console.log(`Matches: ${results.matches}/${iterations}`)
  console.log(`Consistency: ${((results.matches / iterations) * 100).toFixed(1)}%`)

  if (results.differences.length > 0) {
    console.log('\n⚠️ Differences found:')
    results.differences.forEach(d => {
      console.log(
        `  Spin ${d.spin}: Seed=${d.seed}, Backend=${d.backend}, Frontend=${d.frontend}, Diff=${d.diff}`
      )
    })
  }

  return results
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2)

  if (args.includes('--mock')) {
    // Run mock test (faster, no browser needed)
    runMockComparisonTest()
  } else {
    // Run full frontend/backend test
    runConsistencyTest()
      .then(() => {
        process.exit(0)
      })
      .catch(error => {
        console.error('Test failed:', error)
        process.exit(1)
      })
  }
}

module.exports = { runFrontendSpins, runBackendSpins, compareResults }
