export interface Symbol {
  id: string
  name: string
  icon: string
  color: string
  tier: number
  isWild?: boolean
  isSpecial?: boolean
}

export interface Position {
  row: number
  col: number
}

export interface Cluster {
  symbol: Symbol
  positions: Position[]
  size: number
}

export interface Movement {
  fromRow: number
  toRow: number
  col: number
  symbol: Symbol
}

export interface GameState {
  grid: Symbol[][]
  balance: number
  betAmount: number
  winAmount: number
  isSpinning: boolean
  freeSpinsRemaining: number
  multiplier: number
}

export interface SpecialEffect {
  type: 'rush' | 'surge' | 'slash'
  position: Position
  affectedPositions: Position[]
}
