import { SPECIAL_SYMBOLS } from './symbols.js';
import { rtpManager } from './rtp.js';

export class FreeSpinsManager {
    constructor(game) {
        this.game = game;
        this.scatterPositions = [];
        this.multiplierPositions = [];
    }
    
    // Check for scatter symbols and trigger free spins
    checkForScatters() {
        this.scatterPositions = [];
        let superScatterCount = 0;
        
        // Find all scatter symbols on the grid
        for (let row = 0; row < this.game.grid.size; row++) {
            for (let col = 0; col < this.game.grid.size; col++) {
                const symbol = this.game.grid.grid[row][col];
                if (symbol && symbol.id === 'scatter') {
                    this.scatterPositions.push({row, col});
                    if (symbol.isSuper) {
                        superScatterCount++;
                    }
                }
            }
        }
        
        // Trigger free spins if 4+ scatters
        if (this.scatterPositions.length >= 4) {
            const baseSpins = 8;
            const extraSpins = (this.scatterPositions.length - 4) * 2;
            const totalSpins = baseSpins + extraSpins;
            
            this.highlightScatters();
            
            // Super free spins if at least one super scatter
            const isSuper = superScatterCount > 0;
            
            setTimeout(() => {
                // Update RTP stats for free spins trigger
                rtpManager.sessionStats.freeSpinsTriggered++;
                this.game.startFreeSpins(totalSpins, isSuper);
            }, 1500);
            
            return true;
        }
        
        return false;
    }
    
    // Highlight scatter symbols
    highlightScatters() {
        this.scatterPositions.forEach(({row, col}) => {
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.classList.add('scatter-highlight');
                cell.style.animation = 'scatterPulse 1s ease-in-out infinite';
            }
        });
    }
    
    // Add multiplier symbols during free spins
    addMultiplierSymbols() {
        if (this.game.freeSpinsRemaining === 0) return;
        
        // RTP-controlled chance to add multiplier symbols
        const multiplierChance = rtpManager.shouldAppearSpecialSymbol('multiplier', true) ? 0.1 : 0.05;
        
        for (let row = 0; row < this.game.grid.size; row++) {
            for (let col = 0; col < this.game.grid.size; col++) {
                if (Math.random() < multiplierChance) {
                    const multiplierValue = this.getRandomMultiplier();
                    const multiplierSymbol = {
                        ...SPECIAL_SYMBOLS.MULTIPLIER,
                        multiplier: multiplierValue,
                        icon: `${multiplierValue}x`
                    };
                    
                    // Only place on empty or low-value symbols
                    const currentSymbol = this.game.grid.grid[row][col];
                    if (currentSymbol && currentSymbol.tier <= 2) {
                        this.game.grid.grid[row][col] = multiplierSymbol;
                        this.game.grid.updateCell(row, col, multiplierSymbol);
                        this.multiplierPositions.push({row, col, value: multiplierValue});
                    }
                }
            }
        }
    }
    
    // Get random multiplier value
    getRandomMultiplier() {
        const multipliers = [2, 3, 5, 10];
        const weights = [50, 30, 15, 5];
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        
        let random = Math.random() * totalWeight;
        for (let i = 0; i < multipliers.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return multipliers[i];
            }
        }
        
        return multipliers[0];
    }
    
    // Calculate total multiplier from all multiplier symbols
    calculateTotalMultiplier() {
        let totalMultiplier = 1;
        
        this.multiplierPositions.forEach(({row, col}) => {
            const symbol = this.game.grid.grid[row][col];
            if (symbol && symbol.multiplier) {
                totalMultiplier += symbol.multiplier;
            }
        });
        
        return totalMultiplier;
    }
    
    // Update free spins UI
    updateFreeSpinsUI() {
        // Remove existing UI elements
        const existingIndicator = document.querySelector('.free-spins-indicator');
        const existingMultiplier = document.querySelector('.multiplier-display');
        
        if (existingIndicator) existingIndicator.remove();
        if (existingMultiplier) existingMultiplier.remove();
        
        if (this.game.freeSpinsRemaining > 0) {
            // Add free spins indicator
            const indicator = document.createElement('div');
            indicator.className = 'free-spins-indicator';
            indicator.textContent = `Free Spins: ${this.game.freeSpinsRemaining}`;
            document.getElementById('game-container').appendChild(indicator);
            
            // Add multiplier display if in super free spins
            if (this.game.progressiveMultiplier > 1) {
                const multiplierDisplay = document.createElement('div');
                multiplierDisplay.className = 'multiplier-display';
                multiplierDisplay.textContent = `Multiplier: ${this.game.progressiveMultiplier}x`;
                document.getElementById('game-container').appendChild(multiplierDisplay);
            }
        }
    }
    
    // Clean up scatter highlights
    cleanupScatterHighlights() {
        document.querySelectorAll('.scatter-highlight').forEach(cell => {
            cell.classList.remove('scatter-highlight');
            cell.style.animation = '';
        });
    }
}