import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { RTPCalculator, RTPTestResult } from '../_shared/rtp-calculator.ts'

interface RTPTestRequest {
  iterations?: number
  bet_amount?: number
  test_type?: 'quick' | 'full' | 'scenario'
  scenario?: string
  seed?: number
}

interface RTPTestResponse {
  results: RTPTestResult
  summary: {
    rtp_percentage: number
    expected_rtp: number
    variance: string
    recommendation: string
  }
}

serve(async req => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      iterations = 100000,
      bet_amount = 1,
      test_type = 'full',
      scenario,
      seed,
    }: RTPTestRequest = await req.json()

    console.log(`Starting RTP test: ${test_type}, ${iterations.toLocaleString()} iterations`)

    const calculator = new RTPCalculator(seed)
    let results: RTPTestResult

    // Execute appropriate test type
    switch (test_type) {
      case 'quick':
        results = await calculator.quickRTPTest(Math.min(iterations, 50000))
        break

      case 'scenario':
        if (!scenario) {
          throw new Error('Scenario type required for scenario testing')
        }
        results = await calculator.testScenario(scenario, iterations)
        break

      case 'full':
      default:
        // Use a progress callback for long tests
        const progressCallback = (progress: number) => {
          if (progress % 10 === 0) {
            console.log(`RTP Test Progress: ${progress.toFixed(1)}%`)
          }
        }
        results = await calculator.runRTPTest(iterations, bet_amount, progressCallback)
        break
    }

    // Generate analysis and recommendations
    const summary = generateRTPSummary(results)

    console.log(`RTP Test Complete: ${results.rtp.toFixed(2)}% RTP`)
    console.log(`Win Frequency: ${results.winFrequency.toFixed(2)}%`)
    console.log(`Execution Time: ${results.executionTimeMs}ms`)

    const response: RTPTestResponse = {
      results,
      summary,
    }

    return new Response(JSON.stringify(response, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('RTP Test error:', error)

    return new Response(
      JSON.stringify({
        error: 'RTP test failed',
        message: error.message,
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    )
  }
})

/**
 * Generate RTP analysis and recommendations
 */
function generateRTPSummary(results: RTPTestResult) {
  const targetRTP = 96.0 // Target RTP percentage
  const rtpDifference = results.rtp - targetRTP

  let variance: string
  let recommendation: string

  // Determine variance level
  if (results.winFrequency > 40) {
    variance = 'Low'
  } else if (results.winFrequency > 25) {
    variance = 'Medium'
  } else {
    variance = 'High'
  }

  // Generate recommendations
  if (Math.abs(rtpDifference) <= 1) {
    recommendation = 'RTP is within acceptable range. Game balance is good.'
  } else if (rtpDifference > 1) {
    recommendation = `RTP is ${rtpDifference.toFixed(2)}% higher than target. Consider reducing symbol payouts or cluster frequency.`
  } else {
    recommendation = `RTP is ${Math.abs(rtpDifference).toFixed(2)}% lower than target. Consider increasing symbol payouts or cluster frequency.`
  }

  // Add performance notes
  const spinsPerSecond = results.totalSpins / (results.executionTimeMs / 1000)
  const performanceNote =
    spinsPerSecond > 1000
      ? 'Excellent performance for high-frequency testing.'
      : spinsPerSecond > 500
        ? 'Good performance for regular testing.'
        : 'Consider optimization for faster testing.'

  return {
    rtp_percentage: results.rtp,
    expected_rtp: targetRTP,
    variance,
    recommendation: `${recommendation} ${performanceNote}`,
    performance: {
      spins_per_second: Math.round(spinsPerSecond),
      total_execution_time: `${results.executionTimeMs}ms`,
    },
    key_metrics: {
      max_win_multiplier:
        (results.maxWin / (results.totalWagered / results.totalSpins)).toFixed(2) + 'x',
      average_win_when_won: results.averageWin.toFixed(2),
      special_symbol_frequency:
        (Object.values(results.specialSymbolStats).reduce((sum, stat) => sum + stat.count, 0) /
          results.totalSpins) *
        100,
    },
  }
}
