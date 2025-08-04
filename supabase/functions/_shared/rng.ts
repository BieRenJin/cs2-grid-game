import { Symbol, SYMBOLS, SPECIAL_SYMBOLS, SYMBOL_WEIGHTS } from './symbols.ts'

/**
 * High-performance RNG for game logic
 * Uses seed for reproducible results in testing
 */
export class GameRNG {
  private seed: number
  private state: number

  constructor(seed?: number) {
    this.seed = seed || Date.now()
    this.state = this.seed
  }

  /**
   * Linear Congruential Generator (LCG) for fast, reproducible random numbers
   */
  private next(): number {
    this.state = (this.state * 1664525 + 1013904223) % 0x100000000
    return this.state / 0x100000000
  }

  /**
   * Generate random float between 0 and 1
   */
  random(): number {
    return this.next()
  }

  /**
   * Generate random integer between min and max (inclusive)
   */
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min
  }

  /**
   * Select weighted random symbol
   */
  getRandomSymbol(): Symbol {
    const weights = SYMBOL_WEIGHTS
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0)

    let random = this.random() * totalWeight

    for (const [symbolId, weight] of Object.entries(weights)) {
      random -= weight
      if (random <= 0) {
        return symbolId in SYMBOLS ? SYMBOLS[symbolId] : SPECIAL_SYMBOLS[symbolId]
      }
    }

    // Fallback
    return SYMBOLS.FLASHBANG
  }

  /**
   * Generate full 7x7 grid
   */
  generateGrid(): Symbol[][] {
    const grid: Symbol[][] = []

    for (let row = 0; row < 7; row++) {
      grid[row] = []
      for (let col = 0; col < 7; col++) {
        grid[row][col] = this.getRandomSymbol()
      }
    }

    return grid
  }

  /**
   * Generate symbols for cascade (after elimination)
   */
  generateCascadeSymbols(count: number): Symbol[] {
    const symbols: Symbol[] = []
    for (let i = 0; i < count; i++) {
      symbols.push(this.getRandomSymbol())
    }
    return symbols
  }

  /**
   * Get current seed (for debugging/testing)
   */
  getSeed(): number {
    return this.seed
  }

  /**
   * Reset with new seed
   */
  setSeed(seed: number): void {
    this.seed = seed
    this.state = seed
  }
}
