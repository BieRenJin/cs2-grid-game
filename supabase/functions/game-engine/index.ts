import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { GameEngine } from '../_shared/game-engine.ts'
import { GameRNG } from '../_shared/rng.ts'
import { RTPCalculator } from '../_shared/rtp-calculator.ts'

interface GameEngineRequest {
  action: 'test-spin' | 'test-special' | 'benchmark' | 'analyze-symbols'
  bet_amount?: number
  seed?: number
  iterations?: number
  special_type?: 'rush' | 'surge' | 'slash'
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      action,
      bet_amount = 1,
      seed,
      iterations = 1000,
      special_type,
    }: GameEngineRequest = await req.json()

    const rng = new GameRNG(seed)
    const engine = new GameEngine(rng)

    let response: any = {}

    switch (action) {
      case 'test-spin':
        response = await testSingleSpin(engine, bet_amount)
        break

      case 'test-special':
        response = await testSpecialSymbols(engine, special_type, iterations)
        break

      case 'benchmark':
        response = await benchmarkEngine(engine, iterations)
        break

      case 'analyze-symbols':
        response = await analyzeSymbolDistribution(rng, iterations)
        break

      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(JSON.stringify(response, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Game Engine error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})

async function testSingleSpin(engine: GameEngine, betAmount: number) {
  const startTime = Date.now()
  const result = await engine.processSpin(betAmount)
  const endTime = Date.now()

  return {
    action: 'test-spin',
    result: {
      grid: result.grid,
      clusters: result.clusters.map(c => ({
        symbol: c.symbol.name,
        size: c.size,
        payout: c.payout,
      })),
      total_win: result.totalWin,
      special_effects: result.specialEffects,
      execution_time_ms: endTime - startTime,
    },
  }
}

async function testSpecialSymbols(
  engine: GameEngine,
  specialType?: string,
  iterations: number = 1000
) {
  console.log(`Testing special symbols: ${iterations} iterations`)

  const stats = {
    rush: { count: 0, totalWin: 0, avgWin: 0 },
    surge: { count: 0, totalWin: 0, avgWin: 0 },
    slash: { count: 0, totalWin: 0, avgWin: 0 },
  }

  let totalSpins = 0

  for (let i = 0; i < iterations; i++) {
    const result = await engine.processSpin(1)
    totalSpins++

    for (const effect of result.specialEffects) {
      stats[effect.type].count++
      stats[effect.type].totalWin += result.totalWin
    }
  }

  // Calculate averages
  for (const type of ['rush', 'surge', 'slash'] as const) {
    if (stats[type].count > 0) {
      stats[type].avgWin = stats[type].totalWin / stats[type].count
    }
  }

  return {
    action: 'test-special',
    iterations: totalSpins,
    special_symbol_stats: stats,
    frequency: {
      rush: ((stats.rush.count / totalSpins) * 100).toFixed(2) + '%',
      surge: ((stats.surge.count / totalSpins) * 100).toFixed(2) + '%',
      slash: ((stats.slash.count / totalSpins) * 100).toFixed(2) + '%',
    },
  }
}

async function benchmarkEngine(engine: GameEngine, iterations: number) {
  console.log(`Benchmarking engine: ${iterations} spins`)

  const startTime = Date.now()
  let totalWin = 0

  for (let i = 0; i < iterations; i++) {
    const result = await engine.processSpin(1)
    totalWin += result.totalWin
  }

  const endTime = Date.now()
  const executionTime = endTime - startTime
  const spinsPerSecond = iterations / (executionTime / 1000)

  return {
    action: 'benchmark',
    iterations,
    execution_time_ms: executionTime,
    spins_per_second: Math.round(spinsPerSecond),
    total_win: totalWin,
    average_win: totalWin / iterations,
    performance_rating:
      spinsPerSecond > 1000
        ? 'Excellent'
        : spinsPerSecond > 500
          ? 'Good'
          : spinsPerSecond > 100
            ? 'Fair'
            : 'Poor',
  }
}

async function analyzeSymbolDistribution(rng: GameRNG, iterations: number) {
  console.log(`Analyzing symbol distribution: ${iterations} symbols`)

  const symbolCounts: Record<string, number> = {}

  for (let i = 0; i < iterations; i++) {
    const symbol = rng.getRandomSymbol()
    symbolCounts[symbol.id] = (symbolCounts[symbol.id] || 0) + 1
  }

  const distribution = Object.entries(symbolCounts)
    .map(([id, count]) => ({
      symbol_id: id,
      count,
      percentage: ((count / iterations) * 100).toFixed(2) + '%',
    }))
    .sort((a, b) => b.count - a.count)

  return {
    action: 'analyze-symbols',
    iterations,
    distribution,
    total_unique_symbols: distribution.length,
  }
}
