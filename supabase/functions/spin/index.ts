import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { GameEngine } from '../_shared/game-engine.ts'
import { GameRNG } from '../_shared/rng.ts'

interface SpinRequest {
  bet_amount: number
  user_id?: string
  boost_type?: 'bonus' | 'super'
  seed?: number // For testing
}

interface SpinResponse {
  session_id: string
  grid: any[][]
  clusters: any[]
  win_amount: number
  total_win: number
  special_effects: any[]
  execution_time_ms: number
  rng_seed: number
}

serve(async req => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { bet_amount, user_id, boost_type, seed }: SpinRequest = await req.json()

    // Validation
    if (!bet_amount || bet_amount <= 0 || bet_amount > 1000) {
      return new Response(JSON.stringify({ error: 'Invalid bet amount' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const startTime = Date.now()

    // Initialize game components
    const rng = new GameRNG(seed)
    const engine = new GameEngine(rng)

    console.log(`Processing spin: $${bet_amount} bet, seed: ${rng.getSeed()}`)

    // Process the spin
    const result = await engine.processSpin(bet_amount)

    const endTime = Date.now()
    const executionTime = endTime - startTime

    // Generate session ID
    const sessionId = crypto.randomUUID()

    console.log(`Spin complete: $${result.totalWin} won in ${executionTime}ms`)

    const response: SpinResponse = {
      session_id: sessionId,
      grid: result.grid,
      clusters: result.clusters,
      win_amount: result.totalWin,
      total_win: result.totalWin,
      special_effects: result.specialEffects,
      execution_time_ms: executionTime,
      rng_seed: rng.getSeed(),
    }

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Spin error:', error)

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    )
  }
})
