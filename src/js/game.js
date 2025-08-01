import { GameGrid } from './grid.js';
import { SYMBOLS, SPECIAL_SYMBOLS, initializeSymbolImages } from './symbols.js';
import { FreeSpinsManager } from './freeSpins.js';
import { SoundManager } from './sounds.js';
import { rtpManager } from './rtp.js';

export class CS2GridGame {
    constructor() {
        this.grid = new GameGrid();
        this.balance = 1000.00;
        this.betAmount = 1.00;
        this.minBet = 0.10;
        this.maxBet = 1000.00;
        this.isSpinning = false;
        this.freeSpinsRemaining = 0;
        this.progressiveMultiplier = 1;
        this.freeSpinsManager = new FreeSpinsManager(this);
        this.isSuperFreeSpins = false;
        this.bonusBoostActive = false;
        this.superBoostActive = false;
        this.soundManager = new SoundManager();
        
        this.initializeElements();
        this.updateUI();
        this.addSoundToggle();
        
        // Initialize deadlock detection
        this.initDeadlockDetection();
        
        // Initialize symbol images
        console.log('🎮 CS2 Grid Game starting...');
        initializeSymbolImages();
        console.log('✅ Game initialization complete');
    }
    
    initializeElements() {
        this.balanceElement = document.getElementById('balance');
        this.betAmountElement = document.getElementById('bet-amount');
        this.winAmountElement = document.getElementById('win-amount');
        this.betInput = document.getElementById('bet-input');
        this.spinButton = document.getElementById('spin-button');
        this.betDecreaseButton = document.getElementById('bet-decrease');
        this.betIncreaseButton = document.getElementById('bet-increase');
        this.bonusBuyButton = document.getElementById('bonus-buy');
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.spinButton.addEventListener('click', () => {
            this.soundManager.play('click');
            this.spin();
        });
        this.betDecreaseButton.addEventListener('click', () => {
            this.soundManager.play('click');
            this.adjustBet(-0.10);
        });
        this.betIncreaseButton.addEventListener('click', () => {
            this.soundManager.play('click');
            this.adjustBet(0.10);
        });
        this.betInput.addEventListener('change', (e) => this.setBet(parseFloat(e.target.value)));
        this.bonusBuyButton.addEventListener('click', () => {
            this.soundManager.play('click');
            this.showBonusBuyOptions();
        });
        
        // Add auto-test functionality
        const autoTestButton = document.getElementById('auto-test');
        if (autoTestButton) {
            autoTestButton.addEventListener('click', () => {
                this.runAutoTest();
            });
        }
        
        // Paytable modal
        const paytableButton = document.getElementById('toggle-paytable');
        const modal = document.getElementById('paytable-modal');
        const closeModal = modal.querySelector('.close');
        
        paytableButton.addEventListener('click', () => {
            this.showPaytable();
            modal.classList.remove('hidden');
            modal.classList.add('show');
        });
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.showRTPStats();
            }
            // Add Ctrl+C to clear yellow effects for debugging
            if (e.ctrlKey && e.key === 'c') {
                e.preventDefault();
                if (this.grid.animations) {
                    this.grid.animations.forceCleanup();
                    console.log('🧹 Manual force cleanup triggered');
                }
            }
        });
        
        closeModal.addEventListener('click', () => {
            modal.classList.remove('show');
            modal.classList.add('hidden');
        });
    }
    
    adjustBet(delta) {
        this.setBet(this.betAmount + delta);
    }
    
    setBet(amount) {
        this.betAmount = Math.max(this.minBet, Math.min(this.maxBet, amount));
        this.betAmount = Math.round(this.betAmount * 100) / 100;
        this.updateUI();
    }
    
    updateUI() {
        try {
            this.balanceElement.textContent = this.balance.toFixed(2);
            this.betAmountElement.textContent = this.betAmount.toFixed(2);
            this.betInput.value = this.betAmount.toFixed(2);
            
            // Disable spin if insufficient balance or animations playing
            const animationsActive = this.grid.animations && this.grid.animations.isAnimationActive();
            this.spinButton.disabled = this.isSpinning || this.balance < this.betAmount || animationsActive;
            
            // Update button text based on current state
            if (this.isSpinning || animationsActive) {
                this.spinButton.textContent = 'ANIMATING...';
                this.spinButton.style.animation = 'pulse 1s infinite';
            } else if (this.freeSpinsRemaining > 0) {
                this.spinButton.textContent = `FREE SPIN (${this.freeSpinsRemaining})`;
                this.spinButton.style.animation = '';
            } else {
                this.spinButton.textContent = 'SPIN';
                this.spinButton.style.animation = '';
            }
            
            // Update RTP display if exists
            this.updateRTPDisplay();
        } catch (error) {
            console.error('Error updating UI:', error);
        }
    }
    
    async spin() {
        try {
            if (this.isSpinning || this.balance < this.betAmount) {
                console.log('⚠️ Cannot spin - already spinning or insufficient balance');
                return;
            }
            
            // Check if animations are still playing
            if (this.grid.animations && this.grid.animations.isAnimationActive()) {
                console.log('⚠️ Cannot spin - animations still playing');
                return;
            }
            
            console.log('🎰 Starting new spin...');
            this.isSpinning = true;
            this.lastSpinTime = Date.now(); // Track spin start time
            this.evaluationDepth = 0; // Reset recursion counter
            this.spinButton.disabled = true;
            this.spinButton.textContent = 'ANIMATING...';
            this.spinButton.style.animation = 'pulse 1s infinite';
            
            // Deduct bet from balance
            if (this.freeSpinsRemaining === 0) {
                this.balance -= this.betAmount;
                this.updateUI();
            }
            
            // Reset win amount for new spin
            this.winAmountElement.textContent = '0.00';
            this.currentSpinWinAmount = 0;
            
            // Play spin sound
            this.soundManager.play('spin');
            
            // Add spin animation to cells
            document.querySelectorAll('.grid-cell').forEach(cell => {
                cell.classList.add('spin-animation');
            });
            
            // Perform the spin with error handling
            const spinResult = await this.grid.spin();
            
            // Remove spin animation
            document.querySelectorAll('.grid-cell').forEach(cell => {
                cell.classList.remove('spin-animation');
            });
            
            this.evaluateSpin();
        } catch (error) {
            console.error('Error during spin:', error);
            this.handleSpinError();
        }
    }
    
    async evaluateSpin() {
        try {
            // Prevent infinite recursion with depth counter
            if (!this.evaluationDepth) {
                this.evaluationDepth = 0;
                this.currentSpinWinAmount = 0; // Initialize total win for this spin
            }
            this.evaluationDepth++;
            
            if (this.evaluationDepth > 20) {
                console.warn('Maximum evaluation depth reached, ending spin');
                this.endSpin();
                return;
            }
            
            console.log(`🔍 Starting evaluation cycle ${this.evaluationDepth} (Current spin win: $${this.currentSpinWinAmount.toFixed(2)})`);
            
            // STEP 1: Process all wins first (inner win loop)
            await this.processAllWins();
            
            // STEP 2: Check for special effects in priority order
            // Each effect triggers a return to STEP 1
            
            // Check Rush effects
            if (await this.processRushSymbols()) {
                console.log('⭐ Rush effects triggered - restarting evaluation from step 1');
                setTimeout(() => {
                    this.evaluateSpin(); // Restart from step 1
                }, 800);
                return;
            }
            
            // Check Surge effects
            if (await this.processSurgeSymbols()) {
                console.log('🌈 Surge effects triggered - restarting evaluation from step 1');
                setTimeout(() => {
                    this.evaluateSpin(); // Restart from step 1
                }, 800);
                return;
            }
            
            // Check Slash effects
            if (await this.processSlashSymbols()) {
                console.log('⚔️ Slash effects triggered - restarting evaluation from step 1');
                setTimeout(() => {
                    this.evaluateSpin(); // Restart from step 1
                }, 800);
                return;
            }
            
            // If we get here, no more wins or effects - end the spin
            console.log(`🏁 No more wins or effects, final spin win: $${this.currentSpinWinAmount.toFixed(2)}`);
            const scattersTriggered = this.freeSpinsManager.checkForScatters();
            if (scattersTriggered) {
                this.soundManager.play('scatter');
            } else {
                this.endSpin();
            }
            
            this.updateUI();
        } catch (error) {
            console.error('Error during spin evaluation:', error);
            this.endSpin();
        }
    }
    
    // INNER WIN LOOP: Keep processing wins until there are no more
    async processAllWins() {
        console.log('🔄 Starting INNER WIN LOOP - processing all wins until none remain');
        let winLoopCount = 0;
        
        while (true) {
            winLoopCount++;
            console.log(`💰 Win loop iteration ${winLoopCount}: checking for clusters`);
            
            const clusters = this.grid.findClusters();
            
            if (!clusters || clusters.length === 0) {
                console.log('✅ No more wins found, exiting WIN LOOP');
                break;
            }
            
            console.log(`💎 Found ${clusters.length} winning clusters - processing`);
            let cycleWin = 0;
            
            // Calculate winnings for this cycle
            clusters.forEach(cluster => {
                try {
                    if (!cluster || !cluster.symbol || !cluster.symbol.paytable) {
                        console.warn('Invalid cluster data:', cluster);
                        return;
                    }
                    
                    const symbol = cluster.symbol;
                    const clusterSize = Math.min(cluster.size, 15);
                    const basePayout = symbol.paytable[clusterSize] || symbol.paytable[15] || 0;
                    const adjustedPayout = rtpManager.calculateVolatilityPayout(basePayout, clusterSize);
                    cycleWin += adjustedPayout * this.betAmount;
                } catch (clusterError) {
                    console.error('Error processing cluster:', clusterError, cluster);
                }
            });
            
            // Apply progressive multiplier in free spins
            if (this.freeSpinsRemaining > 0) {
                cycleWin *= this.progressiveMultiplier;
                if (!this.isSuperFreeSpins) {
                    this.progressiveMultiplier++;
                }
            }
            
            // Apply multiplier symbols if in free spins
            if (this.freeSpinsRemaining > 0) {
                const symbolMultiplier = this.freeSpinsManager.calculateTotalMultiplier();
                cycleWin *= symbolMultiplier;
            }
            
            // Add to spin total and update balance
            this.currentSpinWinAmount += cycleWin;
            this.balance += cycleWin;
            this.winAmountElement.textContent = this.currentSpinWinAmount.toFixed(2);
            
            console.log(`💰 Cycle win: $${cycleWin.toFixed(2)}, Total spin win: $${this.currentSpinWinAmount.toFixed(2)}`);
            
            // Play win sound (based on cycle win)
            this.soundManager.playWinSound(cycleWin, this.betAmount);
            
            // Highlight and remove winning symbols
            this.grid.highlightWinningClusters(clusters);
            
            // Wait for highlight display, then remove and cascade
            await new Promise(resolve => {
                setTimeout(async () => {
                    try {
                        console.log('🎯 Removing clusters and cascading');
                        await this.grid.removeWinningSymbols(clusters);
                        this.soundManager.play('cascade');
                        
                        // Wait for cascade to complete before next iteration
                        setTimeout(() => {
                            resolve();
                        }, 800);
                    } catch (error) {
                        console.error('Error during removal:', error);
                        resolve();
                    }
                }, 800);
            });
        }
        
        console.log(`✅ WIN LOOP completed after ${winLoopCount} iterations`);
    }
    
    
    
    // Process all Rush symbols as a group
    async processRushSymbols() {
        const rushSymbols = [];
        
        // Find all Rush symbols on the grid
        for (let row = 0; row < this.grid.size; row++) {
            for (let col = 0; col < this.grid.size; col++) {
                const symbol = this.grid.grid[row][col];
                if (symbol && symbol.id === 'rush') {
                    rushSymbols.push({row, col, symbol});
                }
            }
        }
        
        if (rushSymbols.length === 0) {
            return false;
        }
        
        console.log(`🌟 Found ${rushSymbols.length} RUSH symbols - triggering SIMULTANEOUSLY`);
        await this.showSpecialSymbolsActivation(rushSymbols);
        
        const wildPositions = new Set();
        rushSymbols.forEach(({row, col}) => {
            console.log(`🌟 Rush at [${row},${col}] adding wilds`);
            const positions = this.grid.specialHandler.getRushEffectPositions({row, col});
            positions.forEach(pos => wildPositions.add(`${pos.row},${pos.col}`));
        });
        
        // Apply all Rush effects at once
        await this.applyRushEffects(wildPositions, rushSymbols);
        return true;
    }
    
    // Process all Surge symbols as a group
    async processSurgeSymbols() {
        const surgeSymbols = [];
        
        // Find all Surge symbols on the grid
        for (let row = 0; row < this.grid.size; row++) {
            for (let col = 0; col < this.grid.size; col++) {
                const symbol = this.grid.grid[row][col];
                if (symbol && symbol.id === 'surge') {
                    surgeSymbols.push({row, col, symbol});
                }
            }
        }
        
        if (surgeSymbols.length === 0) {
            return false;
        }
        
        console.log(`🌈 Found ${surgeSymbols.length} SURGE symbols - triggering SIMULTANEOUSLY`);
        await this.showSpecialSymbolsActivation(surgeSymbols);
        
        const transformations = new Map();
        surgeSymbols.forEach(({row, col}) => {
            console.log(`🌈 Surge at [${row},${col}] transforming adjacent`);
            const transforms = this.grid.specialHandler.getSurgeEffectTransformations({row, col});
            transforms.forEach(({position, symbol}) => {
                transformations.set(`${position.row},${position.col}`, symbol);
            });
        });
        
        // Apply all Surge effects at once
        await this.applySurgeEffects(transformations);
        return true;
    }
    
    // Process all Slash symbols as a group
    async processSlashSymbols() {
        const slashSymbols = [];
        
        // Find all Slash symbols on the grid
        for (let row = 0; row < this.grid.size; row++) {
            for (let col = 0; col < this.grid.size; col++) {
                const symbol = this.grid.grid[row][col];
                if (symbol && symbol.id === 'slash') {
                    slashSymbols.push({row, col, symbol});
                }
            }
        }
        
        if (slashSymbols.length === 0) {
            return false;
        }
        
        console.log(`⚔️ Found ${slashSymbols.length} SLASH symbols - triggering SIMULTANEOUSLY`);
        await this.showSpecialSymbolsActivation(slashSymbols);
        
        const eliminatedPositions = new Set();
        slashSymbols.forEach(({row, col}) => {
            console.log(`⚔️ Slash at [${row},${col}] eliminating cross`);
            const positions = this.grid.specialHandler.getSlashEffectPositions({row, col});
            positions.forEach(pos => eliminatedPositions.add(`${pos.row},${pos.col}`));
        });
        
        // Apply all Slash effects at once
        await this.applySlashEffects(eliminatedPositions);
        return true;
    }
    
    // Show all special symbols activating simultaneously with visual effects
    async showSpecialSymbolsActivation(specialSymbolPositions) {
        return new Promise(resolve => {
            console.log(`✨ Showing ${specialSymbolPositions.length} special symbols activating SIMULTANEOUSLY`);
            
            // Add activation effect to ALL special symbols at exactly the same time
            specialSymbolPositions.forEach(({row, col, symbol}) => {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    // Add intense activation glow
                    cell.classList.add('special-activation');
                    cell.style.position = 'relative';
                    cell.style.zIndex = '200';
                    
                    // Create synchronized activation pulse
                    const activationPulse = document.createElement('div');
                    activationPulse.className = 'special-activation-pulse';
                    activationPulse.style.cssText = `
                        position: absolute;
                        top: -8px;
                        left: -8px;
                        right: -8px;
                        bottom: -8px;
                        border: 4px solid ${symbol.id === 'rush' ? '#FFD700' : symbol.id === 'surge' ? '#FF69B4' : '#FF4500'};
                        border-radius: 12px;
                        animation: specialActivation 0.8s ease-in-out 2;
                        pointer-events: none;
                        z-index: 201;
                    `;
                    cell.appendChild(activationPulse);
                    
                    // Add symbol type indicator
                    const typeIndicator = document.createElement('div');
                    typeIndicator.className = 'special-type-indicator';
                    typeIndicator.textContent = symbol.id.toUpperCase();
                    typeIndicator.style.cssText = `
                        position: absolute;
                        top: -20px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: ${symbol.id === 'rush' ? '#FFD700' : symbol.id === 'surge' ? '#FF69B4' : '#FF4500'};
                        color: white;
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-size: 10px;
                        font-weight: bold;
                        z-index: 202;
                        animation: fadeInOut 1.6s ease-in-out;
                    `;
                    cell.appendChild(typeIndicator);
                }
            });
            
            // Play special activation sound
            if (window.game && window.game.soundManager) {
                window.game.soundManager.play('special');
            }
            
            // Remove effects after animation
            setTimeout(() => {
                specialSymbolPositions.forEach(({row, col}) => {
                    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    if (cell) {
                        cell.classList.remove('special-activation');
                        cell.style.zIndex = '';
                        
                        // Remove pulse and indicator elements
                        const pulse = cell.querySelector('.special-activation-pulse');
                        const indicator = cell.querySelector('.special-type-indicator');
                        if (pulse) pulse.remove();
                        if (indicator) indicator.remove();
                    }
                });
                
                console.log('✅ Special symbol activation display complete');
                resolve();
            }, 1600); // Match animation duration
        });
    }
    
    // Apply Rush effects (add wilds and transform Rush symbols to Wild symbols)
    async applyRushEffects(wildPositions, rushPositions) {
        console.log(`⭐ Adding ${wildPositions.size} wild symbols and transforming ${rushPositions.length} Rush symbols to Wild`);
        
        // Create the Wild symbol definition
        const wildSymbol = {
            id: 'wild',
            name: 'Wild',
            icon: '💠',
            color: '#FFD700',
            isWild: true
        };
        
        // Add wild symbols at random positions
        wildPositions.forEach(posStr => {
            const [row, col] = posStr.split(',').map(Number);
            this.grid.grid[row][col] = wildSymbol;
            this.grid.updateCell(row, col, wildSymbol);
        });
        
        // Transform the Rush symbols themselves to Wild symbols (prevents infinite loop)
        rushPositions.forEach(({row, col}) => {
            this.grid.grid[row][col] = wildSymbol;
            this.grid.updateCell(row, col, wildSymbol);
            console.log(`✨ Rush symbol at [${row},${col}] transforms to Wild symbol`);
        });
    }
    
    // Apply Surge effects (transform symbols)
    async applySurgeEffects(transformations) {
        console.log(`🌈 Transforming ${transformations.size} positions`);
        
        transformations.forEach((newSymbol, posStr) => {
            const [row, col] = posStr.split(',').map(Number);
            this.grid.grid[row][col] = newSymbol;
            this.grid.updateCell(row, col, newSymbol);
        });
    }
    
    // Apply Slash effects (eliminate symbols)
    async applySlashEffects(eliminatedPositions) {
        console.log(`⚔️ Eliminating ${eliminatedPositions.size} positions with slash`);
        
        // Show elimination preview
        await this.showEliminationPreview(eliminatedPositions);
        
        // Create clusters for animation
        const eliminatedClusters = [{
            symbol: { name: 'Slash Elimination', id: 'slash-elimination' },
            positions: Array.from(eliminatedPositions).map(posStr => {
                const [row, col] = posStr.split(',').map(Number);
                return {row, col};
            }),
            size: eliminatedPositions.size
        }];
        
        // Use existing removal system
        await this.grid.removeWinningSymbols(eliminatedClusters);
    }
    
    // DEPRECATED: Apply all collected effects at once
    async applyCollectedEffects(effects) {
        // Apply transformations first (Surge effects) - these don't need cascading
        if (effects.transformations.size > 0) {
            console.log(`🔄 Transforming ${effects.transformations.size} positions simultaneously`);
            effects.transformations.forEach((newSymbol, posStr) => {
                const [row, col] = posStr.split(',').map(Number);
                this.grid.grid[row][col] = newSymbol;
                this.grid.updateCell(row, col, newSymbol);
            });
        }
        
        // Apply wild additions (Rush effects) - these don't need cascading  
        if (effects.wildPositions.size > 0) {
            console.log(`⭐ Adding ${effects.wildPositions.size} wilds simultaneously`);
            effects.wildPositions.forEach(posStr => {
                const [row, col] = posStr.split(',').map(Number);
                const wildSymbol = {
                    id: 'wild',
                    name: 'Wild',
                    icon: '💠',
                    color: '#FFD700',
                    isWild: true
                };
                this.grid.grid[row][col] = wildSymbol;
                this.grid.updateCell(row, col, wildSymbol);
            });
        }
        
        // Apply eliminations with simultaneous visual feedback (Slash effects)
        if (effects.eliminatedPositions.size > 0) {
            console.log(`🗑️ Eliminating ${effects.eliminatedPositions.size} positions SIMULTANEOUSLY`);
            
            // STEP 1: Show elimination preview - all positions flash simultaneously
            await this.showEliminationPreview(effects.eliminatedPositions);
            
            // STEP 2: Create clusters for proper cascade animation
            const eliminatedClusters = [{
                symbol: { name: 'Simultaneous Slash Elimination', id: 'slash-elimination' },
                positions: Array.from(effects.eliminatedPositions).map(posStr => {
                    const [row, col] = posStr.split(',').map(Number);
                    return {row, col};
                }),
                size: effects.eliminatedPositions.size
            }];
            
            // STEP 3: Use the existing removal system with cascade animation
            await this.grid.removeWinningSymbols(eliminatedClusters);
            
            console.log('✅ All Slash eliminations completed simultaneously');
        }
    }
    
    // Show elimination preview - all positions that will be eliminated flash simultaneously
    async showEliminationPreview(eliminatedPositions) {
        return new Promise(resolve => {
            console.log(`⚡ Showing elimination preview for ${eliminatedPositions.size} positions SIMULTANEOUSLY`);
            
            // Add elimination preview effect to ALL positions at exactly the same time
            eliminatedPositions.forEach(posStr => {
                const [row, col] = posStr.split(',').map(Number);
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                
                if (cell) {
                    // Add intense elimination warning
                    cell.classList.add('elimination-preview');
                    cell.style.position = 'relative';
                    cell.style.zIndex = '150';
                    
                    // Create synchronized elimination warning
                    const eliminationWarning = document.createElement('div');
                    eliminationWarning.className = 'elimination-warning';
                    eliminationWarning.style.cssText = `
                        position: absolute;
                        top: -4px;
                        left: -4px;
                        right: -4px;
                        bottom: -4px;
                        border: 3px solid #FF4500;
                        border-radius: 8px;
                        animation: eliminationWarning 0.6s ease-in-out 3;
                        pointer-events: none;
                        z-index: 151;
                        box-shadow: 0 0 15px #FF4500;
                    `;
                    cell.appendChild(eliminationWarning);
                    
                    // Add "X" mark to show it will be eliminated
                    const eliminationMark = document.createElement('div');
                    eliminationMark.className = 'elimination-mark';
                    eliminationMark.textContent = '✗';
                    eliminationMark.style.cssText = `
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        color: #FF4500;
                        font-size: 24px;
                        font-weight: bold;
                        z-index: 152;
                        animation: eliminationMarkPulse 0.6s ease-in-out 3;
                        text-shadow: 0 0 10px #FF4500;
                    `;
                    cell.appendChild(eliminationMark);
                }
            });
            
            // Play elimination warning sound
            if (window.game && window.game.soundManager) {
                window.game.soundManager.play('warning');
            }
            
            // Remove preview effects after animation
            setTimeout(() => {
                eliminatedPositions.forEach(posStr => {
                    const [row, col] = posStr.split(',').map(Number);
                    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    
                    if (cell) {
                        cell.classList.remove('elimination-preview');
                        cell.style.zIndex = '';
                        
                        // Remove warning and mark elements
                        const warning = cell.querySelector('.elimination-warning');
                        const mark = cell.querySelector('.elimination-mark');
                        if (warning) warning.remove();
                        if (mark) mark.remove();
                    }
                });
                
                console.log('✅ Elimination preview complete - proceeding with actual elimination');
                resolve();
            }, 1800); // 0.6s × 3 iterations = 1.8s
        });
    }
    
    endSpin() {
        console.log('🏁 Ending spin, resetting state');
        this.isSpinning = false;
        this.evaluationDepth = 0; // Reset recursion counter
        
        // Ensure all animations are properly ended
        if (this.grid.animations) {
            this.grid.animations.isAnimating = false;
            this.grid.animations.pendingAnimations.clear();
            this.grid.animations.currentAnimationPhase = 'idle';
            
            // Force clear any stuck yellow effects
            this.grid.animations.clearAllYellowEffects();
            
            // Reset button text to SPIN
            if (this.spinButton) {
                this.spinButton.textContent = 'SPIN';
                this.spinButton.style.animation = '';
            }
        }
        
        // Handle free spins
        if (this.freeSpinsRemaining > 0) {
            this.freeSpinsRemaining--;
            this.freeSpinsManager.updateFreeSpinsUI();
            
            if (this.freeSpinsRemaining === 0) {
                this.progressiveMultiplier = 1;
                this.isSuperFreeSpins = false;
                this.spinButton.textContent = 'SPIN';
                this.freeSpinsManager.cleanupScatterHighlights();
                alert('Free Spins ended!');
            } else {
                this.spinButton.textContent = `FREE SPIN (${this.freeSpinsRemaining})`;
                // Add multiplier symbols in free spins
                if (this.freeSpinsRemaining > 0) {
                    this.freeSpinsManager.addMultiplierSymbols();
                }
            }
        }
        
        // Reset boost features
        this.bonusBoostActive = false;
        this.superBoostActive = false;
        
        // Update RTP statistics with total spin win
        const totalSpinWin = this.currentSpinWinAmount || 0;
        rtpManager.updateStats(this.betAmount, totalSpinWin);
        console.log(`📊 RTP Update: Bet $${this.betAmount.toFixed(2)}, Total Win $${totalSpinWin.toFixed(2)}`);
        
        this.updateUI();
    }
    
    showBonusBuyOptions() {
        // Create bonus buy modal
        const modal = document.createElement('div');
        modal.className = 'bonus-buy-modal';
        modal.innerHTML = `
            <h2>Bonus Buy Options</h2>
            <div class="bonus-buy-options">
                <div class="bonus-buy-option" data-option="double-boost">
                    <h3>Double Boost</h3>
                    <p>Double your chances of triggering free spins</p>
                    <span class="bonus-buy-price">${(this.betAmount * 1.2).toFixed(2)}</span>
                </div>
                <div class="bonus-buy-option" data-option="super-boost">
                    <h3>Super Boost</h3>
                    <p>Guaranteed scatter symbol every spin (1 in 20 chance)</p>
                    <span class="bonus-buy-price">${(this.betAmount * 5).toFixed(2)}</span>
                </div>
                <div class="bonus-buy-option" data-option="bonus-buy">
                    <h3>Bonus Buy</h3>
                    <p>Instant 8 free spins with progressive multiplier</p>
                    <span class="bonus-buy-price">${(this.betAmount * 80).toFixed(2)}</span>
                </div>
                <div class="bonus-buy-option" data-option="super-bonus-buy">
                    <h3>Super Bonus Buy</h3>
                    <p>Instant 12 super free spins (multiplier doesn't reset)</p>
                    <span class="bonus-buy-price">${(this.betAmount * 200).toFixed(2)}</span>
                </div>
            </div>
            <button id="close-bonus-modal" style="margin-top: 20px;">Close</button>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelectorAll('.bonus-buy-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const optionType = e.currentTarget.dataset.option;
                this.executeBonusBuy(optionType);
                modal.remove();
            });
        });
        
        document.getElementById('close-bonus-modal').addEventListener('click', () => {
            modal.remove();
        });
    }
    
    executeBonusBuy(optionType) {
        switch(optionType) {
            case 'double-boost':
                if (this.balance >= this.betAmount * 1.2) {
                    this.balance -= this.betAmount * 0.2;
                    this.bonusBoostActive = true;
                    alert('Double Boost activated for next spin!');
                } else {
                    alert('Insufficient balance!');
                }
                break;
                
            case 'super-boost':
                if (this.balance >= this.betAmount * 5) {
                    this.balance -= this.betAmount * 4; // 5x total, but 1x is the regular bet
                    this.superBoostActive = true;
                    alert('Super Boost activated! Guaranteed scatter on every spin.');
                } else {
                    alert('Insufficient balance!');
                }
                break;
                
            case 'bonus-buy':
                if (this.balance >= this.betAmount * 80) {
                    this.balance -= this.betAmount * 80;
                    this.startFreeSpins(8);
                } else {
                    alert('Insufficient balance!');
                }
                break;
                
            case 'super-bonus-buy':
                if (this.balance >= this.betAmount * 200) {
                    this.balance -= this.betAmount * 200;
                    this.startFreeSpins(12, true);
                } else {
                    alert('Insufficient balance!');
                }
                break;
        }
        
        this.updateUI();
    }
    
    startFreeSpins(count, isSuper = false) {
        this.freeSpinsRemaining = count;
        this.isSuperFreeSpins = isSuper;
        this.progressiveMultiplier = 1;
        this.spinButton.textContent = `FREE SPIN (${this.freeSpinsRemaining})`;
        this.freeSpinsManager.updateFreeSpinsUI();
        this.soundManager.play('freeSpinStart');
        alert(`${isSuper ? 'Super ' : ''}Free Spins started! ${count} spins awarded!`);
    }
    
    addSoundToggle() {
        const soundToggle = document.createElement('button');
        soundToggle.className = 'sound-toggle';
        soundToggle.innerHTML = '🔊';
        soundToggle.title = 'Toggle Sound';
        
        soundToggle.addEventListener('click', () => {
            const enabled = this.soundManager.toggle();
            soundToggle.innerHTML = enabled ? '🔊' : '🔇';
            soundToggle.classList.toggle('muted', !enabled);
            this.soundManager.play('click');
        });
        
        document.getElementById('game-container').appendChild(soundToggle);
    }
    
    flashWinningSymbols(clusters) {
        clusters.forEach(cluster => {
            cluster.positions.forEach(({row, col}) => {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    // Add intense flashing effect to make wins very obvious
                    cell.classList.add('winning-flash');
                    
                    // Create pulsing border effect
                    const pulseEffect = document.createElement('div');
                    pulseEffect.className = 'win-pulse-border';
                    pulseEffect.style.cssText = `
                        position: absolute;
                        top: -3px;
                        left: -3px;
                        right: -3px;
                        bottom: -3px;
                        border: 3px solid #FFD700;
                        border-radius: 8px;
                        animation: pulseGlow 0.8s ease-in-out infinite;
                        pointer-events: none;
                        z-index: 10;
                    `;
                    cell.style.position = 'relative';
                    cell.appendChild(pulseEffect);
                    
                    // Remove effects after shorter display period
                    setTimeout(() => {
                        cell.classList.remove('winning-flash');
                        if (pulseEffect.parentNode) {
                            pulseEffect.remove();
                        }
                    }, 600); // Reduced from 1200ms to 600ms
                }
            });
        });
    }
    
    addCascadeEffect(clusters) {
        clusters.forEach(cluster => {
            cluster.positions.forEach(({row, col}) => {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    // Create cascade particles
                    for (let i = 0; i < 3; i++) {
                        const particle = document.createElement('div');
                        particle.className = 'cascade-particle';
                        particle.style.left = `${Math.random() * 100}%`;
                        particle.style.top = '50%';
                        particle.style.animationDelay = `${i * 0.1}s`;
                        
                        const effect = document.createElement('div');
                        effect.className = 'cascade-effect';
                        effect.appendChild(particle);
                        cell.appendChild(effect);
                        
                        setTimeout(() => effect.remove(), 1000);
                    }
                }
            });
        });
    }
    
    
    updateRTPDisplay() {
        const stats = rtpManager.getSessionStats();
        let rtpDisplay = document.getElementById('rtp-display');
        
        if (!rtpDisplay && stats.spinsCount > 0) {
            rtpDisplay = document.createElement('div');
            rtpDisplay.id = 'rtp-display';
            rtpDisplay.style.cssText = `
                position: absolute;
                bottom: 10px;
                left: 10px;
                font-size: 0.8rem;
                color: #888;
                background: rgba(0,0,0,0.5);
                padding: 5px 10px;
                border-radius: 5px;
            `;
            document.getElementById('game-container').appendChild(rtpDisplay);
        }
        
        if (rtpDisplay && stats.spinsCount > 0) {
            rtpDisplay.innerHTML = `
                RTP: ${stats.currentRTP} | 
                Spins: ${stats.spinsCount}
            `;
        }
    }
    
    showRTPStats() {
        const stats = rtpManager.getSessionStats();
        const modal = document.createElement('div');
        modal.className = 'bonus-buy-modal';
        modal.innerHTML = `
            <h2>Session Statistics</h2>
            <div style="margin-top: 20px;">
                <p><strong>Current RTP:</strong> ${stats.currentRTP}</p>
                <p><strong>Theoretical RTP:</strong> ${stats.theoreticalRTP}</p>
                <p><strong>House Edge:</strong> ${stats.houseEdge}</p>
                <p><strong>Volatility:</strong> ${stats.volatility}</p>
                <hr style="margin: 15px 0;">
                <p><strong>Total Spins:</strong> ${stats.spinsCount}</p>
                <p><strong>Total Bets:</strong> $${stats.totalBets.toFixed(2)}</p>
                <p><strong>Total Wins:</strong> $${stats.totalWins.toFixed(2)}</p>
                <p><strong>Biggest Win:</strong> $${stats.biggestWin.toFixed(2)}</p>
                <p><strong>Free Spins Triggered:</strong> ${stats.freeSpinsTriggered}</p>
            </div>
            <button id="close-rtp-modal" style="margin-top: 20px;">Close</button>
            <button id="reset-rtp-stats" style="margin-top: 20px; margin-left: 10px;">Reset Stats</button>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('close-rtp-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        document.getElementById('reset-rtp-stats').addEventListener('click', () => {
            rtpManager.resetSession();
            this.updateRTPDisplay();
            modal.remove();
            alert('Session statistics reset!');
        });
    }
    
    showPaytable() {
        const paytableContent = document.getElementById('paytable-content');
        let html = '<div class="paytable-grid">';
        
        Object.values(SYMBOLS).forEach(symbol => {
            html += `
                <div class="symbol-row">
                    <div class="symbol-info">
                        <span class="symbol-icon">${symbol.icon}</span>
                        <span class="symbol-name">${symbol.name}</span>
                    </div>
                    <div class="payouts">
            `;
            
            [5, 7, 10, 15].forEach(count => {
                const payout = symbol.paytable[count];
                html += `<span class="payout">×${count}: ${payout}x</span>`;
            });
            
            html += '</div></div>';
        });
        
        html += '</div>';
        paytableContent.innerHTML = html;
    }
    
    handleSpinError() {
        console.log('🚨 Handling spin error - resetting game state');
        this.isSpinning = false;
        this.evaluationDepth = 0; // Reset recursion counter
        this.spinButton.disabled = false;
        
        // Force cleanup of all animations
        this.forceCleanup();
        
        this.updateUI();
        alert('Spin error occurred. Game state has been reset.');
    }
    
    forceCleanup() {
        console.log('🧹 Force cleaning up game state');
        
        // Remove any stuck animations from cells
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('spin-animation', 'winning', 'symbol-remove', 'winning-flash');
            cell.style.transform = '';
            cell.style.filter = '';
            cell.style.transition = '';
            cell.style.zIndex = '';
        });
        
        // Clean up any orphaned animation elements
        if (this.grid && this.grid.animations) {
            this.grid.animations.cleanup();
        }
        
        // Clear any pending timeouts (if we stored them)
        if (this.pendingTimeouts) {
            this.pendingTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
            this.pendingTimeouts = [];
        }
    }
    
    initDeadlockDetection() {
        console.log('🔍 Initializing deadlock detection');
        
        // Check for deadlocks every 10 seconds
        setInterval(() => {
            if (this.isSpinning) {
                const now = Date.now();
                if (!this.lastSpinTime) {
                    this.lastSpinTime = now;
                    return;
                }
                
                // If spinning for more than 30 seconds, force reset
                if (now - this.lastSpinTime > 30000) {
                    console.warn('🚨 Deadlock detected! Forcing game reset...');
                    this.handleDeadlock();
                }
            } else {
                this.lastSpinTime = null;
            }
        }, 10000);
    }
    
    handleDeadlock() {
        console.log('🚨 Handling deadlock situation');
        
        // Force end the spin
        this.isSpinning = false;
        this.evaluationDepth = 0;
        
        // Complete cleanup
        this.forceCleanup();
        
        // Reset UI
        this.updateUI();
        
        // Show warning to user
        alert('Game was stuck and has been reset. You can continue playing.');
        
        // Reset last spin time
        this.lastSpinTime = null;
    }
    
    runAutoTest() {
        console.log('🧪 Starting automated spin test...');
        
        const autoTestButton = document.getElementById('auto-test');
        if (autoTestButton) {
            autoTestButton.disabled = true;
            autoTestButton.textContent = 'Testing...';
        }
        
        let testSpinCount = 0;
        const maxTestSpins = 5;
        let testStartTime = Date.now();
        let testErrors = 0;
        
        const performTestSpin = () => {
            if (testSpinCount >= maxTestSpins) {
                const testDuration = (Date.now() - testStartTime) / 1000;
                console.log(`✅ Auto-test completed: ${maxTestSpins} spins in ${testDuration.toFixed(1)}s, ${testErrors} errors`);
                
                if (autoTestButton) {
                    autoTestButton.disabled = false;
                    autoTestButton.textContent = `Auto Test (5 Spins)`;
                    autoTestButton.style.background = testErrors > 0 ? '#dc3545' : '#28a745';
                }
                
                alert(`Test completed: ${maxTestSpins} spins, ${testErrors} errors`);
                return;
            }
            
            if (this.isSpinning) {
                console.log('⏳ Waiting for current spin to complete...');
                setTimeout(performTestSpin, 1000);
                return;
            }
            
            testSpinCount++;
            console.log(`🎯 Test spin ${testSpinCount}/${maxTestSpins}`);
            
            try {
                this.spin().then(() => {
                    // Wait a bit before next spin to let animations complete
                    setTimeout(performTestSpin, 3000);
                }).catch((error) => {
                    testErrors++;
                    console.error(`❌ Test spin ${testSpinCount} failed:`, error);
                    setTimeout(performTestSpin, 2000);
                });
            } catch (error) {
                testErrors++;
                console.error(`❌ Test spin ${testSpinCount} error:`, error);
                setTimeout(performTestSpin, 2000);
            }
        };
        
        // Start the test
        setTimeout(performTestSpin, 500);
    }
}