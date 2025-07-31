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
                delay += 50; // Stagger columns by 50ms
            });
        }, 300); // Wait for removal animation
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
        // First, animate existing symbols falling down
        movements.forEach(({symbol, fromRow, toRow, col}) => {
            const fromCell = document.querySelector(`[data-row="${fromRow}"][data-col="${col}"]`);
            const toCell = document.querySelector(`[data-row="${toRow}"][data-col="${col}"]`);
            
            if (fromCell && toCell) {
                // Calculate distance
                const distance = (toRow - fromRow) * 100;
                
                // Clone the symbol for animation
                const movingSymbol = fromCell.cloneNode(true);
                movingSymbol.style.position = 'absolute';
                movingSymbol.style.transition = `transform ${0.3 + (toRow - fromRow) * 0.05}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
                movingSymbol.style.zIndex = '100';
                
                // Position it at the starting location
                const fromRect = fromCell.getBoundingClientRect();
                const containerRect = document.getElementById('game-grid').getBoundingClientRect();
                movingSymbol.style.left = `${fromRect.left - containerRect.left}px`;
                movingSymbol.style.top = `${fromRect.top - containerRect.top}px`;
                movingSymbol.style.width = `${fromRect.width}px`;
                movingSymbol.style.height = `${fromRect.height}px`;
                
                // Add to grid container
                document.getElementById('game-grid').appendChild(movingSymbol);
                
                // Clear original cell
                fromCell.textContent = '';
                fromCell.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                
                // Animate to new position
                setTimeout(() => {
                    movingSymbol.style.transform = `translateY(${distance}%)`;
                }, 10);
                
                // After animation, update the actual cell and remove the animated element
                setTimeout(() => {
                    this.updateCell(toRow, col, symbol);
                    movingSymbol.remove();
                }, 300 + (toRow - fromRow) * 50);
            }
        });
        
        // Then animate new symbols dropping from top
        setTimeout(() => {
            newSymbols.forEach(({symbol, row, col, dropDistance}) => {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    // Start from above the grid
                    cell.style.transform = `translateY(-${(dropDistance + 1) * 100}%)`;
                    cell.style.opacity = '0';
                    this.updateCell(row, col, symbol);
                    
                    // Animate falling in
                    setTimeout(() => {
                        cell.style.transition = `transform ${0.4 + dropDistance * 0.05}s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.2s`;
                        cell.style.transform = 'translateY(0)';
                        cell.style.opacity = '1';
                    }, 50 + row * 30);
                    
                    // Reset transition after animation
                    setTimeout(() => {
                        cell.style.transition = 'all 0.3s ease';
                    }, 450 + dropDistance * 50 + row * 30);
                }
            });
        }, movements.length > 0 ? 100 : 0);
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