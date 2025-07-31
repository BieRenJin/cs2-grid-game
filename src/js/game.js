import { GameGrid } from './grid.js';
import { SYMBOLS, SPECIAL_SYMBOLS } from './symbols.js';
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
        
        // Paytable modal
        const paytableButton = document.getElementById('toggle-paytable');
        const modal = document.getElementById('paytable-modal');
        const closeModal = modal.querySelector('.close');
        
        paytableButton.addEventListener('click', () => {
            this.showPaytable();
            modal.classList.remove('hidden');
            modal.classList.add('show');
        });
        
        // Add keyboard shortcut for RTP stats (Ctrl+R)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.showRTPStats();
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
            
            // Disable spin if insufficient balance
            this.spinButton.disabled = this.isSpinning || this.balance < this.betAmount;
            
            // Update RTP display if exists
            this.updateRTPDisplay();
        } catch (error) {
            console.error('Error updating UI:', error);
        }
    }
    
    async spin() {
        if (this.isSpinning || this.balance < this.betAmount) return;
        
        this.isSpinning = true;
        this.spinButton.disabled = true;
        
        // Deduct bet from balance
        if (this.freeSpinsRemaining === 0) {
            this.balance -= this.betAmount;
            this.updateUI();
        }
        
        // Reset win amount
        this.winAmountElement.textContent = '0.00';
        
        // Play spin sound
        this.soundManager.play('spin');
        
        // Add spin animation to cells
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.add('spin-animation');
        });
        
        // Perform the spin
        this.grid.spin().then(() => {
            // Remove spin animation
            document.querySelectorAll('.grid-cell').forEach(cell => {
                cell.classList.remove('spin-animation');
            });
            this.evaluateSpin();
        });
    }
    
    async evaluateSpin() {
        try {
            // First check for scatters
            const scattersTriggered = this.freeSpinsManager.checkForScatters();
            if (scattersTriggered) {
                this.soundManager.play('scatter');
            }
            
            const clusters = this.grid.findClusters();
            let totalWin = 0;
        
        if (clusters.length > 0) {
            // Calculate winnings
            clusters.forEach(cluster => {
                const symbol = cluster.symbol;
                const clusterSize = Math.min(cluster.size, 15);
                const basePayout = symbol.paytable[clusterSize] || symbol.paytable[15];
                const adjustedPayout = rtpManager.calculateVolatilityPayout(basePayout, clusterSize);
                totalWin += adjustedPayout * this.betAmount;
            });
            
            // Apply progressive multiplier in free spins
            if (this.freeSpinsRemaining > 0) {
                totalWin *= this.progressiveMultiplier;
                if (!this.isSuperFreeSpins) {
                    this.progressiveMultiplier++;
                }
            }
            
            // Apply multiplier symbols if in free spins
            if (this.freeSpinsRemaining > 0) {
                const symbolMultiplier = this.freeSpinsManager.calculateTotalMultiplier();
                totalWin *= symbolMultiplier;
            }
            
            // Highlight winning clusters
            this.grid.highlightWinningClusters(clusters);
            
            // Update balance and show win
            this.balance += totalWin;
            this.winAmountElement.textContent = totalWin.toFixed(2);
            
            // Play win sound
            this.soundManager.playWinSound(totalWin, this.betAmount);
            
            // Add win celebration animation
            this.winAmountElement.parentElement.classList.add('win-celebration');
            setTimeout(() => {
                this.winAmountElement.parentElement.classList.remove('win-celebration');
            }, 500);
            
            // Cascade and check for additional wins
            setTimeout(async () => {
                this.soundManager.play('cascade');
                this.addCascadeEffect(clusters);
                await this.grid.removeWinningSymbols(clusters);
                setTimeout(() => {
                    this.evaluateSpin(); // Check for cascading wins
                }, 600); // Reduced delay since animations are better coordinated
            }, 1000);
        } else {
            // No wins, check if scatters triggered free spins
            if (!scattersTriggered) {
                this.endSpin();
            }
        }
        
        this.updateUI();
        } catch (error) {
            console.error('Error during spin evaluation:', error);
            this.endSpin();
        }
    }
    
    endSpin() {
        this.isSpinning = false;
        
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
        
        // Update RTP statistics
        const winAmount = parseFloat(this.winAmountElement.textContent) || 0;
        rtpManager.updateStats(this.betAmount, winAmount);
        
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
}