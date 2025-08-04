// RTP (Return to Player) Configuration
// Target RTP: 97% with medium volatility

export class RTPManager {
    constructor() {
        this.targetRTP = 0.97; // 97%
        this.houseEdge = 0.03; // 3%
        this.volatility = 'medium';
        
        // Symbol weights adjusted for 97% RTP
        this.symbolWeights = {
            flashbang: 20,
            smoke: 20,
            hegrenade: 18,
            kevlar: 15,
            defusekit: 12,
            deagle: 8,
            ak47: 5,
            awp: 2
        };
        
        // Special symbol appearance rates - adjusted to be more balanced
        this.specialSymbolRates = {
            rush: 0.008,     // 0.8% chance (was 2%)
            surge: 0.006,    // 0.6% chance (was 1.5%)
            slash: 0.006,    // 0.6% chance (was 1.5%)
            scatter: 0.003,  // 0.3% base chance (was 0.5%)
            multiplier: 0.08 // 8% in free spins only (was 10%)
        };
        
        // Bonus feature frequencies
        this.bonusFrequencies = {
            freeSpins: 1 / 200,        // Average 1 in 200 spins
            bonusBoost: 1 / 100,       // With double boost
            superBoost: 1 / 20         // With super boost
        };
        
        // Payout multipliers for balance
        this.payoutMultipliers = {
            small: { min: 0.5, max: 5 },      // 50% of spins
            medium: { min: 5, max: 25 },      // 30% of spins
            large: { min: 25, max: 100 },     // 15% of spins
            huge: { min: 100, max: 500 },     // 4% of spins
            mega: { min: 500, max: 5000 }     // 1% of spins
        };
        
        // Track session statistics
        this.sessionStats = {
            totalBets: 0,
            totalWins: 0,
            spinsCount: 0,
            currentRTP: 0,
            biggestWin: 0,
            freeSpinsTriggered: 0
        };
    }
    
    // Adjust symbol weights dynamically to maintain RTP
    adjustSymbolWeights() {
        const currentRTP = this.calculateSessionRTP();
        
        if (currentRTP < this.targetRTP - 0.05) {
            // RTP too low, slightly increase high-value symbol chances
            this.symbolWeights.ak47 = Math.min(7, this.symbolWeights.ak47 + 0.5);
            this.symbolWeights.awp = Math.min(3, this.symbolWeights.awp + 0.2);
        } else if (currentRTP > this.targetRTP + 0.05) {
            // RTP too high, slightly decrease high-value symbol chances
            this.symbolWeights.ak47 = Math.max(3, this.symbolWeights.ak47 - 0.5);
            this.symbolWeights.awp = Math.max(1, this.symbolWeights.awp - 0.2);
        }
    }
    
    // Calculate current session RTP
    calculateSessionRTP() {
        if (this.sessionStats.totalBets === 0) return 0;
        return this.sessionStats.totalWins / this.sessionStats.totalBets;
    }
    
    // Update session statistics
    updateStats(betAmount, winAmount) {
        this.sessionStats.totalBets += betAmount;
        this.sessionStats.totalWins += winAmount;
        this.sessionStats.spinsCount++;
        this.sessionStats.currentRTP = this.calculateSessionRTP();
        
        if (winAmount > this.sessionStats.biggestWin) {
            this.sessionStats.biggestWin = winAmount;
        }
        
        // Adjust weights every 50 spins
        if (this.sessionStats.spinsCount % 50 === 0) {
            this.adjustSymbolWeights();
        }
    }
    
    // Get adjusted symbol weight
    getSymbolWeight(symbolId) {
        return this.symbolWeights[symbolId] || 1;
    }
    
    // Check if special symbol should appear
    shouldAppearSpecialSymbol(symbolType, isFreeSpins = false) {
        const rate = this.specialSymbolRates[symbolType];
        if (!rate) return false;
        
        // Increased rates during free spins
        const adjustedRate = isFreeSpins ? rate * 2 : rate;
        return Math.random() < adjustedRate;
    }
    
    // Calculate volatility-adjusted payout
    calculateVolatilityPayout(basePayout, clusterSize) {
        let volatilityMultiplier = 1;
        
        switch (this.volatility) {
            case 'low':
                // More frequent, smaller wins
                volatilityMultiplier = 0.8 + (Math.random() * 0.4);
                break;
            case 'medium':
                // Balanced wins
                volatilityMultiplier = 0.7 + (Math.random() * 0.6);
                break;
            case 'high':
                // Less frequent, bigger wins
                volatilityMultiplier = 0.5 + (Math.random() * 1.0);
                break;
        }
        
        // Larger clusters get volatility bonus
        if (clusterSize >= 15) {
            volatilityMultiplier *= 1.5;
        } else if (clusterSize >= 10) {
            volatilityMultiplier *= 1.2;
        }
        
        return basePayout * volatilityMultiplier;
    }
    
    // Get session statistics for display
    getSessionStats() {
        return {
            ...this.sessionStats,
            currentRTP: (this.sessionStats.currentRTP * 100).toFixed(2) + '%',
            theoreticalRTP: (this.targetRTP * 100).toFixed(2) + '%',
            houseEdge: (this.houseEdge * 100).toFixed(2) + '%',
            volatility: this.volatility
        };
    }
    
    // Reset session statistics
    resetSession() {
        this.sessionStats = {
            totalBets: 0,
            totalWins: 0,
            spinsCount: 0,
            currentRTP: 0,
            biggestWin: 0,
            freeSpinsTriggered: 0
        };
    }
}

// Export singleton instance
export const rtpManager = new RTPManager();