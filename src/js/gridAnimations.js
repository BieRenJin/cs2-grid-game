// Improved grid animations with better physics and visual effects

export class GridAnimations {
    constructor(grid) {
        this.grid = grid;
        this.gridElement = document.getElementById('game-grid');
        this.cellSize = this.gridElement.offsetWidth / this.grid.size;
    }
    
    // Animate removal with particle effects
    animateRemoval(clusters) {
        return new Promise(resolve => {
            // First, mark all cells for removal with flash effect
            clusters.forEach(cluster => {
                cluster.positions.forEach(({row, col}) => {
                    const cell = this.getCell(row, col);
                    if (cell) {
                        // Add flash effect before removal
                        cell.style.transition = 'none';
                        cell.style.filter = 'brightness(2)';
                        
                        setTimeout(() => {
                            cell.style.transition = 'all 0.3s ease-out';
                            cell.classList.add('symbol-remove');
                        }, 50);
                    }
                });
            });
            
            // Clear cells after animation
            setTimeout(() => {
                clusters.forEach(cluster => {
                    cluster.positions.forEach(({row, col}) => {
                        const cell = this.getCell(row, col);
                        if (cell) {
                            cell.textContent = '';
                            cell.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                            cell.style.filter = '';
                            cell.classList.remove('symbol-remove', 'winning', 'special-symbol', 'wild-symbol');
                        }
                    });
                });
                resolve();
            }, 300);
        });
    }
    
    // Animate cascade with improved physics
    animateCascade(movements, newSymbols) {
        // Group movements by column for better coordination
        const columnMovements = {};
        movements.forEach(move => {
            if (!columnMovements[move.col]) {
                columnMovements[move.col] = [];
            }
            columnMovements[move.col].push(move);
        });
        
        // Animate each column
        Object.entries(columnMovements).forEach(([col, moves]) => {
            this.animateColumnDrop(parseInt(col), moves);
        });
        
        // Animate new symbols dropping
        setTimeout(() => {
            this.animateNewSymbols(newSymbols);
        }, 200);
    }
    
    // Animate a single column's drops
    animateColumnDrop(col, movements) {
        movements.forEach(({symbol, fromRow, toRow}) => {
            const dropDistance = (toRow - fromRow) * this.cellSize;
            const fallDuration = Math.sqrt(dropDistance / 500) * 0.8; // Physics-based duration
            
            // Create animated element
            const animatedSymbol = this.createAnimatedSymbol(symbol, fromRow, col);
            
            // Clear original cell
            const fromCell = this.getCell(fromRow, col);
            if (fromCell) {
                fromCell.textContent = '';
                fromCell.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }
            
            // Animate with acceleration curve
            requestAnimationFrame(() => {
                animatedSymbol.style.transition = `transform ${fallDuration}s cubic-bezier(0.33, 0, 0.67, 0)`;
                animatedSymbol.style.transform = `translateY(${dropDistance}px)`;
            });
            
            // Handle landing
            setTimeout(() => {
                this.handleLanding(toRow, col, symbol, animatedSymbol);
            }, fallDuration * 1000);
        });
    }
    
    // Animate new symbols falling from above
    animateNewSymbols(newSymbols) {
        newSymbols.forEach(({symbol, row, col, dropDistance}, index) => {
            const totalDistance = this.cellSize * (dropDistance + row + 1);
            const fallDuration = Math.sqrt(totalDistance / 500) * 0.8;
            
            // Create symbol above grid
            const animatedSymbol = this.createAnimatedSymbol(symbol, -dropDistance - 1, col);
            animatedSymbol.style.opacity = '0';
            
            // Stagger the drops
            setTimeout(() => {
                animatedSymbol.style.opacity = '1';
                animatedSymbol.style.transition = `transform ${fallDuration}s cubic-bezier(0.33, 0, 0.67, 0), opacity 0.2s`;
                animatedSymbol.style.transform = `translateY(${totalDistance}px)`;
                
                // Handle landing
                setTimeout(() => {
                    this.handleLanding(row, col, symbol, animatedSymbol);
                }, fallDuration * 1000);
            }, index * 30);
        });
    }
    
    // Create animated symbol element
    createAnimatedSymbol(symbol, row, col) {
        const element = document.createElement('div');
        element.className = 'grid-cell falling-symbol';
        element.textContent = symbol.icon;
        element.style.backgroundColor = symbol.color + '33';
        element.style.position = 'absolute';
        element.style.width = this.cellSize + 'px';
        element.style.height = this.cellSize + 'px';
        element.style.zIndex = '1000';
        
        // Position it
        const x = col * this.cellSize;
        const y = row * this.cellSize;
        element.style.left = x + 'px';
        element.style.top = y + 'px';
        
        this.gridElement.appendChild(element);
        return element;
    }
    
    // Handle landing with impact effect
    handleLanding(row, col, symbol, animatedElement) {
        const cell = this.getCell(row, col);
        if (!cell) return;
        
        // Update cell content
        this.grid.updateCell(row, col, symbol);
        
        // Create dust effect
        this.createDustEffect(row, col);
        
        // Apply squash effect
        cell.style.animation = 'none';
        requestAnimationFrame(() => {
            cell.style.animation = 'landingImpact 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        });
        
        // Remove animated element
        animatedElement.remove();
        
        // Play impact sound if available
        if (window.game && window.game.soundManager) {
            window.game.soundManager.play('cascade');
        }
    }
    
    // Create dust particles on landing
    createDustEffect(row, col) {
        const cell = this.getCell(row, col);
        if (!cell) return;
        
        const cellRect = cell.getBoundingClientRect();
        const containerRect = this.gridElement.getBoundingClientRect();
        
        // Create 3 dust particles
        for (let i = 0; i < 3; i++) {
            const dust = document.createElement('div');
            dust.className = 'dust-particle';
            
            // Random position around the bottom of the cell
            const offsetX = (Math.random() - 0.5) * this.cellSize * 0.5;
            const x = cellRect.left - containerRect.left + this.cellSize / 2 + offsetX;
            const y = cellRect.bottom - containerRect.top - 10;
            
            dust.style.left = x + 'px';
            dust.style.top = y + 'px';
            dust.style.animationDelay = `${i * 0.05}s`;
            
            this.gridElement.appendChild(dust);
            
            // Remove after animation
            setTimeout(() => dust.remove(), 500);
        }
    }
    
    // Helper to get cell element
    getCell(row, col) {
        return document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    }
    
    // Update cell size on resize
    updateCellSize() {
        this.cellSize = this.gridElement.offsetWidth / this.grid.size;
    }
}