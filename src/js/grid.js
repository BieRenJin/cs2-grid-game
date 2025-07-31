import { getRandomSymbol, SPECIAL_SYMBOLS } from './symbols.js';
import { SpecialSymbolHandler } from './specialSymbols.js';

export class GameGrid {
    constructor(size = 7) {
        this.size = size;
        this.grid = [];
        this.specialHandler = new SpecialSymbolHandler(this);
        this.initGrid();
    }
    
    initGrid() {
        const gridElement = document.getElementById('game-grid');
        gridElement.innerHTML = '';
        this.grid = [];
        
        for (let row = 0; row < this.size; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.size; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                gridElement.appendChild(cell);
                
                const symbol = getRandomSymbol();
                this.grid[row][col] = symbol;
                this.updateCell(row, col, symbol);
            }
        }
    }
    
    updateCell(row, col, symbol) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            cell.textContent = symbol.icon;
            cell.style.backgroundColor = symbol.color + '33'; // Add transparency
            cell.dataset.symbolId = symbol.id;
            
            // Add special styling for special symbols
            cell.classList.remove('special-symbol', 'wild-symbol');
            if (Object.values(SPECIAL_SYMBOLS).some(s => s.id === symbol.id)) {
                cell.classList.add('special-symbol');
            }
            if (symbol.isWild) {
                cell.classList.add('wild-symbol');
            }
        }
    }
    
    spin() {
        // Animate the spin
        const cells = document.querySelectorAll('.grid-cell');
        const specialSymbolPositions = [];
        
        cells.forEach((cell, index) => {
            setTimeout(() => {
                cell.style.transform = 'rotateY(360deg)';
                setTimeout(() => {
                    const row = Math.floor(index / this.size);
                    const col = index % this.size;
                    
                    // Check if special symbol should appear
                    let newSymbol;
                    
                    // Check for boost features
                    const game = window.game; // Access game instance
                    let scatterChance = 0.005; // Base 0.5% chance
                    
                    if (game && game.bonusBoostActive) {
                        scatterChance *= 2; // Double chance
                    }
                    if (game && game.superBoostActive) {
                        scatterChance = 0.05; // Guaranteed 1 in 20
                    }
                    
                    // Include scatter in symbol generation during boosts or free spins
                    const includeScatter = Math.random() < scatterChance || (game && game.freeSpinsRemaining > 0);
                    
                    if (this.specialHandler.shouldAppearSpecialSymbol()) {
                        newSymbol = this.specialHandler.getRandomSpecialSymbol();
                        specialSymbolPositions.push({row, col, symbol: newSymbol});
                    } else {
                        newSymbol = getRandomSymbol(includeScatter);
                        if (newSymbol.id === 'scatter') {
                            specialSymbolPositions.push({row, col, symbol: newSymbol});
                        }
                    }
                    
                    this.grid[row][col] = newSymbol;
                    this.updateCell(row, col, newSymbol);
                    cell.style.transform = 'rotateY(0deg)';
                }, 250);
            }, index * 20);
        });
        
        // Check for wins after animation completes
        setTimeout(() => {
            // Apply special symbol effects
            this.applySpecialSymbolEffects(specialSymbolPositions);
            
            const clusters = this.findClusters();
            return clusters;
        }, cells.length * 20 + 500);
    }
    
    findClusters() {
        const visited = Array(this.size).fill(null).map(() => Array(this.size).fill(false));
        const clusters = [];
        
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (!visited[row][col]) {
                    const cluster = this.dfs(row, col, this.grid[row][col].id, visited);
                    if (cluster.length >= 5) {
                        clusters.push({
                            symbol: this.grid[row][col],
                            positions: cluster,
                            size: cluster.length
                        });
                    }
                }
            }
        }
        
        return clusters;
    }
    
    dfs(row, col, symbolId, visited) {
        if (row < 0 || row >= this.size || col < 0 || col >= this.size ||
            visited[row][col] || this.grid[row][col].id !== symbolId) {
            return [];
        }
        
        visited[row][col] = true;
        const positions = [{row, col}];
        
        // Check all 4 directions
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dr, dc] of directions) {
            positions.push(...this.dfs(row + dr, col + dc, symbolId, visited));
        }
        
        return positions;
    }
    
    highlightWinningClusters(clusters) {
        // Clear previous highlights
        document.querySelectorAll('.grid-cell.winning').forEach(cell => {
            cell.classList.remove('winning');
        });
        
        // Highlight winning clusters
        clusters.forEach(cluster => {
            cluster.positions.forEach(({row, col}) => {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    cell.classList.add('winning');
                }
            });
        });
    }
    
    removeWinningSymbols(clusters) {
        // First animate the removal of winning symbols
        clusters.forEach(cluster => {
            cluster.positions.forEach(({row, col}) => {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    cell.classList.add('symbol-remove');
                }
            });
        });
        
        // After removal animation, clear the symbols and cascade
        setTimeout(() => {
            const columnsToFill = new Set();
            
            clusters.forEach(cluster => {
                cluster.positions.forEach(({row, col}) => {
                    this.grid[row][col] = null;
                    columnsToFill.add(col);
                    
                    // Clear the cell visually
                    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    if (cell) {
                        cell.textContent = '';
                        cell.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        cell.classList.remove('symbol-remove', 'winning');
                    }
                });
            });
            
            // Cascade symbols down with staggered timing for each column
            let delay = 0;
            columnsToFill.forEach(col => {
                setTimeout(() => {
                    this.cascadeColumn(col);
                }, delay);
                delay += 80; // Increased stagger for more dramatic effect
            });
        }, 400); // Wait longer for removal animation
    }
    
    cascadeColumn(col) {
        const movements = [];
        const newSymbols = [];
        
        // Track which symbols need to move
        let writePos = this.size - 1;
        for (let row = this.size - 1; row >= 0; row--) {
            if (this.grid[row][col] !== null) {
                if (row !== writePos) {
                    movements.push({
                        symbol: this.grid[row][col],
                        fromRow: row,
                        toRow: writePos,
                        col: col
                    });
                    this.grid[writePos][col] = this.grid[row][col];
                    this.grid[row][col] = null;
                }
                writePos--;
            }
        }
        
        // Fill empty spaces with new symbols
        for (let row = writePos; row >= 0; row--) {
            const newSymbol = getRandomSymbol();
            this.grid[row][col] = newSymbol;
            newSymbols.push({
                symbol: newSymbol,
                row: row,
                col: col,
                dropDistance: writePos + 1
            });
        }
        
        // Animate movements
        this.animateCascade(movements, newSymbols);
    }
    
    animateCascade(movements, newSymbols) {
        const gridElement = document.getElementById('game-grid');
        const cellSize = gridElement.offsetWidth / this.size;
        
        // First, animate existing symbols falling down with gravity
        movements.forEach(({symbol, fromRow, toRow, col}, index) => {
            const fromCell = document.querySelector(`[data-row="${fromRow}"][data-col="${col}"]`);
            const toCell = document.querySelector(`[data-row="${toRow}"][data-col="${col}"]`);
            
            if (fromCell && toCell) {
                // Calculate drop distance in pixels
                const dropRows = toRow - fromRow;
                const dropDistance = dropRows * cellSize;
                
                // Create falling symbol
                const fallingSymbol = document.createElement('div');
                fallingSymbol.className = 'grid-cell falling-symbol';
                fallingSymbol.textContent = symbol.icon;
                fallingSymbol.style.backgroundColor = symbol.color + '33';
                fallingSymbol.style.position = 'absolute';
                fallingSymbol.style.width = cellSize + 'px';
                fallingSymbol.style.height = cellSize + 'px';
                fallingSymbol.style.zIndex = '1000';
                
                // Position at starting cell
                const fromRect = fromCell.getBoundingClientRect();
                const containerRect = gridElement.getBoundingClientRect();
                fallingSymbol.style.left = (fromRect.left - containerRect.left) + 'px';
                fallingSymbol.style.top = (fromRect.top - containerRect.top) + 'px';
                
                // Clear original cell immediately
                fromCell.textContent = '';
                fromCell.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                fromCell.classList.remove('winning', 'special-symbol', 'wild-symbol');
                
                // Add to grid
                gridElement.appendChild(fallingSymbol);
                
                // Apply gravity drop animation
                const fallDuration = 0.5 + dropRows * 0.15; // Much longer fall for greater distance
                setTimeout(() => {
                    fallingSymbol.style.transition = `transform ${fallDuration}s cubic-bezier(0.55, 0, 1, 0.45)`;
                    fallingSymbol.style.transform = `translateY(${dropDistance}px)`;
                }, 10);
                
                // Land with a bounce
                setTimeout(() => {
                    // Update the target cell
                    this.updateCell(toRow, col, symbol);
                    
                    // Add bounce effect to the cell
                    toCell.style.animation = 'none';
                    setTimeout(() => {
                        toCell.style.animation = 'bounceIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                    }, 10);
                    
                    // Remove falling element
                    fallingSymbol.remove();
                }, fallDuration * 1000);
            }
        });
        
        // Then drop new symbols from above
        const dropDelay = movements.length > 0 ? 300 : 0; // Increased delay
        setTimeout(() => {
            newSymbols.forEach(({symbol, row, col, dropDistance}, index) => {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    // Create new symbol above the grid
                    const newSymbolElement = document.createElement('div');
                    newSymbolElement.className = 'grid-cell new-falling-symbol';
                    newSymbolElement.textContent = symbol.icon;
                    newSymbolElement.style.backgroundColor = symbol.color + '33';
                    newSymbolElement.style.position = 'absolute';
                    newSymbolElement.style.width = cellSize + 'px';
                    newSymbolElement.style.height = cellSize + 'px';
                    newSymbolElement.style.zIndex = '900';
                    
                    // Position above the grid
                    const cellRect = cell.getBoundingClientRect();
                    const containerRect = gridElement.getBoundingClientRect();
                    const startY = -cellSize * (dropDistance + 1);
                    newSymbolElement.style.left = (cellRect.left - containerRect.left) + 'px';
                    newSymbolElement.style.top = (cellRect.top - containerRect.top + startY) + 'px';
                    
                    // Add to grid
                    gridElement.appendChild(newSymbolElement);
                    
                    // Calculate fall parameters
                    const totalDropDistance = cellSize * (dropDistance + 1 + row);
                    const fallDuration = 0.6 + (dropDistance + row) * 0.12; // Increased duration
                    
                    // Start falling with staggered delay
                    setTimeout(() => {
                        newSymbolElement.style.transition = `transform ${fallDuration}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
                        newSymbolElement.style.transform = `translateY(${totalDropDistance}px)`;
                    }, index * 60); // Increased stagger delay
                    
                    // Land and update cell
                    setTimeout(() => {
                        this.updateCell(row, col, symbol);
                        
                        // Bounce effect
                        cell.style.animation = 'none';
                        setTimeout(() => {
                            cell.style.animation = 'bounceIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                        }, 10);
                        
                        newSymbolElement.remove();
                    }, (fallDuration * 1000) + (index * 60)); // Match the stagger delay
                }
            });
        }, dropDelay);
    }
    
    applySpecialSymbolEffects(specialSymbolPositions) {
        specialSymbolPositions.forEach(({row, col, symbol}) => {
            switch(symbol.id) {
                case 'rush':
                    this.specialHandler.applyRushEffect({row, col});
                    break;
                case 'surge':
                    this.specialHandler.applySurgeEffect({row, col});
                    break;
                case 'slash':
                    this.specialHandler.applySlashEffect({row, col});
                    break;
            }
        });
    }
    
    // Modified cluster finding to handle wild symbols
    dfsWithWilds(row, col, symbolId, visited) {
        if (row < 0 || row >= this.size || col < 0 || col >= this.size ||
            visited[row][col]) {
            return [];
        }
        
        const currentSymbol = this.grid[row][col];
        if (!currentSymbol || (currentSymbol.id !== symbolId && !currentSymbol.isWild)) {
            return [];
        }
        
        visited[row][col] = true;
        const positions = [{row, col}];
        
        // Check all 4 directions
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dr, dc] of directions) {
            positions.push(...this.dfsWithWilds(row + dr, col + dc, symbolId, visited));
        }
        
        return positions;
    }
}