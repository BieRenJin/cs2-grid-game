// Direct RTP Calculator - No Frontend Required
// Run with: node rtp_calculator.js

// Symbol definitions (copied from game)
const SYMBOLS = {
    FLASHBANG: {
        id: 'flashbang', name: 'Flashbang', tier: 1,
        paytable: { 5: 0.12, 6: 0.22, 7: 0.35, 8: 0.55, 9: 0.75, 10: 1.1, 11: 1.6, 12: 2.7, 13: 5.4, 14: 10.8, 15: 21.6 }
    },
    SMOKE: {
        id: 'smoke', name: 'Smoke Grenade', tier: 1,
        paytable: { 5: 0.12, 6: 0.22, 7: 0.35, 8: 0.55, 9: 0.75, 10: 1.1, 11: 1.6, 12: 2.7, 13: 5.4, 14: 10.8, 15: 21.6 }
    },
    HE_GRENADE: {
        id: 'hegrenade', name: 'HE Grenade', tier: 2,
        paytable: { 5: 0.1, 6: 0.3, 7: 0.4, 8: 0.6, 9: 0.8, 10: 1.2, 11: 2.0, 12: 3.5, 13: 6.0, 14: 12.0, 15: 25.0 }
    },
    KEVLAR: {
        id: 'kevlar', name: 'Kevlar Vest', tier: 2,
        paytable: { 5: 0.2, 6: 0.3, 7: 0.5, 8: 0.7, 9: 1.0, 10: 1.5, 11: 2.5, 12: 4.0, 13: 8.0, 14: 15.0, 15: 30.0 }
    },
    DEFUSE_KIT: {
        id: 'defusekit', name: 'Defuse Kit', tier: 3,
        paytable: { 5: 0.2, 6: 0.4, 7: 0.6, 8: 0.9, 9: 1.2, 10: 1.8, 11: 3.0, 12: 5.0, 13: 10.0, 14: 20.0, 15: 40.0 }
    },
    DEAGLE: {
        id: 'deagle', name: 'Desert Eagle', tier: 3,
        paytable: { 5: 0.3, 6: 0.5, 7: 0.8, 8: 1.2, 9: 1.5, 10: 2.0, 11: 4.0, 12: 7.0, 13: 12.0, 14: 25.0, 15: 60.0 }
    },
    AK47: {
        id: 'ak47', name: 'AK-47', tier: 4,
        paytable: { 5: 0.5, 6: 0.7, 7: 1.0, 8: 1.5, 9: 2.0, 10: 3.0, 11: 5.0, 12: 10.0, 13: 15.0, 14: 35.0, 15: 100.0 }
    },
    AWP: {
        id: 'awp', name: 'AWP', tier: 5,
        paytable: { 5: 1.0, 6: 1.5, 7: 2.0, 8: 3.0, 9: 5.0, 10: 10.0, 11: 15.0, 12: 25.0, 13: 50.0, 14: 100.0, 15: 200.0 }
    }
};

const SPECIAL_SYMBOLS = {
    RUSH: { id: 'rush', name: 'CT Badge' },
    SURGE: { id: 'surge', name: 'Rainbow Bomb' },
    SLASH: { id: 'slash', name: 'Karambit' }
};

// Symbol weights (from RTP manager)
const SYMBOL_WEIGHTS = [
    { symbol: SYMBOLS.FLASHBANG, weight: 20 },
    { symbol: SYMBOLS.SMOKE, weight: 20 },
    { symbol: SYMBOLS.HE_GRENADE, weight: 18 },
    { symbol: SYMBOLS.KEVLAR, weight: 15 },
    { symbol: SYMBOLS.DEFUSE_KIT, weight: 12 },
    { symbol: SYMBOLS.DEAGLE, weight: 8 },
    { symbol: SYMBOLS.AK47, weight: 5 },
    { symbol: SYMBOLS.AWP, weight: 2 }
];

const TOTAL_WEIGHT = SYMBOL_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);

// Special symbol weights
const SPECIAL_WEIGHTS = [
    { symbol: 'rush', weight: 40 },
    { symbol: 'surge', weight: 30 },
    { symbol: 'slash', weight: 30 }
];
const SPECIAL_TOTAL_WEIGHT = SPECIAL_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);

class RTCalculator {
    constructor() {
        this.specialSymbolChance = 0.0078; // 0.78% - targeting 97% RTP
        this.betAmount = 1.0;
    }

    // Get random regular symbol
    getRandomSymbol() {
        let random = Math.random() * TOTAL_WEIGHT;
        for (const item of SYMBOL_WEIGHTS) {
            random -= item.weight;
            if (random <= 0) {
                return item.symbol;
            }
        }
        return SYMBOL_WEIGHTS[0].symbol;
    }

    // Get random special symbol
    getRandomSpecialSymbol() {
        let random = Math.random() * SPECIAL_TOTAL_WEIGHT;
        for (const item of SPECIAL_WEIGHTS) {
            random -= item.weight;
            if (random <= 0) {
                return SPECIAL_SYMBOLS[item.symbol.toUpperCase()];
            }
        }
        return SPECIAL_SYMBOLS.RUSH;
    }

    // Create virtual grid
    createGrid() {
        const grid = Array(7).fill(null).map(() => Array(7).fill(null));
        let goldenSymbolPlaced = false;

        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 7; col++) {
                let symbol;
                
                if (Math.random() < this.specialSymbolChance) {
                    symbol = this.getRandomSpecialSymbol();
                    // Check golden symbol restriction
                    if ((symbol.id === 'rush' || symbol.id === 'multiplier') && goldenSymbolPlaced) {
                        symbol = this.getRandomSymbol();
                    } else if (symbol.id === 'rush' || symbol.id === 'multiplier') {
                        goldenSymbolPlaced = true;
                    }
                } else {
                    symbol = this.getRandomSymbol();
                }
                
                grid[row][col] = symbol;
            }
        }
        
        return grid;
    }

    // DFS for cluster finding
    dfs(grid, row, col, symbolId, visited) {
        if (row < 0 || row >= 7 || col < 0 || col >= 7 || visited[row][col]) {
            return [];
        }

        const currentSymbol = grid[row][col];
        if (!currentSymbol || 
            (currentSymbol.id !== symbolId && !currentSymbol.isWild) ||
            (currentSymbol.id !== symbolId && this.isSpecialSymbol(currentSymbol.id))) {
            return [];
        }

        visited[row][col] = true;
        const positions = [{row, col}];

        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dr, dc] of directions) {
            positions.push(...this.dfs(grid, row + dr, col + dc, symbolId, visited));
        }

        return positions;
    }

    // Find all clusters
    findClusters(grid) {
        const clusters = [];
        
        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 7; col++) {
                if (grid[row] && grid[row][col]) {
                    const currentSymbol = grid[row][col];
                    
                    if (currentSymbol.isWild || this.isSpecialSymbol(currentSymbol.id)) {
                        continue;
                    }
                    
                    const visited = Array(7).fill(null).map(() => Array(7).fill(false));
                    const cluster = this.dfs(grid, row, col, currentSymbol.id, visited);
                    
                    if (cluster && cluster.length >= 5) {
                        const existingCluster = clusters.find(c => 
                            c.symbol.id === currentSymbol.id && 
                            c.positions.some(pos => 
                                cluster.some(newPos => 
                                    pos.row === newPos.row && pos.col === newPos.col
                                )
                            )
                        );
                        
                        if (!existingCluster) {
                            clusters.push({
                                symbol: currentSymbol,
                                positions: cluster,
                                size: cluster.length
                            });
                        }
                    }
                }
            }
        }
        
        return clusters;
    }

    // Calculate volatility-adjusted payout
    calculateVolatilityPayout(basePayout, clusterSize) {
        // Medium volatility multiplier
        let volatilityMultiplier = 0.7 + (Math.random() * 0.6);
        
        // Larger clusters get volatility bonus
        if (clusterSize >= 15) {
            volatilityMultiplier *= 1.5;
        } else if (clusterSize >= 10) {
            volatilityMultiplier *= 1.2;
        }
        
        return basePayout * volatilityMultiplier;
    }

    // Cascade grid
    cascadeGrid(grid, clusters) {
        // Remove winning symbols
        clusters.forEach(cluster => {
            cluster.positions.forEach(pos => {
                grid[pos.row][pos.col] = null;
            });
        });

        // Cascade and fill
        for (let col = 0; col < 7; col++) {
            let writePos = 6;
            for (let row = 6; row >= 0; row--) {
                if (grid[row][col] !== null) {
                    if (row !== writePos) {
                        grid[writePos][col] = grid[row][col];
                        grid[row][col] = null;
                    }
                    writePos--;
                }
            }
            
            // Fill empty spaces
            for (let row = writePos; row >= 0; row--) {
                let symbol;
                if (Math.random() < this.specialSymbolChance) {
                    symbol = this.getRandomSpecialSymbol();
                } else {
                    symbol = this.getRandomSymbol();
                }
                grid[row][col] = symbol;
            }
        }
    }

    // Process special effects (simplified)
    processSpecialEffects(grid) {
        const rushPositions = [];
        const surgePositions = [];
        const slashPositions = [];
        
        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 7; col++) {
                const symbol = grid[row][col];
                if (symbol) {
                    if (symbol.id === 'rush') rushPositions.push({row, col});
                    else if (symbol.id === 'surge') surgePositions.push({row, col});
                    else if (symbol.id === 'slash') slashPositions.push({row, col});
                }
            }
        }
        
        // Apply effects (simplified - just convert to wilds for calculation)
        if (rushPositions.length > 0) {
            rushPositions.forEach(pos => {
                grid[pos.row][pos.col] = { id: 'wild', isWild: true };
                // Add weighted wild count (4 most likely, 11 least likely)
                const wildCount = this.getWeightedWildCount();
                let added = 0;
                for (let r = 0; r < 7 && added < wildCount; r++) {
                    for (let c = 0; c < 7 && added < wildCount; c++) {
                        if (grid[r][c] && !this.isSpecialSymbol(grid[r][c].id) && Math.random() < 0.3) {
                            grid[r][c] = { id: 'wild', isWild: true };
                            added++;
                        }
                    }
                }
            });
            return true;
        }
        
        if (surgePositions.length > 0) {
            surgePositions.forEach(pos => {
                const targetSymbol = this.getRandomSymbol();
                grid[pos.row][pos.col] = targetSymbol;
                // Transform adjacent
                const adjacent = this.getAdjacent(pos.row, pos.col);
                adjacent.forEach(adjPos => {
                    if (grid[adjPos.row] && grid[adjPos.row][adjPos.col] && 
                        !this.isSpecialSymbol(grid[adjPos.row][adjPos.col].id)) {
                        grid[adjPos.row][adjPos.col] = targetSymbol;
                    }
                });
            });
            return true;
        }
        
        if (slashPositions.length > 0) {
            slashPositions.forEach(pos => {
                // Remove row and column
                for (let c = 0; c < 7; c++) grid[pos.row][c] = null;
                for (let r = 0; r < 7; r++) grid[r][pos.col] = null;
            });
            this.cascadeGrid(grid, []);
            return true;
        }
        
        return false;
    }

    getAdjacent(row, col) {
        const positions = [];
        const directions = [[-1,0],[-1,1],[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1]];
        
        directions.forEach(([dr, dc]) => {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= 0 && newRow < 7 && newCol >= 0 && newCol < 7) {
                positions.push({row: newRow, col: newCol});
            }
        });
        
        return positions;
    }

    isSpecialSymbol(id) {
        return ['rush', 'surge', 'slash', 'scatter', 'multiplier'].includes(id);
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
                return item.count;
            }
        }
        
        return 4; // Fallback to minimum
    }

    // Simulate single spin
    simulateSpin() {
        const result = {
            totalWin: 0,
            specialSymbolsTriggered: 0,
            evaluationCycles: 0
        };

        const grid = this.createGrid();
        
        let evaluationCount = 0;
        while (evaluationCount < 20) {
            evaluationCount++;
            result.evaluationCycles = evaluationCount;
            
            const clusters = this.findClusters(grid);
            if (clusters && clusters.length > 0) {
                let cycleWin = 0;
                clusters.forEach(cluster => {
                    const symbol = cluster.symbol;
                    const clusterSize = Math.min(cluster.size, 15);
                    const basePayout = symbol.paytable[clusterSize] || symbol.paytable[15] || 0;
                    const adjustedPayout = this.calculateVolatilityPayout(basePayout, clusterSize);
                    cycleWin += adjustedPayout * this.betAmount;
                });
                
                result.totalWin += cycleWin;
                this.cascadeGrid(grid, clusters);
            } else {
                const hasSpecialEffects = this.processSpecialEffects(grid);
                if (hasSpecialEffects) {
                    result.specialSymbolsTriggered++;
                    continue;
                } else {
                    break;
                }
            }
        }
        
        return result;
    }

    // Run RTP test
    runRTPTest(spins = 1000000) {
        console.log(`🧪 Starting RTP Test with ${spins.toLocaleString()} spins...`);
        
        const startTime = Date.now();
        const results = {
            totalSpins: spins,
            totalBet: 0,
            totalWin: 0,
            specialSymbolTriggered: 0,
            bigWins: 0,
            hugeWins: 0,
            megaWins: 0,
            deadSpins: 0,
            maxWin: 0,
            totalEvaluationCycles: 0
        };

        for (let i = 1; i <= spins; i++) {
            const spinResult = this.simulateSpin();
            
            results.totalBet += this.betAmount;
            results.totalWin += spinResult.totalWin;
            results.totalEvaluationCycles += spinResult.evaluationCycles;
            
            if (spinResult.totalWin > results.maxWin) {
                results.maxWin = spinResult.totalWin;
            }
            
            const winMultiplier = spinResult.totalWin / this.betAmount;
            if (spinResult.totalWin === 0) {
                results.deadSpins++;
            } else if (winMultiplier > 100) {
                results.megaWins++;
            } else if (winMultiplier > 50) {
                results.hugeWins++;
            } else if (winMultiplier > 10) {
                results.bigWins++;
            }
            
            if (spinResult.specialSymbolsTriggered > 0) {
                results.specialSymbolTriggered++;
            }

            // Progress update every 100k spins
            if (i % 100000 === 0) {
                const currentRTP = ((results.totalWin / results.totalBet) * 100).toFixed(3);
                const elapsed = (Date.now() - startTime) / 1000;
                const eta = ((elapsed / i) * (spins - i)) / 60;
                console.log(`Progress: ${i.toLocaleString()}/${spins.toLocaleString()} (${currentRTP}% RTP, ETA: ${eta.toFixed(1)}min)`);
            }
        }

        // Calculate final results
        const finalRTP = (results.totalWin / results.totalBet) * 100;
        const avgWinPerSpin = results.totalWin / results.totalSpins;
        const winRate = ((results.totalSpins - results.deadSpins) / results.totalSpins) * 100;
        const avgEvaluationsPerSpin = results.totalEvaluationCycles / results.totalSpins;
        const maxWinMultiplier = results.maxWin / this.betAmount;
        const testDuration = (Date.now() - startTime) / 1000;
        const spinsPerSecond = results.totalSpins / testDuration;

        console.log('\n🎯 RTP Test Results:');
        console.log('====================================');
        console.log(`💰 Final RTP: ${finalRTP.toFixed(3)}% (Target: 97%)`);
        console.log(`📊 Total Bet: $${results.totalBet.toLocaleString()}`);
        console.log(`💵 Total Win: $${results.totalWin.toFixed(2)}`);
        console.log(`📈 Average Win/Spin: $${avgWinPerSpin.toFixed(4)}`);
        console.log(`🎯 Win Rate: ${winRate.toFixed(2)}% (spins with wins)`);
        console.log(`🏆 Max Win: ${maxWinMultiplier.toFixed(1)}x ($${results.maxWin.toFixed(2)})`);
        console.log('');
        console.log('Win Categories:');
        console.log(`💀 Dead Spins: ${results.deadSpins.toLocaleString()} (${((results.deadSpins/results.totalSpins)*100).toFixed(2)}%)`);
        console.log(`🟢 Big Wins (>10x): ${results.bigWins.toLocaleString()}`);
        console.log(`🟡 Huge Wins (>50x): ${results.hugeWins.toLocaleString()}`);
        console.log(`🔴 Mega Wins (>100x): ${results.megaWins.toLocaleString()}`);
        console.log('');
        console.log(`⭐ Special Symbols: ${results.specialSymbolTriggered.toLocaleString()} spins (${((results.specialSymbolTriggered/results.totalSpins)*100).toFixed(3)}%)`);
        console.log('');
        console.log('Performance:');
        console.log(`⏱️ Test Duration: ${testDuration.toFixed(1)}s`);
        console.log(`🚀 Speed: ${spinsPerSecond.toFixed(0)} spins/sec`);
        console.log(`🔄 Avg Evaluations/Spin: ${avgEvaluationsPerSpin.toFixed(2)}`);

        return results;
    }
}

// Run the test
const calculator = new RTCalculator();
calculator.runRTPTest(1000000);