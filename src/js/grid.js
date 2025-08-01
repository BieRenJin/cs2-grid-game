import { getRandomSymbol, SPECIAL_SYMBOLS, getSymbolDisplayWithLog } from './symbols.js';
import { SpecialSymbolHandler } from './specialSymbols.js';
import { GridAnimations } from './gridAnimations.js';

export class GameGrid {
    constructor(size = 7) {
        this.size = size;
        this.grid = [];
        this.specialHandler = new SpecialSymbolHandler(this);
        this.animations = null;
        this.initGrid();
    }
    
    initGrid() {
        const gridElement = document.getElementById('game-grid');
        gridElement.innerHTML = '';
        this.grid = [];
        
        // Initialize animations after grid is created
        if (!this.animations) {
            this.animations = new GridAnimations(this);
        }
        
        for (let row = 0; row < this.size; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.size; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                gridElement.appendChild(cell);
                
                const symbol = getRandomSymbol();
                this.grid[row][col] = symbol;
                this.updateCell(row, col, symbol);
            }
        }
    }
    
    updateCell(row, col, symbol) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            console.log(`🔄 Updating cell [${row},${col}] with symbol: ${symbol.name}`);
            cell.innerHTML = getSymbolDisplayWithLog(symbol);
            cell.style.backgroundColor = symbol.color + '33'; // Add transparency
            cell.dataset.symbolId = symbol.id;
            
            // Add special styling for special symbols
            cell.classList.remove('special-symbol', 'wild-symbol');
            if (Object.values(SPECIAL_SYMBOLS).some(s => s.id === symbol.id)) {
                cell.classList.add('special-symbol');
            }
            if (symbol.isWild) {
                cell.classList.add('wild-symbol');
            }
        }
    }
    
    spin() {
        return new Promise((resolve) => {
            // Animate the spin
            const cells = document.querySelectorAll('.grid-cell');
            const specialSymbolPositions = [];
            let goldenSymbolPlaced = false; // Track if golden symbol is already placed
            
            cells.forEach((cell, index) => {
                setTimeout(() => {
                    cell.style.transform = 'rotateY(360deg)';
                    setTimeout(() => {
                        const row = Math.floor(index / this.size);
                        const col = index % this.size;
                        
                        // Check if special symbol should appear
                        let newSymbol;
                        
                        // Check for boost features
                        const game = window.game; // Access game instance
                        let scatterChance = 0.005; // Base 0.5% chance
                        
                        if (game && game.bonusBoostActive) {
                            scatterChance *= 2; // Double chance
                        }
                        if (game && game.superBoostActive) {
                            scatterChance = 0.05; // Guaranteed 1 in 20
                        }
                        
                        // Include scatter in symbol generation during boosts or free spins
                        const includeScatter = Math.random() < scatterChance || (game && game.freeSpinsRemaining > 0);
                        
                        if (this.specialHandler.shouldAppearSpecialSymbol()) {
                            newSymbol = this.specialHandler.getRandomSpecialSymbol();
                            
                            // Check if this is a golden symbol (Rush or Multiplier)
                            const isGoldenSymbol = newSymbol.id === 'rush' || newSymbol.id === 'multiplier';
                            
                            if (isGoldenSymbol && goldenSymbolPlaced) {
                                // If golden symbol already placed, get regular symbol instead
                                console.log('🚫 Golden symbol already placed, using regular symbol instead');
                                newSymbol = getRandomSymbol(includeScatter);
                                if (newSymbol.id === 'scatter') {
                                    specialSymbolPositions.push({row, col, symbol: newSymbol});
                                }
                            } else {
                                // Place the special symbol
                                specialSymbolPositions.push({row, col, symbol: newSymbol});
                                if (isGoldenSymbol) {
                                    goldenSymbolPlaced = true;
                                    console.log(`✨ Golden symbol (${newSymbol.name}) placed at [${row},${col}]`);
                                }
                            }
                        } else {
                            newSymbol = getRandomSymbol(includeScatter);
                            if (newSymbol.id === 'scatter') {
                                specialSymbolPositions.push({row, col, symbol: newSymbol});
                            }
                        }
                        
                        this.grid[row][col] = newSymbol;
                        this.updateCell(row, col, newSymbol);
                        cell.style.transform = 'rotateY(0deg)';
                    }, 250);
                }, index * 20);
            });
            
            // Check for wins after animation completes
            setTimeout(async () => {
                // Special symbol effects will be handled in game.js evaluateSpin()
                // Just return the positions for reference
                const clusters = this.findClusters();
                resolve({ clusters, specialSymbolPositions });
            }, cells.length * 20 + 500);
        });
    }
    
    findClusters() {
        try {
            const visited = Array(this.size).fill(null).map(() => Array(this.size).fill(false));
            const clusters = [];
            
            for (let row = 0; row < this.size; row++) {
                for (let col = 0; col < this.size; col++) {
                    if (!visited[row][col] && this.grid[row] && this.grid[row][col]) {
                        const currentSymbol = this.grid[row][col];
                        
                        // Skip Wild symbols as starting points - they will be included when processing regular symbols
                        if (currentSymbol.isWild) {
                            continue;
                        }
                        
                        // Use dfsWithWilds to handle Wild symbols as substitutes
                        const cluster = this.dfsWithWilds(row, col, currentSymbol.id, visited);
                        if (cluster && cluster.length >= 5) {
                            clusters.push({
                                symbol: currentSymbol, // Use the original symbol type for payout calculation
                                positions: cluster,
                                size: cluster.length
                            });
                            console.log(`🎯 Found cluster of ${currentSymbol.name} (${cluster.length} symbols, including wilds)`);
                        }
                    }
                }
            }
            
            return clusters;
        } catch (error) {
            console.error('Error finding clusters:', error);
            return [];
        }
    }
    
    dfs(row, col, symbolId, visited) {
        try {
            if (row < 0 || row >= this.size || col < 0 || col >= this.size ||
                !visited[row] || visited[row][col] || 
                !this.grid[row] || !this.grid[row][col] || 
                this.grid[row][col].id !== symbolId) {
                return [];
            }
            
            visited[row][col] = true;
            const positions = [{row, col}];
            
            // Check all 4 directions
            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
            for (const [dr, dc] of directions) {
                const newRow = row + dr;
                const newCol = col + dc;
                const result = this.dfs(newRow, newCol, symbolId, visited);
                if (result && result.length > 0) {
                    positions.push(...result);
                }
            }
            
            return positions;
        } catch (error) {
            console.error('Error in DFS:', error, {row, col, symbolId});
            return [];
        }
    }
    
    highlightWinningClusters(clusters) {
        // Clear previous highlights
        document.querySelectorAll('.grid-cell.winning').forEach(cell => {
            cell.classList.remove('winning');
        });
        
        // Highlight winning clusters
        clusters.forEach(cluster => {
            cluster.positions.forEach(({row, col}) => {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    cell.classList.add('winning');
                }
            });
        });
    }
    
    async removeWinningSymbols(clusters) {
        try {
            // Clean up any orphaned elements first
            if (this.animations) {
                this.animations.cleanup();
            }
            
            // PHASE 1: Animate removal of winning symbols
            await this.animations.animateRemoval(clusters);
            
            // PHASE 2: Update grid data and mark empty positions
            const columnsToFill = new Set();
            clusters.forEach(cluster => {
                cluster.positions.forEach(({row, col}) => {
                    this.grid[row][col] = null;
                    columnsToFill.add(col);
                });
            });
            
            // PHASE 3: Calculate ALL column cascades simultaneously
            const allMovements = [];
            const allNewSymbols = [];
            
            columnsToFill.forEach(col => {
                const { movements, newSymbols } = this.calculateColumnCascade(col);
                allMovements.push(...movements);
                allNewSymbols.push(...newSymbols);
            });
            
            // PHASE 4: Animate ALL cascades simultaneously
            if (allMovements.length > 0 || allNewSymbols.length > 0) {
                await this.animations.animateCascade(allMovements, allNewSymbols);
            }
            
            console.log(`✅ Removed ${clusters.length} clusters and cascaded ${allMovements.length} movements + ${allNewSymbols.length} new symbols`);
            
        } catch (error) {
            console.error('Error in removeWinningSymbols:', error);
        }
    }
    
    
    // Check if golden symbol already exists on the grid
    hasGoldenSymbol() {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const symbol = this.grid[row][col];
                if (symbol && (symbol.id === 'rush' || symbol.id === 'multiplier')) {
                    return true;
                }
            }
        }
        return false;
    }
    
    // Calculate cascade for a column and return movements/new symbols
    calculateColumnCascade(col) {
        const movements = [];
        const newSymbols = [];
        
        // Track which symbols need to move
        let writePos = this.size - 1;
        for (let row = this.size - 1; row >= 0; row--) {
            if (this.grid[row][col] !== null) {
                if (row !== writePos) {
                    movements.push({
                        symbol: this.grid[row][col],
                        fromRow: row,
                        toRow: writePos,
                        col: col
                    });
                    this.grid[writePos][col] = this.grid[row][col];
                    this.grid[row][col] = null;
                }
                writePos--;
            }
        }
        
        // Fill empty spaces with new symbols
        const goldenSymbolExists = this.hasGoldenSymbol();
        for (let row = writePos; row >= 0; row--) {
            let newSymbol;
            
            // Generate symbol with golden symbol restriction
            if (this.specialHandler.shouldAppearSpecialSymbol()) {
                newSymbol = this.specialHandler.getRandomSpecialSymbol();
                
                // Check if this would be a golden symbol
                const isGoldenSymbol = newSymbol.id === 'rush' || newSymbol.id === 'multiplier';
                
                if (isGoldenSymbol && goldenSymbolExists) {
                    // If golden symbol already exists, use regular symbol instead
                    console.log('🚫 Golden symbol already exists on grid, using regular symbol for cascade');
                    newSymbol = getRandomSymbol();
                } else if (isGoldenSymbol) {
                    console.log(`✨ Golden symbol (${newSymbol.name}) added during cascade at [${row},${col}]`);
                }
            } else {
                newSymbol = getRandomSymbol();
            }
            
            this.grid[row][col] = newSymbol;
            newSymbols.push({
                symbol: newSymbol,
                row: row,
                col: col,
                dropDistance: writePos + 1
            });
        }
        
        return { movements, newSymbols };
    }
    
    async applySpecialSymbolEffects(specialSymbolPositions) {
        for (const {row, col, symbol} of specialSymbolPositions) {
            switch(symbol.id) {
                case 'rush':
                    this.specialHandler.applyRushEffect({row, col});
                    break;
                case 'surge':
                    this.specialHandler.applySurgeEffect({row, col});
                    break;
                case 'slash':
                    await this.specialHandler.applySlashEffect({row, col});
                    break;
            }
        }
    }
    
    // Modified cluster finding to handle wild symbols
    dfsWithWilds(row, col, symbolId, visited) {
        if (row < 0 || row >= this.size || col < 0 || col >= this.size ||
            visited[row][col]) {
            return [];
        }
        
        const currentSymbol = this.grid[row][col];
        if (!currentSymbol || (currentSymbol.id !== symbolId && !currentSymbol.isWild)) {
            return [];
        }
        
        visited[row][col] = true;
        const positions = [{row, col}];
        
        // Check all 4 directions
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dr, dc] of directions) {
            positions.push(...this.dfsWithWilds(row + dr, col + dc, symbolId, visited));
        }
        
        return positions;
    }
    
    // Refresh all cell images after loading
    refreshImages() {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col]) {
                    // Use safe content setting instead of direct updateCell
                    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    if (cell && this.animations) {
                        this.animations.setCellContentSafely(cell, this.grid[row][col]);
                    }
                }
            }
        }
    }
}