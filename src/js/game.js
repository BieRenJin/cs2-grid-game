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
        
        // Add Wild symbol test functionality
        const testWildButton = document.getElementById('test-wild');
        if (testWildButton) {
            testWildButton.addEventListener('click', () => {
                this.testWildSymbols();
            });
        }
        
        // Add Rush symbol test functionality
        const testRushButton = document.getElementById('test-rush');
        if (testRushButton) {
            testRushButton.addEventListener('click', () => {
                this.testRushEffect();
            });
        }
        
        // Add Surge symbol test functionality
        const testSurgeButton = document.getElementById('test-surge');
        if (testSurgeButton) {
            testSurgeButton.addEventListener('click', () => {
                this.testSurgeEffect();
            });
        }
        
        // Add Cascade animation test functionality
        const testCascadeButton = document.getElementById('test-cascade');
        if (testCascadeButton) {
            testCascadeButton.addEventListener('click', () => {
                this.testCascadeAnimations();
            });
        }
        
        // Add specific 2,4,6 test functionality
        const test246Button = document.getElementById('test-246');
        if (test246Button) {
            test246Button.addEventListener('click', () => {
                this.testSpecificCascadeProblem();
            });
        }
        
        // Add RTP test functionality
        const rtpTestButton = document.getElementById('rtp-test');
        if (rtpTestButton) {
            rtpTestButton.addEventListener('click', () => {
                this.runRTPTest();
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
            // Add Ctrl+S to show special symbol statistics
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.showSpecialSymbolStats();
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
        
        console.log(`🌈 Found ${surgeSymbols.length} SURGE symbols - triggering with animation`);
        await this.showSpecialSymbolsActivation(surgeSymbols);
        
        // Apply Surge effects one by one with animation
        // (If multiple Surge symbols, they will animate sequentially)
        for (const {row, col} of surgeSymbols) {
            console.log(`🌈 Applying Surge effect at [${row},${col}] with random cycling animation`);
            await this.grid.specialHandler.applySurgeEffect({row, col});
        }
        
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
    
    // Test Wild symbols functionality  
    testWildSymbols() {
        if (this.isSpinning) {
            console.log('⚠️ Cannot test Wild symbols - spin in progress');
            return;
        }
        
        console.log('🧪 Testing Wild symbols - creating test scenario');
        
        // Create a test scenario with multiple symbol types and strategically placed Wild symbols
        // This will test if one Wild can participate in multiple different clusters
        const testGrid = [
            ['flashbang', 'flashbang', 'wild', 'smoke', 'smoke', 'smoke', 'kevlar'],
            ['flashbang', 'flashbang', 'wild', 'smoke', 'deagle', 'deagle', 'kevlar'],
            ['flashbang', 'wild', 'wild', 'wild', 'deagle', 'deagle', 'kevlar'],
            ['ak47', 'wild', 'hegrenade', 'hegrenade', 'hegrenade', 'deagle', 'kevlar'],
            ['ak47', 'ak47', 'hegrenade', 'hegrenade', 'hegrenade', 'awp', 'kevlar'],
            ['ak47', 'ak47', 'hegrenade', 'defusekit', 'defusekit', 'awp', 'awp'],
            ['flashbang', 'ak47', 'smoke', 'defusekit', 'defusekit', 'awp', 'awp']
        ];
        
        // Apply the test grid to the game
        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 7; col++) {
                const symbolId = testGrid[row][col];
                
                if (symbolId === 'wild') {
                    // Create Wild symbol
                    this.grid.grid[row][col] = {
                        id: 'wild',
                        name: 'Wild',
                        icon: '💠',
                        color: '#FFD700',
                        isWild: true
                    };
                } else {
                    // Find regular symbol
                    const symbol = Object.values(SYMBOLS).find(s => s.id === symbolId);
                    if (symbol) {
                        this.grid.grid[row][col] = symbol;
                    }
                }
            }
        }
        
        // Update the visual grid
        this.grid.updateVisualGrid();
        
        // Test cluster finding
        console.log('🔍 Testing cluster detection with Wild symbols...');
        const clusters = this.grid.findClusters();
        
        console.log(`✅ Found ${clusters.length} clusters in test scenario:`);
        clusters.forEach((cluster, index) => {
            console.log(`   ${index + 1}. ${cluster.symbol.name}: ${cluster.size} symbols`);
        });
        
        // Calculate total wins
        let totalWin = 0;
        clusters.forEach(cluster => {
            const symbol = cluster.symbol;
            const clusterSize = Math.min(cluster.size, 15);
            const basePayout = symbol.paytable[clusterSize] || symbol.paytable[15] || 0;
            const win = basePayout * this.betAmount;
            totalWin += win;
            console.log(`💰 ${symbol.name} cluster (${clusterSize}): $${win.toFixed(2)}`);
        });
        
        console.log(`🎯 Total test win: $${totalWin.toFixed(2)}`);
        
        alert(`Wild Symbol Test Complete!\n\nFound ${clusters.length} clusters\nTotal win: $${totalWin.toFixed(2)}\n\nCheck console for detailed logs.`);
    }
    
    // Show special symbol statistics
    showSpecialSymbolStats() {
        if (!this.grid.specialHandler) {
            alert('Special symbol handler not initialized');
            return;
        }
        
        const stats = this.grid.specialHandler.getStats();
        const message = `Special Symbol Statistics:\n\n` +
            `Total Symbols Generated: ${stats.totalSymbolsGenerated}\n` +
            `Special Symbols Generated: ${stats.specialSymbolsGenerated}\n` +
            `Actual Rate: ${stats.actualRate} (Target: ${stats.targetRate})\n\n` +
            `Breakdown:\n` +
            `⭐ Rush: ${stats.rushCount}\n` +
            `🌈 Surge: ${stats.surgeCount}\n` +
            `🗡️ Slash: ${stats.slashCount}\n\n` +
            `Press Ctrl+S to view again`;
        
        alert(message);
        console.log('📊 Special Symbol Statistics:', stats);
    }
    
    // Run comprehensive RTP test
    async runRTPTest() {
        if (this.isSpinning) {
            alert('Cannot run RTP test while spinning');
            return;
        }
        
        console.log('🧪 Starting RTP Test (1,000,000 spins)...');
        
        const testResults = {
            totalSpins: 1000000, // 1 million spins for accurate RTP
            totalBet: 0,
            totalWin: 0,
            specialSymbolTriggered: 0,
            bigWins: 0, // wins > 10x bet
            hugeWins: 0, // wins > 50x bet
            megaWins: 0, // wins > 100x bet
            deadSpins: 0, // no wins
            maxWin: 0, // biggest single win
            totalEvaluationCycles: 0 // for performance metrics
        };
        
        // Save original balance and bet
        const originalBalance = this.balance;
        const originalBet = this.betAmount;
        
        // Set test balance
        this.balance = 100000; // Large balance for testing
        this.betAmount = 1.00; // Fixed bet for consistent testing
        
        // Show progress dialog
        let cancelled = false;
        const progressDiv = document.createElement('div');
        progressDiv.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: white; border: 2px solid #333; padding: 20px; z-index: 10000; 
            border-radius: 10px; text-align: center; min-width: 350px;
        `;
        progressDiv.innerHTML = `
            <h3>RTP Test Running (1M spins)...</h3>
            <div id="rtp-progress">Spin 0 / ${testResults.totalSpins.toLocaleString()}</div>
            <div id="rtp-current-rtp">Current RTP: 0%</div>
            <div id="rtp-eta">ETA: Calculating...</div>
            <div style="margin-top: 10px;">
                <button id="cancel-rtp-test" style="background: #dc3545; color: white; padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer;">Cancel Test</button>
            </div>
        `;
        document.body.appendChild(progressDiv);
        
        const progressText = document.getElementById('rtp-progress');
        const rtpText = document.getElementById('rtp-current-rtp');
        const etaText = document.getElementById('rtp-eta');
        
        // Cancel button functionality
        document.getElementById('cancel-rtp-test').addEventListener('click', () => {
            cancelled = true;
            progressDiv.remove();
            alert('RTP Test cancelled by user.');
        });
        
        const startTime = Date.now();
        
        // Run test spins
        for (let spinNum = 1; spinNum <= testResults.totalSpins; spinNum++) {
            try {
                // Check if cancelled
                if (cancelled) {
                    break;
                }
                
                // Update progress every 10000 spins (for 1M spins)
                if (spinNum % 10000 === 0 || spinNum === 1) {
                    progressText.textContent = `Spin ${spinNum.toLocaleString()} / ${testResults.totalSpins.toLocaleString()}`;
                    const currentRTP = testResults.totalBet > 0 ? 
                        ((testResults.totalWin / testResults.totalBet) * 100).toFixed(2) : 0;
                    rtpText.textContent = `Current RTP: ${currentRTP}%`;
                    
                    // Calculate ETA
                    const elapsed = Date.now() - startTime;
                    const avgTimePerSpin = elapsed / spinNum;
                    const remainingSpins = testResults.totalSpins - spinNum;
                    const etaMs = remainingSpins * avgTimePerSpin;
                    const etaMinutes = Math.round(etaMs / 60000);
                    etaText.textContent = `ETA: ${etaMinutes} minutes`;
                    
                    // Allow UI to update every 10k spins
                    await new Promise(resolve => setTimeout(resolve, 1));
                }
                
                // No need to reset actual grid for virtual simulation
                this.currentSpinWinAmount = 0;
                
                // Simulate a spin without UI animations (completely pure calculation)
                const spinResult = this.simulateSpinForRTP();
                
                testResults.totalBet += this.betAmount;
                testResults.totalWin += spinResult.totalWin;
                testResults.totalEvaluationCycles += spinResult.evaluationCycles;
                
                // Track max win
                if (spinResult.totalWin > testResults.maxWin) {
                    testResults.maxWin = spinResult.totalWin;
                }
                
                // Categorize wins
                const winMultiplier = spinResult.totalWin / this.betAmount;
                if (spinResult.totalWin === 0) {
                    testResults.deadSpins++;
                } else if (winMultiplier > 100) {
                    testResults.megaWins++;
                } else if (winMultiplier > 50) {
                    testResults.hugeWins++;
                } else if (winMultiplier > 10) {
                    testResults.bigWins++;
                }
                
                if (spinResult.specialSymbolsTriggered > 0) {
                    testResults.specialSymbolTriggered++;
                }
                
            } catch (error) {
                console.error(`Error in spin ${spinNum}:`, error);
            }
        }
        
        // Calculate final results (only if not cancelled)
        if (!cancelled) {
            const actualSpins = testResults.totalBet / this.betAmount; // Actual completed spins
            const finalRTP = testResults.totalBet > 0 ? (testResults.totalWin / testResults.totalBet) * 100 : 0;
            const avgWinPerSpin = testResults.totalWin / actualSpins;
            const winRate = ((actualSpins - testResults.deadSpins) / actualSpins) * 100;
            const avgEvaluationsPerSpin = testResults.totalEvaluationCycles / actualSpins;
            const maxWinMultiplier = testResults.maxWin / this.betAmount;
            
            // Calculate test duration
            const testDuration = (Date.now() - startTime) / 1000; // seconds
            const spinsPerSecond = actualSpins / testDuration;
            
            // Restore original values
            this.balance = originalBalance;
            this.betAmount = originalBet;
            this.updateUI();
            
            // Remove progress dialog
            progressDiv.remove();
            
            // Show results
            const resultsMessage = `RTP Test Results (${actualSpins.toLocaleString()} spins):\n\n` +
                `💰 Final RTP: ${finalRTP.toFixed(3)}% (Target: 97%)\n` +
                `📊 Total Bet: $${testResults.totalBet.toLocaleString()}\n` +
                `💵 Total Win: $${testResults.totalWin.toFixed(2)}\n` +
                `📈 Average Win/Spin: $${avgWinPerSpin.toFixed(4)}\n` +
                `🎯 Win Rate: ${winRate.toFixed(2)}% (spins with wins)\n` +
                `🏆 Max Win: ${maxWinMultiplier.toFixed(1)}x ($${testResults.maxWin.toFixed(2)})\n\n` +
                `Win Categories:\n` +
                `💀 Dead Spins: ${testResults.deadSpins.toLocaleString()} (${((testResults.deadSpins/actualSpins)*100).toFixed(2)}%)\n` +
                `🟢 Big Wins (>10x): ${testResults.bigWins.toLocaleString()}\n` +
                `🟡 Huge Wins (>50x): ${testResults.hugeWins.toLocaleString()}\n` +
                `🔴 Mega Wins (>100x): ${testResults.megaWins.toLocaleString()}\n\n` +
                `⭐ Special Symbols: ${testResults.specialSymbolTriggered.toLocaleString()} spins (${((testResults.specialSymbolTriggered/actualSpins)*100).toFixed(3)}%)\n\n` +
                `⚡ Performance:\n` +
                `⏱️ Test Duration: ${testDuration.toFixed(1)}s\n` +
                `🚀 Speed: ${spinsPerSecond.toFixed(0)} spins/sec\n` +
                `🔄 Avg Evaluations/Spin: ${avgEvaluationsPerSpin.toFixed(2)}`;
            
            alert(resultsMessage);
            console.log('🎯 RTP Test Complete:', testResults, `Final RTP: ${finalRTP.toFixed(3)}%`);
            
            return testResults;
        } else {
            // Test was cancelled
            this.balance = originalBalance;
            this.betAmount = originalBet;
            this.updateUI();
            return null;
        }
    }
    
    // Simulate a single spin for RTP testing (completely without animations/UI)
    simulateSpinForRTP() {
        const result = {
            totalWin: 0,
            clusters: [],
            specialSymbolsTriggered: 0,
            evaluationCycles: 0
        };
        
        // Create a pure virtual grid (no DOM interaction)
        const virtualGrid = this.createVirtualGrid();
        
        // Keep evaluating until no more wins or effects
        let evaluationCount = 0;
        while (evaluationCount < 20) { // Prevent infinite loops
            evaluationCount++;
            result.evaluationCycles = evaluationCount;
            
            // Find clusters and calculate wins
            const clusters = this.findClustersInVirtualGrid(virtualGrid);
            if (clusters && clusters.length > 0) {
                let cycleWin = 0;
                clusters.forEach(cluster => {
                    const symbol = cluster.symbol;
                    const clusterSize = Math.min(cluster.size, 15);
                    const basePayout = symbol.paytable[clusterSize] || symbol.paytable[15] || 0;
                    const adjustedPayout = rtpManager.calculateVolatilityPayout(basePayout, clusterSize);
                    cycleWin += adjustedPayout * this.betAmount;
                });
                
                result.totalWin += cycleWin;
                result.clusters.push(...clusters);
                
                // Remove winning symbols and cascade in virtual grid
                this.cascadeVirtualGrid(virtualGrid, clusters);
            } else {
                // No more wins, check for special effects
                const hasSpecialEffects = this.processSpecialEffectsInVirtualGrid(virtualGrid);
                if (hasSpecialEffects) {
                    result.specialSymbolsTriggered++;
                    continue; // Continue evaluation after special effects
                } else {
                    break; // No wins and no special effects, end evaluation
                }
            }
        }
        
        return result;
    }
    
    // Simulate cascade without animations
    simulateCascadeForRTP(clusters) {
        // Remove winning symbols
        clusters.forEach(cluster => {
            cluster.positions.forEach(pos => {
                this.grid.grid[pos.row][pos.col] = null;
            });
        });
        
        // Cascade and fill with new symbols
        for (let col = 0; col < this.grid.size; col++) {
            const movements = [];
            const newSymbols = [];
            
            // Calculate movements
            let writePos = this.grid.size - 1;
            for (let row = this.grid.size - 1; row >= 0; row--) {
                if (this.grid.grid[row][col] !== null) {
                    if (row !== writePos) {
                        this.grid.grid[writePos][col] = this.grid.grid[row][col];
                        this.grid.grid[row][col] = null;
                    }
                    writePos--;
                }
            }
            
            // Fill empty spaces with new symbols
            for (let row = writePos; row >= 0; row--) {
                let newSymbol;
                if (this.grid.specialHandler.shouldAppearSpecialSymbol()) {
                    newSymbol = this.grid.specialHandler.getRandomSpecialSymbol();
                } else {
                    newSymbol = getRandomSymbol();
                }
                this.grid.grid[row][col] = newSymbol;
            }
        }
    }
    
    // Simulate special effects without animations
    async simulateSpecialEffectsForRTP() {
        // Check for Rush, Surge, Slash effects
        const rushPositions = [];
        const surgePositions = [];
        const slashPositions = [];
        
        for (let row = 0; row < this.grid.size; row++) {
            for (let col = 0; col < this.grid.size; col++) {
                const symbol = this.grid.grid[row][col];
                if (symbol) {
                    if (symbol.id === 'rush') rushPositions.push({row, col});
                    else if (symbol.id === 'surge') surgePositions.push({row, col});
                    else if (symbol.id === 'slash') slashPositions.push({row, col});
                }
            }
        }
        
        // Apply effects in priority order
        if (rushPositions.length > 0) {
            rushPositions.forEach(pos => {
                this.simulateRushEffectForRTP(pos);
            });
            return true;
        }
        
        if (surgePositions.length > 0) {
            surgePositions.forEach(pos => {
                this.simulateSurgeEffectForRTP(pos);
            });
            return true;
        }
        
        if (slashPositions.length > 0) {
            slashPositions.forEach(pos => {
                this.simulateSlashEffectForRTP(pos);
            });
            return true;
        }
        
        return false;
    }
    
    // Simulate Rush effect for RTP testing
    simulateRushEffectForRTP(position) {
        const wildCount = Math.floor(Math.random() * 8) + 4; // 4-11 wilds
        const validPositions = [];
        
        for (let row = 0; row < this.grid.size; row++) {
            for (let col = 0; col < this.grid.size; col++) {
                const currentSymbol = this.grid.grid[row][col];
                if (currentSymbol && !this.grid.specialHandler.isSpecialSymbol(currentSymbol)) {
                    validPositions.push({row, col});
                }
            }
        }
        
        const shuffled = validPositions.sort(() => Math.random() - 0.5);
        const selectedPositions = shuffled.slice(0, Math.min(wildCount, shuffled.length));
        
        // Transform Rush to Wild
        this.grid.grid[position.row][position.col] = {
            id: 'wild', name: 'Wild', icon: '💠', color: '#FFD700', isWild: true
        };
        
        // Place Wild symbols
        selectedPositions.forEach(pos => {
            this.grid.grid[pos.row][pos.col] = {
                id: 'wild', name: 'Wild', icon: '💠', color: '#FFD700', isWild: true
            };
        });
    }
    
    // Simulate Surge effect for RTP testing
    simulateSurgeEffectForRTP(position) {
        const availableSymbols = [
            SYMBOLS.FLASHBANG, SYMBOLS.SMOKE, SYMBOLS.HE_GRENADE, SYMBOLS.KEVLAR,
            SYMBOLS.DEFUSE_KIT, SYMBOLS.DEAGLE, SYMBOLS.AK47, SYMBOLS.AWP
        ];
        const targetSymbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
        
        // Transform Surge symbol itself
        this.grid.grid[position.row][position.col] = targetSymbol;
        
        // Transform adjacent symbols
        const adjacentPositions = this.grid.specialHandler.getAdjacentPositions(position.row, position.col);
        adjacentPositions.forEach(pos => {
            const currentSymbol = this.grid.grid[pos.row][pos.col];
            if (currentSymbol && !this.grid.specialHandler.isSpecialSymbol(currentSymbol)) {
                this.grid.grid[pos.row][pos.col] = targetSymbol;
            }
        });
    }
    
    // Simulate Slash effect for RTP testing
    simulateSlashEffectForRTP(position) {
        const {row, col} = position;
        
        // Remove the slash symbol itself
        this.grid.grid[row][col] = null;
        
        // Remove entire row
        for (let c = 0; c < this.grid.size; c++) {
            if (c !== col) {
                this.grid.grid[row][c] = null;
            }
        }
        
        // Remove entire column  
        for (let r = 0; r < this.grid.size; r++) {
            if (r !== row) {
                this.grid.grid[r][col] = null;
            }
        }
        
        // Cascade after removal
        this.simulateCascadeForRTP([]);
    }
    
    // Create virtual grid for pure calculation (no DOM)
    createVirtualGrid() {
        const virtualGrid = Array(7).fill(null).map(() => Array(7).fill(null));
        let goldenSymbolPlaced = false;
        
        // Fill grid with symbols
        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 7; col++) {
                let newSymbol;
                
                // Check for special symbol (using same probability logic)
                if (Math.random() < 0.012) { // 1.2% chance
                    const specialWeights = [
                        { symbol: 'rush', weight: 40 },
                        { symbol: 'surge', weight: 30 },
                        { symbol: 'slash', weight: 30 }
                    ];
                    
                    const totalWeight = specialWeights.reduce((sum, item) => sum + item.weight, 0);
                    let random = Math.random() * totalWeight;
                    
                    for (const item of specialWeights) {
                        random -= item.weight;
                        if (random <= 0) {
                            newSymbol = SPECIAL_SYMBOLS[item.symbol.toUpperCase()];
                            break;
                        }
                    }
                    
                    // Check golden symbol restriction
                    const isGoldenSymbol = newSymbol.id === 'rush' || newSymbol.id === 'multiplier';
                    if (isGoldenSymbol && goldenSymbolPlaced) {
                        newSymbol = this.getRandomRegularSymbol();
                    } else if (isGoldenSymbol) {
                        goldenSymbolPlaced = true;
                    }
                } else {
                    newSymbol = this.getRandomRegularSymbol();
                }
                
                virtualGrid[row][col] = newSymbol;
            }
        }
        
        return virtualGrid;
    }
    
    // Get random regular symbol based on weights
    getRandomRegularSymbol() {
        const weights = [
            { symbol: SYMBOLS.FLASHBANG, weight: 20 },
            { symbol: SYMBOLS.SMOKE, weight: 20 },
            { symbol: SYMBOLS.HE_GRENADE, weight: 18 },
            { symbol: SYMBOLS.KEVLAR, weight: 15 },
            { symbol: SYMBOLS.DEFUSE_KIT, weight: 12 },
            { symbol: SYMBOLS.DEAGLE, weight: 8 },
            { symbol: SYMBOLS.AK47, weight: 5 },
            { symbol: SYMBOLS.AWP, weight: 2 }
        ];
        
        const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const item of weights) {
            random -= item.weight;
            if (random <= 0) {
                return item.symbol;
            }
        }
        
        return weights[0].symbol; // Fallback
    }
    
    // Find clusters in virtual grid (pure calculation)
    findClustersInVirtualGrid(virtualGrid) {
        const clusters = [];
        
        // Find clusters for each regular symbol type separately
        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 7; col++) {
                if (virtualGrid[row] && virtualGrid[row][col]) {
                    const currentSymbol = virtualGrid[row][col];
                    
                    // Only use regular symbols as starting points
                    if (currentSymbol.isWild || this.isSpecialSymbolId(currentSymbol.id)) {
                        continue;
                    }
                    
                    // Create fresh visited array for each starting symbol
                    const visited = Array(7).fill(null).map(() => Array(7).fill(false));
                    
                    // Use DFS with wilds
                    const cluster = this.dfsVirtualGrid(virtualGrid, row, col, currentSymbol.id, visited);
                    if (cluster && cluster.length >= 5) {
                        // Check for overlapping clusters of same type
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
    
    // DFS for virtual grid
    dfsVirtualGrid(virtualGrid, row, col, symbolId, visited) {
        if (row < 0 || row >= 7 || col < 0 || col >= 7 || visited[row][col]) {
            return [];
        }
        
        const currentSymbol = virtualGrid[row][col];
        // Only match exact symbolId or Wild symbols, exclude special symbols
        if (!currentSymbol || 
            (currentSymbol.id !== symbolId && !currentSymbol.isWild) ||
            (currentSymbol.id !== symbolId && this.isSpecialSymbolId(currentSymbol.id))) {
            return [];
        }
        
        visited[row][col] = true;
        const positions = [{row, col}];
        
        // Check all 4 directions
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dr, dc] of directions) {
            positions.push(...this.dfsVirtualGrid(virtualGrid, row + dr, col + dc, symbolId, visited));
        }
        
        return positions;
    }
    
    // Cascade virtual grid after removing clusters
    cascadeVirtualGrid(virtualGrid, clusters) {
        // Remove winning symbols
        clusters.forEach(cluster => {
            cluster.positions.forEach(pos => {
                virtualGrid[pos.row][pos.col] = null;
            });
        });
        
        // Cascade and fill
        for (let col = 0; col < 7; col++) {
            // Move existing symbols down
            let writePos = 6; // Bottom row
            for (let row = 6; row >= 0; row--) {
                if (virtualGrid[row][col] !== null) {
                    if (row !== writePos) {
                        virtualGrid[writePos][col] = virtualGrid[row][col];
                        virtualGrid[row][col] = null;
                    }
                    writePos--;
                }
            }
            
            // Fill empty spaces with new symbols
            for (let row = writePos; row >= 0; row--) {
                let newSymbol;
                if (Math.random() < 0.012) { // 1.2% special symbol chance
                    const specialWeights = [
                        { symbol: 'rush', weight: 40 },
                        { symbol: 'surge', weight: 30 },
                        { symbol: 'slash', weight: 30 }
                    ];
                    
                    const totalWeight = specialWeights.reduce((sum, item) => sum + item.weight, 0);
                    let random = Math.random() * totalWeight;
                    
                    for (const item of specialWeights) {
                        random -= item.weight;
                        if (random <= 0) {
                            newSymbol = SPECIAL_SYMBOLS[item.symbol.toUpperCase()];
                            break;
                        }
                    }
                } else {
                    newSymbol = this.getRandomRegularSymbol();
                }
                
                virtualGrid[row][col] = newSymbol;
            }
        }
    }
    
    // Process special effects in virtual grid
    processSpecialEffectsInVirtualGrid(virtualGrid) {
        const rushPositions = [];
        const surgePositions = [];
        const slashPositions = [];
        
        // Find special symbols
        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 7; col++) {
                const symbol = virtualGrid[row][col];
                if (symbol) {
                    if (symbol.id === 'rush') rushPositions.push({row, col});
                    else if (symbol.id === 'surge') surgePositions.push({row, col});
                    else if (symbol.id === 'slash') slashPositions.push({row, col});
                }
            }
        }
        
        // Apply effects in priority order
        if (rushPositions.length > 0) {
            rushPositions.forEach(pos => {
                this.applyRushEffectVirtual(virtualGrid, pos);
            });
            return true;
        }
        
        if (surgePositions.length > 0) {
            surgePositions.forEach(pos => {
                this.applySurgeEffectVirtual(virtualGrid, pos);
            });
            return true;
        }
        
        if (slashPositions.length > 0) {
            slashPositions.forEach(pos => {
                this.applySlashEffectVirtual(virtualGrid, pos);
            });
            return true;
        }
        
        return false;
    }
    
    // Apply Rush effect in virtual grid
    applyRushEffectVirtual(virtualGrid, position) {
        const wildCount = Math.floor(Math.random() * 8) + 4; // 4-11 wilds
        const validPositions = [];
        
        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 7; col++) {
                const currentSymbol = virtualGrid[row][col];
                if (currentSymbol && !this.isSpecialSymbolId(currentSymbol.id)) {
                    validPositions.push({row, col});
                }
            }
        }
        
        const shuffled = validPositions.sort(() => Math.random() - 0.5);
        const selectedPositions = shuffled.slice(0, Math.min(wildCount, shuffled.length));
        
        // Transform Rush to Wild
        virtualGrid[position.row][position.col] = {
            id: 'wild', name: 'Wild', icon: '💠', color: '#FFD700', isWild: true
        };
        
        // Place Wild symbols
        selectedPositions.forEach(pos => {
            virtualGrid[pos.row][pos.col] = {
                id: 'wild', name: 'Wild', icon: '💠', color: '#FFD700', isWild: true
            };
        });
    }
    
    // Apply Surge effect in virtual grid
    applySurgeEffectVirtual(virtualGrid, position) {
        const availableSymbols = [
            SYMBOLS.FLASHBANG, SYMBOLS.SMOKE, SYMBOLS.HE_GRENADE, SYMBOLS.KEVLAR,
            SYMBOLS.DEFUSE_KIT, SYMBOLS.DEAGLE, SYMBOLS.AK47, SYMBOLS.AWP
        ];
        const targetSymbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
        
        // Transform Surge symbol itself
        virtualGrid[position.row][position.col] = targetSymbol;
        
        // Transform adjacent symbols
        const adjacentPositions = this.getAdjacentPositionsVirtual(position.row, position.col);
        adjacentPositions.forEach(pos => {
            const currentSymbol = virtualGrid[pos.row][pos.col];
            if (currentSymbol && !this.isSpecialSymbolId(currentSymbol.id)) {
                virtualGrid[pos.row][pos.col] = targetSymbol;
            }
        });
    }
    
    // Apply Slash effect in virtual grid  
    applySlashEffectVirtual(virtualGrid, position) {
        const {row, col} = position;
        
        // Remove the slash symbol itself
        virtualGrid[row][col] = null;
        
        // Remove entire row
        for (let c = 0; c < 7; c++) {
            if (c !== col) {
                virtualGrid[row][c] = null;
            }
        }
        
        // Remove entire column
        for (let r = 0; r < 7; r++) {
            if (r !== row) {
                virtualGrid[r][col] = null;
            }
        }
        
        // Cascade after removal
        this.cascadeVirtualGrid(virtualGrid, []);
    }
    
    // Get adjacent positions (8 directions)
    getAdjacentPositionsVirtual(row, col) {
        const positions = [];
        const directions = [
            [-1, 0], [-1, 1], [0, 1], [1, 1],
            [1, 0], [1, -1], [0, -1], [-1, -1]
        ];
        
        directions.forEach(([dr, dc]) => {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= 0 && newRow < 7 && newCol >= 0 && newCol < 7) {
                positions.push({row: newRow, col: newCol});
            }
        });
        
        return positions;
    }
    
    // Helper to check if symbol ID is special
    isSpecialSymbolId(id) {
        return ['rush', 'surge', 'slash', 'scatter', 'multiplier'].includes(id);
    }
    
    // Test Surge effect to verify random animation
    async testSurgeEffect() {
        if (this.isSpinning) {
            console.log('⚠️ Cannot test Surge effect - spin in progress');
            return;
        }
        
        console.log('🧪 Testing Surge effect - Random cycling animation');
        
        // Place a Surge symbol in the center of the grid
        const centerRow = Math.floor(this.grid.size / 2);
        const centerCol = Math.floor(this.grid.size / 2);
        
        // Place Surge symbol
        this.grid.grid[centerRow][centerCol] = SPECIAL_SYMBOLS.SURGE;
        this.grid.updateCell(centerRow, centerCol, SPECIAL_SYMBOLS.SURGE);
        
        // Wait a moment for visual feedback
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Apply Surge effect with animation
        console.log(`🌈 Applying Surge effect at [${centerRow},${centerCol}]`);
        await this.grid.specialHandler.applySurgeEffect({row: centerRow, col: centerCol});
        
        console.log('✅ Surge effect test complete');
    }
    
    // Test Rush effect to verify non-adjacent Wild placement
    testRushEffect() {
        if (this.isSpinning) {
            console.log('⚠️ Cannot test Rush effect - spin in progress');
            return;
        }
        
        console.log('🧪 Testing Rush effect - Non-adjacent Wild placement');
        
        if (!this.grid.specialHandler) {
            alert('Special symbol handler not initialized');
            return;
        }
        
        // Test with different wild counts
        const testCounts = [4, 6, 8, 11];
        let allTestsPassed = true;
        
        testCounts.forEach(count => {
            console.log(`\n🎯 Testing with ${count} wilds...`);
            const result = this.grid.specialHandler.testNonAdjacentWilds(count);
            
            if (!result.success) {
                allTestsPassed = false;
            }
            
            console.log(`Result: ${result.actualCount}/${result.requestedCount} wilds placed, Success: ${result.success ? '✅' : '❌'}`);
        });
        
        // Visual test - actually place wilds on the grid
        console.log('\n🎨 Visual test - placing 8 non-adjacent wilds on current grid...');
        const visualResult = this.grid.specialHandler.testNonAdjacentWilds(8);
        
        if (visualResult.success && visualResult.positions.length > 0) {
            // Actually place the wilds on the grid for visual verification
            visualResult.positions.forEach(({row, col}) => {
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
            
            alert(`Rush Effect Test Complete!\n\nAll tests passed: ${allTestsPassed ? 'YES' : 'NO'}\n\nVisual test: ${visualResult.actualCount} non-adjacent wilds placed on grid.\n\nCheck console for detailed logs.`);
        } else {
            alert(`Rush Effect Test Failed!\n\nCould not place non-adjacent wilds.\nActual: ${visualResult.actualCount}, Requested: 8\n\nCheck console for details.`);
        }
    }
    
    // Comprehensive cascade animation test - simulates all possible elimination scenarios
    async testCascadeAnimations() {
        if (this.isSpinning) {
            console.log('⚠️ Cannot test cascade animations - spin in progress');
            return;
        }
        
        console.log('🎬 Starting comprehensive cascade animation test...');
        
        // Define test scenarios covering all possible elimination patterns
        const testScenarios = [
            {
                name: "Single bottom elimination",
                description: "One cell eliminated at bottom of column",
                eliminations: [[6, 0]] // [row, col]
            },
            {
                name: "Single top elimination", 
                description: "One cell eliminated at top of column",
                eliminations: [[0, 1]]
            },
            {
                name: "Single middle elimination",
                description: "One cell eliminated in middle of column",
                eliminations: [[3, 2]]
            },
            {
                name: "Multiple continuous elimination",
                description: "Multiple adjacent cells eliminated",
                eliminations: [[4, 3], [5, 3], [6, 3]]
            },
            {
                name: "Multiple non-continuous elimination",
                description: "Multiple non-adjacent cells eliminated (the problematic case)",
                eliminations: [[1, 4], [3, 4], [5, 4]]
            },
            {
                name: "Top and bottom elimination",
                description: "Cells at both ends of column eliminated",
                eliminations: [[0, 5], [6, 5]]
            },
            {
                name: "Complex pattern",
                description: "Complex mix of eliminations",
                eliminations: [[1, 6], [2, 6], [4, 6], [6, 6]]
            },
            {
                name: "Almost entire column",
                description: "Most of column eliminated",
                eliminations: [[0, 0], [1, 0], [2, 0], [4, 0], [5, 0], [6, 0]]
            },
            {
                name: "Multi-column scenario",
                description: "Multiple columns with different patterns",
                eliminations: [
                    [1, 1], [3, 1], [5, 1], // Column 1: non-continuous
                    [4, 2], [5, 2], [6, 2], // Column 2: continuous bottom
                    [0, 3], [6, 3]          // Column 3: top and bottom
                ]
            }
        ];
        
        let testIndex = 0;
        let passedTests = 0;
        
        for (const scenario of testScenarios) {
            testIndex++;
            console.log(`\n🎯 Test ${testIndex}/${testScenarios.length}: ${scenario.name}`);
            console.log(`📝 ${scenario.description}`);
            console.log(`🎪 Eliminations: ${scenario.eliminations.map(([r,c]) => `[${r},${c}]`).join(', ')}`);
            
            try {
                // Create a fresh test grid
                this.setupTestGrid();
                
                // Wait a bit for grid to stabilize
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Create fake clusters for the test eliminations
                const testClusters = [{
                    symbol: { name: 'Test Elimination', id: 'test-elimination' },
                    positions: scenario.eliminations.map(([row, col]) => ({row, col})),
                    size: scenario.eliminations.length
                }];
                
                // Test the cascade animation
                console.log(`🎬 Starting cascade animation for test ${testIndex}...`);
                const testStartTime = Date.now();
                
                await this.grid.removeWinningSymbols(testClusters);
                
                const testDuration = Date.now() - testStartTime;
                console.log(`⏱️ Test ${testIndex} completed in ${testDuration}ms`);
                
                // Verify grid state after cascade
                const verificationResult = this.verifyGridAfterCascade(scenario.eliminations);
                
                if (verificationResult.success) {
                    console.log(`✅ Test ${testIndex} PASSED: ${scenario.name}`);
                    passedTests++;
                } else {
                    console.error(`❌ Test ${testIndex} FAILED: ${scenario.name}`);
                    console.error(`❌ Issues found: ${verificationResult.issues.join(', ')}`);
                }
                
                // Wait between tests to see animations clearly
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`💥 Test ${testIndex} ERROR: ${scenario.name}`, error);
            }
        }
        
        // Show final results
        const allTestsPassed = passedTests === testScenarios.length;
        const resultMessage = `Cascade Animation Test Complete!\n\nPassed: ${passedTests}/${testScenarios.length}\nSuccess Rate: ${((passedTests/testScenarios.length)*100).toFixed(1)}%\n\nStatus: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}\n\nCheck console for detailed logs.`;
        
        console.log(`\n🏁 Final Results: ${passedTests}/${testScenarios.length} tests passed`);
        alert(resultMessage);
        
        return {
            totalTests: testScenarios.length,
            passedTests: passedTests,
            allPassed: allTestsPassed
        };
    }
    
    // Setup a controlled test grid with known symbols
    setupTestGrid() {
        console.log('🎭 Setting up test grid with known symbols...');
        
        // Fill grid with predictable symbols for testing
        const testSymbols = [
            SYMBOLS.FLASHBANG,  // Most common
            SYMBOLS.SMOKE,      // Second most common
            SYMBOLS.HE_GRENADE, // Third
            SYMBOLS.KEVLAR      // Fourth
        ];
        
        for (let row = 0; row < this.grid.size; row++) {
            for (let col = 0; col < this.grid.size; col++) {
                // Use modular pattern for predictability
                const symbolIndex = (row + col) % testSymbols.length;
                const symbol = testSymbols[symbolIndex];
                
                this.grid.grid[row][col] = symbol;
                this.grid.updateCell(row, col, symbol);
            }
        }
        
        console.log('✅ Test grid setup complete');
    }
    
    // Verify grid state after cascade to ensure no gaps or errors
    verifyGridAfterCascade(originalEliminations) {
        console.log('🔍 Verifying grid state after cascade...');
        
        const issues = [];
        let success = true;
        
        // Check 1: No empty cells should exist (no nulls in grid)
        for (let row = 0; row < this.grid.size; row++) {
            for (let col = 0; col < this.grid.size; col++) {
                if (this.grid.grid[row][col] === null) {
                    issues.push(`Empty cell found at [${row},${col}]`);
                    success = false;
                }
            }
        }
        
        // Check 2: No gaps in columns (symbols should be at bottom)
        for (let col = 0; col < this.grid.size; col++) {
            let foundEmpty = false;
            for (let row = this.grid.size - 1; row >= 0; row--) {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                const hasContent = cell && cell.innerHTML.trim() !== '';
                const hasGridData = this.grid.grid[row][col] !== null;
                
                if (!hasContent || !hasGridData) {
                    foundEmpty = true;
                } else if (foundEmpty) {
                    issues.push(`Gap found in column ${col}: symbol at row ${row} with empty space below`);
                    success = false;
                    break;
                }
            }
        }
        
        // Check 3: DOM and grid data consistency
        for (let row = 0; row < this.grid.size; row++) {
            for (let col = 0; col < this.grid.size; col++) {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                const gridSymbol = this.grid.grid[row][col];
                
                if (!cell) {
                    issues.push(`DOM cell missing at [${row},${col}]`);
                    success = false;
                    continue;
                }
                
                const hasContent = cell.innerHTML.trim() !== '';
                const hasGridData = gridSymbol !== null;
                
                if (hasContent !== hasGridData) {
                    issues.push(`Mismatch at [${row},${col}]: DOM=${hasContent}, Grid=${hasGridData}`);
                    success = false;
                }
                
                // Check for question marks (error symbols)
                if (cell.innerHTML.includes('❓')) {
                    issues.push(`Question mark found at [${row},${col}] - error symbol detected`);
                    success = false;
                }
            }
        }
        
        if (success) {
            console.log('✅ Grid verification passed - no issues found');
        } else {
            console.error(`❌ Grid verification failed - ${issues.length} issues found`);
            issues.forEach(issue => console.error(`  - ${issue}`));
        }
        
        return {
            success: success,
            issues: issues
        };
    }
    
    // Specific test for the [2,4,6] elimination problem
    async testSpecificCascadeProblem() {
        if (this.isSpinning) {
            console.log('⚠️ Cannot test - spin in progress');
            return;
        }
        
        console.log('🎯 Testing specific problem: eliminate [2,4,6] in column 0');
        
        // Setup test grid
        this.setupTestGrid();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Create test elimination for rows 2,4,6 in column 0
        const problemEliminations = [[2, 0], [4, 0], [6, 0]];
        
        console.log('📋 Before elimination - Column 0 state:');
        for (let row = 0; row < 7; row++) {
            const cell = document.querySelector(`[data-row="${row}"][data-col="0"]`);
            const symbol = this.grid.grid[row][0];
            console.log(`  Row ${row}: ${symbol ? symbol.name : 'NULL'}, Cell has content: ${cell && cell.innerHTML.trim() !== ''}, BG: ${cell ? cell.style.backgroundColor : 'none'}`);
        }
        
        // Create fake clusters for test
        const testClusters = [{
            symbol: { name: 'Test Problem', id: 'test-problem' },
            positions: problemEliminations.map(([row, col]) => ({row, col})),
            size: problemEliminations.length
        }];
        
        console.log('🎬 Starting elimination and cascade...');
        await this.grid.removeWinningSymbols(testClusters);
        
        // Wait for animations to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('📋 After cascade - Column 0 state:');
        let problemFound = false;
        for (let row = 0; row < 7; row++) {
            const cell = document.querySelector(`[data-row="${row}"][data-col="0"]`);
            const symbol = this.grid.grid[row][0];
            const hasContent = cell && cell.innerHTML.trim() !== '';
            const bgColor = cell ? cell.style.backgroundColor : 'none';
            
            console.log(`  Row ${row}: ${symbol ? symbol.name : 'NULL'}, Cell has content: ${hasContent}, BG: ${bgColor}`);
            
            // Check for the specific problem: no content but has background
            if (!hasContent && bgColor && bgColor !== 'transparent' && bgColor !== 'none' && bgColor !== '') {
                console.error(`❌ PROBLEM FOUND at row ${row}: No content but has background: ${bgColor}`);
                problemFound = true;
            }
        }
        
        if (problemFound) {
            alert('❌ Problem reproduced! Found cells with background but no content.\nCheck console for details.');
        } else {
            alert('✅ No problem found. All cells correctly handled.');
        }
        
        return !problemFound;
    }
}