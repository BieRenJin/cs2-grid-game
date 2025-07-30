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
            // Create a wild symbol that matches any adjacent symbol
            this.grid.grid[row][col] = {
                id: 'wild',
                name: 'Wild',
                icon: '💠',
                color: '#FFD700',
                isWild: true
            };
            this.grid.updateCell(row, col, this.grid.grid[row][col]);
            
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
            if (this.grid.grid[r][c].id !== targetSymbol.id) {
                this.grid.grid[r][c] = targetSymbol;
                this.grid.updateCell(r, c, targetSymbol);
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
    applySlashEffect(position) {
        const {row, col} = position;
        const removedPositions = [];
        
        // Remove entire row and column
        for (let c = 0; c < this.grid.size; c++) {
            if (c !== col) {
                removedPositions.push({row, col: c});
            }
        }
        
        for (let r = 0; r < this.grid.size; r++) {
            if (r !== row) {
                removedPositions.push({row: r, col});
            }
        }
        
        // Animate the slash effect
        this.animateSlash(row, col);
        
        // Mark positions for removal
        removedPositions.forEach(({row: r, col: c}) => {
            this.grid.grid[r][c] = null;
        });
        
        // Trigger cascade for affected columns
        const affectedColumns = new Set();
        removedPositions.forEach(({col: c}) => affectedColumns.add(c));
        
        setTimeout(() => {
            affectedColumns.forEach(c => this.grid.cascadeColumn(c));
        }, 500);
        
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
            const symbol = this.grid.grid[r][c];
            if (symbol && !symbol.isWild) {
                symbolCounts[symbol.id] = (symbolCounts[symbol.id] || 0) + 1;
            }
        });
        
        let maxCount = 0;
        let mostCommonSymbol = null;
        
        Object.entries(symbolCounts).forEach(([symbolId, count]) => {
            if (count > maxCount) {
                maxCount = count;
                mostCommonSymbol = this.grid.grid[adjacentPositions.find(
                    ({row: r, col: c}) => this.grid.grid[r][c].id === symbolId
                ).row][adjacentPositions.find(
                    ({row: r, col: c}) => this.grid.grid[r][c].id === symbolId
                ).col];
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
}