import { SPECIAL_SYMBOLS, SYMBOLS, getRandomSymbol } from './symbols.js';
import { rtpManager } from './rtp.js';

export class SpecialSymbolHandler {
    constructor(grid) {
        this.grid = grid;
        
        // Statistics tracking for debugging
        this.stats = {
            totalSymbolsGenerated: 0,
            specialSymbolsGenerated: 0,
            rushCount: 0,
            surgeCount: 0,
            slashCount: 0
        };
    }
    
    // Rush Symbol - CT Badge: Adds 4-11 Wild symbols (weighted distribution)
    applyRushEffect(position) {
        const wildCount = this.getWeightedWildCount(); // Weighted 4-11 wilds
        const positions = this.getRandomPositions(wildCount);
        
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
        
        // FIXED: Randomly select one symbol type for all adjacent transformations
        const availableSymbols = [
            SYMBOLS.FLASHBANG, SYMBOLS.SMOKE, SYMBOLS.HE_GRENADE, SYMBOLS.KEVLAR,
            SYMBOLS.DEFUSE_KIT, SYMBOLS.DEAGLE, SYMBOLS.AK47, SYMBOLS.AWP
        ];
        const targetSymbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
        
        console.log(`🌈 Surge transforming all adjacent to: ${targetSymbol.name}`);
        
        // Transform adjacent cells to the same symbol type (only regular symbols)
        const adjacentPositions = this.getAdjacentPositions(row, col);
        adjacentPositions.forEach(({row: r, col: c}) => {
            // Check if grid position exists and has a symbol
            if (this.grid.grid[r] && this.grid.grid[r][c]) {
                const currentSymbol = this.grid.grid[r][c];
                
                // Only transform regular symbols, skip special symbols
                if (!this.isSpecialSymbol(currentSymbol)) {
                    console.log(`🔄 Surge transforming ${currentSymbol.name} at [${r},${c}] to ${targetSymbol.name}`);
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
                } else {
                    console.log(`🚫 Surge skips special symbol ${currentSymbol.name} at [${r},${c}]`);
                }
            }
        });
        
        // FIXED: Transform the Surge symbol itself to the target symbol
        console.log(`🌈 Surge symbol at [${row},${col}] also transforms to: ${targetSymbol.name}`);
        this.grid.grid[row][col] = targetSymbol;
        const surgeCell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (surgeCell && this.grid.animations) {
            this.grid.animations.setCellContentSafely(surgeCell, targetSymbol);
            // Add rainbow fade effect to the surge cell too
            surgeCell.style.background = `linear-gradient(45deg, 
                #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff)`;
            setTimeout(() => {
                surgeCell.style.background = targetSymbol.color + '33';
            }, 1000);
        }
        transformedPositions.push({row, col}); // Include Surge position itself
        
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
        
        // FIXED: Include the slash symbol itself in removal
        removedPositions.push({row, col});
        
        // Remove entire row
        for (let c = 0; c < this.grid.size; c++) {
            if (c !== col && this.grid.grid[row] && this.grid.grid[row][c]) {
                removedPositions.push({row, col: c});
            }
        }
        
        // Remove entire column
        for (let r = 0; r < this.grid.size; r++) {
            if (r !== row && this.grid.grid[r] && this.grid.grid[r][col]) {
                removedPositions.push({row: r, col});
            }
        }
        
        console.log(`🔪 Slash effect removing ${removedPositions.length} symbols (including itself)`);
        
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
    
    // Get random positions for Wild symbols (only regular symbols, not special symbols)
    getRandomPositions(count) {
        const positions = [];
        const validPositions = [];
        
        for (let row = 0; row < this.grid.size; row++) {
            for (let col = 0; col < this.grid.size; col++) {
                const currentSymbol = this.grid.grid[row][col];
                
                // Only include positions with regular symbols (not special symbols)
                if (currentSymbol && !this.isSpecialSymbol(currentSymbol)) {
                    validPositions.push({row, col});
                }
            }
        }
        
        console.log(`🎯 Found ${validPositions.length} valid positions for Wild placement (excluding special symbols)`);
        
        // Shuffle and take first 'count' positions
        const shuffled = validPositions.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }
    
    // Helper method to check if a symbol is a special symbol
    isSpecialSymbol(symbol) {
        const specialIds = ['rush', 'surge', 'slash', 'scatter', 'multiplier'];
        return specialIds.includes(symbol.id);
    }
    
    // Alias for backward compatibility
    getRandomEmptyPositions(count) {
        return this.getRandomPositions(count);
    }
    
    // Get adjacent positions (all 8 directions including diagonals)
    getAdjacentPositions(row, col) {
        const positions = [];
        // All 8 directions: up, up-right, right, down-right, down, down-left, left, up-left
        const directions = [
            [-1, 0],  // up
            [-1, 1],  // up-right
            [0, 1],   // right
            [1, 1],   // down-right
            [1, 0],   // down
            [1, -1],  // down-left
            [0, -1],  // left
            [-1, -1]  // up-left
        ];
        
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
    
    // Check if special symbol should appear with balanced probability
    shouldAppearSpecialSymbol() {
        this.stats.totalSymbolsGenerated++;
        
        // Total special symbol appearance rate: 0.78% for 97% RTP
        const totalSpecialChance = 0.0078; // 0.78% total chance for any special symbol
        // This gives approximately 0.38 special symbols per spin (49 * 0.0078)
        
        if (Math.random() < totalSpecialChance) {
            this.stats.specialSymbolsGenerated++;
            const currentRate = ((this.stats.specialSymbolsGenerated / this.stats.totalSymbolsGenerated) * 100).toFixed(2);
            console.log(`🎰 Special symbol triggered! (0.78% chance, current rate: ${currentRate}%)`);
            return true;
        }
        return false;
    }
    
    // Get random special symbol with weighted distribution
    getRandomSpecialSymbol() {
        const specialWeights = [
            { symbol: 'rush', weight: 40 },    // 40% of special symbols (0.8% total)
            { symbol: 'surge', weight: 30 },   // 30% of special symbols (0.6% total)
            { symbol: 'slash', weight: 30 }    // 30% of special symbols (0.6% total)
        ];
        
        const totalWeight = specialWeights.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const item of specialWeights) {
            random -= item.weight;
            if (random <= 0) {
                // Update statistics
                this.stats[item.symbol + 'Count']++;
                console.log(`⭐ Selected special symbol: ${item.symbol} (Total: Rush=${this.stats.rushCount}, Surge=${this.stats.surgeCount}, Slash=${this.stats.slashCount})`);
                return SPECIAL_SYMBOLS[item.symbol.toUpperCase()];
            }
        }
        
        // Fallback
        return SPECIAL_SYMBOLS.RUSH;
    }
    
    // NEW: Collection methods for simultaneous effects
    
    // Get positions where Rush effect will add wilds (without applying)
    getRushEffectPositions(position) {
        const wildCount = Math.floor(Math.random() * 8) + 4; // 4-11 wilds
        return this.getRandomPositions(wildCount);
    }
    
    // Get transformations that Surge effect will cause (without applying)
    getSurgeEffectTransformations(position) {
        const {row, col} = position;
        const transformations = [];
        
        // FIXED: Use actual game symbols for transformation
        const availableSymbols = [
            SYMBOLS.FLASHBANG,
            SYMBOLS.SMOKE,
            SYMBOLS.HE_GRENADE,
            SYMBOLS.KEVLAR,
            SYMBOLS.DEFUSE_KIT,
            SYMBOLS.DEAGLE,
            SYMBOLS.AK47,
            SYMBOLS.AWP
        ];
        
        // Randomly select the target symbol type for transformation
        const targetSymbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
        
        console.log(`🌈 Surge will transform all adjacent symbols to: ${targetSymbol.name}`);
        
        // Get all 8 adjacent positions (including diagonals)
        const adjacentPositions = this.getAdjacentPositions(row, col);
        
        // Transform adjacent positions to the selected symbol type (only regular symbols)
        adjacentPositions.forEach(({row: r, col: c}) => {
            if (this.grid.grid[r] && this.grid.grid[r][c]) {
                const currentSymbol = this.grid.grid[r][c];
                
                // Only transform regular symbols, skip special symbols
                if (!this.isSpecialSymbol(currentSymbol)) {
                    transformations.push({
                        position: {row: r, col: c},
                        symbol: targetSymbol
                    });
                    console.log(`🔄 Surge will transform ${currentSymbol.name} at [${r},${c}] to ${targetSymbol.name}`);
                } else {
                    console.log(`🚫 Surge skips special symbol ${currentSymbol.name} at [${r},${c}]`);
                }
            }
        });
        
        // FIXED: Include the Surge symbol itself in the transformation
        transformations.push({
            position: {row, col},
            symbol: targetSymbol
        });
        
        console.log(`🎯 Surge will transform ${transformations.length} positions (including itself) to ${targetSymbol.name}`);
        return transformations;
    }
    
    // Get positions that Slash effect will eliminate (without applying)
    getSlashEffectPositions(position) {
        const {row, col} = position;
        const eliminatedPositions = [];
        
        // FIXED: Include the slash symbol itself in elimination
        // First add the slash symbol position itself
        eliminatedPositions.push({row, col});
        
        // Remove entire row
        for (let c = 0; c < this.grid.size; c++) {
            if (c !== col && this.grid.grid[row] && this.grid.grid[row][c]) {
                eliminatedPositions.push({row, col: c});
            }
        }
        
        // Remove entire column
        for (let r = 0; r < this.grid.size; r++) {
            if (r !== row && this.grid.grid[r] && this.grid.grid[r][col]) {
                eliminatedPositions.push({row: r, col});
            }
        }
        
        console.log(`⚔️ Slash will eliminate ${eliminatedPositions.length} positions including itself`);
        return eliminatedPositions;
    }
    
    // Get special symbol statistics  
    getStats() {
        const rate = this.stats.totalSymbolsGenerated > 0 ? 
            ((this.stats.specialSymbolsGenerated / this.stats.totalSymbolsGenerated) * 100).toFixed(2) : '0.00';
        
        return {
            totalSymbolsGenerated: this.stats.totalSymbolsGenerated,
            specialSymbolsGenerated: this.stats.specialSymbolsGenerated,
            actualRate: rate + '%',
            targetRate: '0.78%',
            rushCount: this.stats.rushCount,
            surgeCount: this.stats.surgeCount,
            slashCount: this.stats.slashCount
        };
    }
    
    // Reset statistics
    resetStats() {
        this.stats = {
            totalSymbolsGenerated: 0,
            specialSymbolsGenerated: 0,
            rushCount: 0,
            surgeCount: 0,
            slashCount: 0
        };
        console.log('📊 Special symbol statistics reset');
    }

    // Get weighted wild count for Rush effect (4 most likely, 11 least likely)
    getWeightedWildCount() {
        const wildCountWeights = [
            { count: 4, weight: 40 },  // 40% chance for 4 wilds (highest)
            { count: 5, weight: 25 },  // 25% chance for 5 wilds
            { count: 6, weight: 15 },  // 15% chance for 6 wilds
            { count: 7, weight: 10 },  // 10% chance for 7 wilds
            { count: 8, weight: 5 },   // 5% chance for 8 wilds
            { count: 9, weight: 3 },   // 3% chance for 9 wilds
            { count: 10, weight: 1.5 }, // 1.5% chance for 10 wilds
            { count: 11, weight: 0.5 }  // 0.5% chance for 11 wilds (lowest)
        ];
        
        const totalWeight = wildCountWeights.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const item of wildCountWeights) {
            random -= item.weight;
            if (random <= 0) {
                console.log(`⭐ Rush effect: generating ${item.count} wilds`);
                return item.count;
            }
        }
        
        return 4; // Fallback to minimum
    }
}