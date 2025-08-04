import { Symbol, SYMBOLS, SPECIAL_SYMBOLS } from './symbols.ts'
import { GameRNG } from './rng.ts'

export interface Position {
  row: number
  col: number
}

export interface Cluster {
  symbol: Symbol
  positions: Position[]
  size: number
  payout: number
}

export interface GameResult {
  grid: Symbol[][]
  clusters: Cluster[]
  totalWin: number
  specialEffects: SpecialEffect[]
  hasMoreCascades: boolean
}

export interface SpecialEffect {
  type: 'rush' | 'surge' | 'slash'
  position: Position
  affectedPositions: Position[]
  wildPositions?: Position[] // For Rush
  transformedSymbol?: Symbol // For Surge
}

/**
 * High-performance game engine for CS2 Grid Battle
 */
export class GameEngine {
  private readonly GRID_SIZE = 7
  private readonly MIN_CLUSTER_SIZE = 5

  constructor(private rng: GameRNG) {}

  /**
   * Process a complete game spin including cascades
   */
  async processSpin(betAmount: number): Promise<GameResult> {
    let grid = this.rng.generateGrid()
    let totalWin = 0
    let allSpecialEffects: SpecialEffect[] = []

    // Process initial spin
    let result = this.processGrid(grid, betAmount)
    totalWin += result.totalWin
    allSpecialEffects.push(...result.specialEffects)

    // Process cascades until no more wins
    while (result.hasMoreCascades) {
      grid = this.applyCascade(result.grid, result.clusters)
      result = this.processGrid(grid, betAmount)
      totalWin += result.totalWin
      allSpecialEffects.push(...result.specialEffects)
    }

    return {
      grid: result.grid,
      clusters: result.clusters,
      totalWin,
      specialEffects: allSpecialEffects,
      hasMoreCascades: false,
    }
  }

  /**
   * Process a single grid state
   */
  private processGrid(grid: Symbol[][], betAmount: number): GameResult {
    // 1. Apply special symbol effects first
    const specialEffects = this.processSpecialSymbols(grid)

    // 2. Find winning clusters
    const clusters = this.findClusters(grid)

    // 3. Calculate payouts
    const totalWin = this.calculateTotalPayout(clusters, betAmount)

    return {
      grid,
      clusters,
      totalWin,
      specialEffects,
      hasMoreCascades: clusters.length > 0,
    }
  }

  /**
   * High-performance cluster detection using DFS
   */
  private findClusters(grid: Symbol[][]): Cluster[] {
    const clusters: Cluster[] = []
    const visited = Array(this.GRID_SIZE)
      .fill(null)
      .map(() => Array(this.GRID_SIZE).fill(false))

    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        if (!visited[row][col] && grid[row][col] && !this.isSpecialSymbol(grid[row][col])) {
          const cluster = this.dfsCluster(grid, row, col, grid[row][col].id, visited)

          if (cluster.length >= this.MIN_CLUSTER_SIZE) {
            const symbol = grid[row][col]
            const payout = this.calculateClusterPayout(symbol, cluster.length)

            clusters.push({
              symbol,
              positions: cluster,
              size: cluster.length,
              payout,
            })
          }
        }
      }
    }

    return clusters
  }

  /**
   * DFS for cluster detection (optimized for performance)
   */
  private dfsCluster(
    grid: Symbol[][],
    row: number,
    col: number,
    symbolId: string,
    visited: boolean[][]
  ): Position[] {
    if (
      row < 0 ||
      row >= this.GRID_SIZE ||
      col < 0 ||
      col >= this.GRID_SIZE ||
      visited[row][col] ||
      !grid[row][col] ||
      (grid[row][col].id !== symbolId && !grid[row][col].isWild)
    ) {
      return []
    }

    visited[row][col] = true
    const positions: Position[] = [{ row, col }]

    // Check 4 directions
    const directions = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]
    for (const [dr, dc] of directions) {
      positions.push(...this.dfsCluster(grid, row + dr, col + dc, symbolId, visited))
    }

    return positions
  }

  /**
   * Calculate payout for a cluster
   */
  private calculateClusterPayout(symbol: Symbol, size: number): number {
    const clampedSize = Math.min(size, 15) // Max cluster size for paytable
    return symbol.paytable[clampedSize] || 0
  }

  /**
   * Calculate total payout for all clusters
   */
  private calculateTotalPayout(clusters: Cluster[], betAmount: number): number {
    const totalMultiplier = clusters.reduce((sum, cluster) => sum + cluster.payout, 0)
    return totalMultiplier * betAmount
  }

  /**
   * Process special symbol effects
   */
  private processSpecialSymbols(grid: Symbol[][]): SpecialEffect[] {
    const effects: SpecialEffect[] = []

    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        const symbol = grid[row][col]
        if (this.isSpecialSymbol(symbol)) {
          const effect = this.applySpecialEffect(grid, { row, col }, symbol)
          if (effect) {
            effects.push(effect)
          }
        }
      }
    }

    return effects
  }

  /**
   * Apply individual special symbol effect
   */
  private applySpecialEffect(
    grid: Symbol[][],
    position: Position,
    symbol: Symbol
  ): SpecialEffect | null {
    switch (symbol.id) {
      case 'rush':
        return this.applyRushEffect(grid, position)
      case 'surge':
        return this.applySurgeEffect(grid, position)
      case 'slash':
        return this.applySlashEffect(grid, position)
      default:
        return null
    }
  }

  /**
   * Rush Effect: Add 4-11 Wild symbols (non-adjacent)
   */
  private applyRushEffect(grid: Symbol[][], position: Position): SpecialEffect {
    const wildCount = this.rng.randomInt(4, 11)
    const wildPositions = this.getRandomNonAdjacentPositions(grid, wildCount, [position])

    // Apply wilds to grid (including Rush position)
    const allWildPositions = [position, ...wildPositions]
    for (const pos of allWildPositions) {
      grid[pos.row][pos.col] = {
        id: 'wild',
        name: 'Wild',
        icon: '💠',
        color: '#FFD700',
        tier: 5,
        isWild: true,
        paytable: {},
      }
    }

    return {
      type: 'rush',
      position,
      affectedPositions: allWildPositions,
      wildPositions: allWildPositions,
    }
  }

  /**
   * Surge Effect: Transform adjacent symbols to same type
   */
  private applySurgeEffect(grid: Symbol[][], position: Position): SpecialEffect {
    const adjacentPositions = this.getAdjacentPositions(position)
    const regularSymbols = Object.values(SYMBOLS)
    const targetSymbol = regularSymbols[this.rng.randomInt(0, regularSymbols.length - 1)]

    // Transform adjacent positions and surge itself
    const affectedPositions = [
      position,
      ...adjacentPositions.filter(
        pos => grid[pos.row][pos.col] && !this.isSpecialSymbol(grid[pos.row][pos.col])
      ),
    ]

    for (const pos of affectedPositions) {
      grid[pos.row][pos.col] = targetSymbol
    }

    return {
      type: 'surge',
      position,
      affectedPositions,
      transformedSymbol: targetSymbol,
    }
  }

  /**
   * Slash Effect: Remove entire row and column
   */
  private applySlashEffect(grid: Symbol[][], position: Position): SpecialEffect {
    const affectedPositions: Position[] = [position]

    // Add entire row
    for (let col = 0; col < this.GRID_SIZE; col++) {
      if (col !== position.col) {
        affectedPositions.push({ row: position.row, col })
      }
    }

    // Add entire column
    for (let row = 0; row < this.GRID_SIZE; row++) {
      if (row !== position.row) {
        affectedPositions.push({ row, col: position.col })
      }
    }

    // Remove symbols
    for (const pos of affectedPositions) {
      grid[pos.row][pos.col] = null as any
    }

    return {
      type: 'slash',
      position,
      affectedPositions,
    }
  }

  /**
   * Apply cascade after wins
   */
  private applyCascade(grid: Symbol[][], clusters: Cluster[]): Symbol[][] {
    // Remove winning symbols
    for (const cluster of clusters) {
      for (const pos of cluster.positions) {
        grid[pos.row][pos.col] = null as any
      }
    }

    // Apply gravity and generate new symbols
    for (let col = 0; col < this.GRID_SIZE; col++) {
      this.applyCascadeToColumn(grid, col)
    }

    return grid
  }

  /**
   * Apply cascade to a single column
   */
  private applyCascadeToColumn(grid: Symbol[][], col: number): void {
    // Collect existing symbols from bottom to top
    const existingSymbols: Symbol[] = []
    for (let row = this.GRID_SIZE - 1; row >= 0; row--) {
      if (grid[row][col]) {
        existingSymbols.push(grid[row][col])
        grid[row][col] = null as any
      }
    }

    // Place existing symbols at bottom
    let targetRow = this.GRID_SIZE - 1
    for (const symbol of existingSymbols) {
      grid[targetRow][col] = symbol
      targetRow--
    }

    // Fill remaining positions with new symbols
    for (let row = 0; row <= targetRow; row++) {
      grid[row][col] = this.rng.getRandomSymbol()
    }
  }

  /**
   * Get random non-adjacent positions
   */
  private getRandomNonAdjacentPositions(
    grid: Symbol[][],
    count: number,
    exclude: Position[] = []
  ): Position[] {
    const validPositions: Position[] = []
    const excludeSet = new Set(exclude.map(pos => `${pos.row},${pos.col}`))

    // Collect all valid positions
    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        if (
          !excludeSet.has(`${row},${col}`) &&
          grid[row][col] &&
          !this.isSpecialSymbol(grid[row][col])
        ) {
          validPositions.push({ row, col })
        }
      }
    }

    // Select non-adjacent positions
    const selected: Position[] = []
    const shuffled = validPositions.sort(() => this.rng.random() - 0.5)

    for (const pos of shuffled) {
      if (selected.length >= count) break

      const isAdjacent = selected.some(
        selectedPos => this.getDistance(pos, selectedPos) <= Math.sqrt(2)
      )

      if (!isAdjacent) {
        selected.push(pos)
      }
    }

    return selected
  }

  /**
   * Get adjacent positions (8 directions)
   */
  private getAdjacentPositions(position: Position): Position[] {
    const positions: Position[] = []
    const directions = [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ]

    for (const [dr, dc] of directions) {
      const row = position.row + dr
      const col = position.col + dc

      if (row >= 0 && row < this.GRID_SIZE && col >= 0 && col < this.GRID_SIZE) {
        positions.push({ row, col })
      }
    }

    return positions
  }

  /**
   * Calculate Euclidean distance between positions
   */
  private getDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.col - pos2.col
    const dy = pos1.row - pos2.row
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Check if symbol is special
   */
  private isSpecialSymbol(symbol: Symbol): boolean {
    return symbol?.isSpecial || false
  }
}
