import { SPECIAL_SYMBOLS, getRandomSymbol } from './symbols.js';
import { rtpManager } from './rtp.js';

export class SpecialSymbolHandler {
    constructor(grid) {
        this.grid = grid;
    }
    
    // Rush Symbol - CT Badge: Adds 4-11 Wild symbols
    applyRushEffect(position) {
        const wildCount = Math.floor(Math.random() * 8) + 4; // 4-11 wilds
        const positions = this.getRandomEmptyPositions(wildCount);
        
        positions.forEach(({row, col}) => {
            // Safety check for valid grid position
            if (this.grid.grid[row] && this.grid.grid[row][col] !== undefined) {
                // Create a wild symbol that matches any adjacent symbol
                this.grid.grid[row][col] = {
                    id: 'wild',
                    name: 'Wild',
                    icon: '💠',
                    color: '#FFD700',
                    isWild: true
                };
                // Use safe content setting instead of direct updateCell
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell && this.grid.animations) {
                    this.grid.animations.setCellContentSafely(cell, this.grid.grid[row][col]);
                }
            }
            
            // Add animation effect
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.style.animation = 'pulse 0.5s ease-in-out 2';
            }
        });
        
        return positions;
    }
    
    // Surge Symbol - Rainbow Bomb: Transforms adjacent symbols
    applySurgeEffect(position) {
        const {row, col} = position;
        const transformedPositions = [];
        const targetSymbol = this.getMostCommonAdjacentSymbol(row, col);
        
        if (!targetSymbol) return transformedPositions;
        
        // Transform all adjacent cells
        const adjacentPositions = this.getAdjacentPositions(row, col);
        adjacentPositions.forEach(({row: r, col: c}) => {
            // Check if grid position exists and has a symbol
            if (this.grid.grid[r] && this.grid.grid[r][c] && 
                this.grid.grid[r][c].id !== targetSymbol.id) {
                this.grid.grid[r][c] = targetSymbol;
                // Use safe content setting instead of direct updateCell
                const targetCell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                if (targetCell && this.grid.animations) {
                    this.grid.animations.setCellContentSafely(targetCell, targetSymbol);
                }
                transformedPositions.push({row: r, col: c});
                
                // Add rainbow animation
                const cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                if (cell) {
                    cell.style.background = `linear-gradient(45deg, 
                        #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff)`;
                    setTimeout(() => {
                        cell.style.background = targetSymbol.color + '33';
                    }, 1000);
                }
            }
        });
        
        return transformedPositions;
    }
    
    // Slash Symbol - Karambit: Removes horizontal and vertical lines
    async applySlashEffect(position) {
        // Wait for any active animations before applying special effects
        if (this.grid.animations && this.grid.animations.isAnimationActive()) {
            console.log('⚠️ Waiting for animations to complete before slash effect');
            await this.grid.animations.waitForAnimationsComplete();
        }
        
        const {row, col} = position;
        const removedPositions = [];
        
        // Remove entire row and column (but not the slash symbol itself)
        for (let c = 0; c < this.grid.size; c++) {
            if (c !== col && this.grid.grid[row] && this.grid.grid[row][c]) {
                removedPositions.push({row, col: c});
            }
        }
        
        for (let r = 0; r < this.grid.size; r++) {
            if (r !== row && this.grid.grid[r] && this.grid.grid[r][col]) {
                removedPositions.push({row: r, col});
            }
        }
        
        if (removedPositions.length === 0) {
            console.log('🔪 No symbols to slash');
            return removedPositions;
        }
        
        console.log(`🔪 Slash effect removing ${removedPositions.length} symbols`);
        
        // Create fake clusters for the 4-phase animation system
        const slashClusters = [{
            symbol: { name: 'Slash Effect', id: 'slash-effect' },
            positions: removedPositions,
            size: removedPositions.length
        }];
        
        // First show the slash lines animation
        this.animateSlash(row, col);
        
        // Wait for slash animation to complete, then use 4-phase system
        setTimeout(async () => {
            try {
                // Use the same 4-phase animation as normal clusters
                if (this.grid.animations) {
                    await this.grid.animations.animateRemoval(slashClusters);
                    
                    // After removal animation, cascade the affected columns
                    const movements = [];
                    const newSymbols = [];
                    
                    // Calculate movements and new symbols for affected columns
                    const affectedColumns = new Set();
                    removedPositions.forEach(({col: c}) => affectedColumns.add(c));
                    
                    affectedColumns.forEach(colIndex => {
                        const columnResult = this.grid.calculateColumnCascade(colIndex);
                        movements.push(...columnResult.movements);
                        newSymbols.push(...columnResult.newSymbols);
                    });
                    
                    // Animate the cascade
                    if (movements.length > 0 || newSymbols.length > 0) {
                        this.grid.animations.animateCascade(movements, newSymbols);
                    }
                }
            } catch (error) {
                console.error('Error in slash effect animation:', error);
            }
        }, 600); // Wait for slash lines to finish
        
        return removedPositions;
    }
    
    // Get random empty positions on the grid
    getRandomEmptyPositions(count) {
        const positions = [];
        const allPositions = [];
        
        for (let row = 0; row < this.grid.size; row++) {
            for (let col = 0; col < this.grid.size; col++) {
                allPositions.push({row, col});
            }
        }
        
        // Shuffle and take first 'count' positions
        const shuffled = allPositions.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }
    
    // Get adjacent positions (up, down, left, right)
    getAdjacentPositions(row, col) {
        const positions = [];
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        directions.forEach(([dr, dc]) => {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= 0 && newRow < this.grid.size && 
                newCol >= 0 && newCol < this.grid.size) {
                positions.push({row: newRow, col: newCol});
            }
        });
        
        return positions;
    }
    
    // Find the most common symbol among adjacent cells
    getMostCommonAdjacentSymbol(row, col) {
        const adjacentPositions = this.getAdjacentPositions(row, col);
        const symbolCounts = {};
        
        adjacentPositions.forEach(({row: r, col: c}) => {
            // Check if grid position exists and has a symbol
            if (this.grid.grid[r] && this.grid.grid[r][c]) {
                const symbol = this.grid.grid[r][c];
                if (symbol && !symbol.isWild) {
                    symbolCounts[symbol.id] = (symbolCounts[symbol.id] || 0) + 1;
                }
            }
        });
        
        let maxCount = 0;
        let mostCommonSymbol = null;
        
        Object.entries(symbolCounts).forEach(([symbolId, count]) => {
            if (count > maxCount) {
                maxCount = count;
                // Find the first adjacent position with this symbol ID
                const position = adjacentPositions.find(({row: r, col: c}) => {
                    return this.grid.grid[r] && this.grid.grid[r][c] && 
                           this.grid.grid[r][c].id === symbolId;
                });
                
                if (position) {
                    mostCommonSymbol = this.grid.grid[position.row][position.col];
                }
            }
        });
        
        return mostCommonSymbol;
    }
    
    // Animate slash effect
    animateSlash(row, col) {
        // Create horizontal slash line
        const horizontalSlash = document.createElement('div');
        horizontalSlash.style.position = 'absolute';
        horizontalSlash.style.height = '3px';
        horizontalSlash.style.width = '100%';
        horizontalSlash.style.background = 'linear-gradient(90deg, transparent, #ff0000, transparent)';
        horizontalSlash.style.top = `${(row + 0.5) * (100 / this.grid.size)}%`;
        horizontalSlash.style.left = '0';
        horizontalSlash.style.zIndex = '1000';
        horizontalSlash.style.animation = 'slashHorizontal 0.5s ease-out';
        
        // Create vertical slash line
        const verticalSlash = document.createElement('div');
        verticalSlash.style.position = 'absolute';
        verticalSlash.style.width = '3px';
        verticalSlash.style.height = '100%';
        verticalSlash.style.background = 'linear-gradient(180deg, transparent, #ff0000, transparent)';
        verticalSlash.style.left = `${(col + 0.5) * (100 / this.grid.size)}%`;
        verticalSlash.style.top = '0';
        verticalSlash.style.zIndex = '1000';
        verticalSlash.style.animation = 'slashVertical 0.5s ease-out';
        
        const gridElement = document.getElementById('game-grid');
        gridElement.style.position = 'relative';
        gridElement.appendChild(horizontalSlash);
        gridElement.appendChild(verticalSlash);
        
        // Remove after animation
        setTimeout(() => {
            horizontalSlash.remove();
            verticalSlash.remove();
        }, 500);
    }
    
    // Check if special symbol should appear (based on RTP-controlled probability)
    shouldAppearSpecialSymbol() {
        const rushChance = rtpManager.shouldAppearSpecialSymbol('rush');
        const surgeChance = rtpManager.shouldAppearSpecialSymbol('surge');
        const slashChance = rtpManager.shouldAppearSpecialSymbol('slash');
        
        return rushChance || surgeChance || slashChance;
    }
    
    // Get random special symbol
    getRandomSpecialSymbol() {
        const specialSymbols = ['rush', 'surge', 'slash'];
        const randomIndex = Math.floor(Math.random() * specialSymbols.length);
        return SPECIAL_SYMBOLS[specialSymbols[randomIndex].toUpperCase()];
    }
    
    // NEW: Collection methods for simultaneous effects
    
    // Get positions where Rush effect will add wilds (without applying)
    getRushEffectPositions(position) {
        const wildCount = Math.floor(Math.random() * 8) + 4; // 4-11 wilds
        return this.getRandomEmptyPositions(wildCount);
    }
    
    // Get transformations that Surge effect will cause (without applying)
    getSurgeEffectTransformations(position) {
        const {row, col} = position;
        const transformations = [];
        const targetSymbol = this.getMostCommonAdjacentSymbol(row, col);
        
        if (!targetSymbol) return transformations;
        
        // Get all adjacent positions that will be transformed
        const adjacentPositions = this.getAdjacentPositions(row, col);
        adjacentPositions.forEach(({row: r, col: c}) => {
            if (this.grid.grid[r] && this.grid.grid[r][c] && 
                this.grid.grid[r][c].id !== targetSymbol.id) {
                transformations.push({
                    position: {row: r, col: c},
                    symbol: targetSymbol
                });
            }
        });
        
        return transformations;
    }
    
    // Get positions that Slash effect will eliminate (without applying)
    getSlashEffectPositions(position) {
        const {row, col} = position;
        const eliminatedPositions = [];
        
        // Remove entire row and column (but not the slash symbol itself)
        for (let c = 0; c < this.grid.size; c++) {
            if (c !== col && this.grid.grid[row] && this.grid.grid[row][c]) {
                eliminatedPositions.push({row, col: c});
            }
        }
        
        for (let r = 0; r < this.grid.size; r++) {
            if (r !== row && this.grid.grid[r] && this.grid.grid[r][col]) {
                eliminatedPositions.push({row: r, col});
            }
        }
        
        return eliminatedPositions;
    }
}