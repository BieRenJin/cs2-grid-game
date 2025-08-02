// Improved grid animations with better physics and visual effects
import { getSymbolDisplayWithLog } from './symbols.js';

export class GridAnimations {
    constructor(grid) {
        this.grid = grid;
        this.gridElement = document.getElementById('game-grid');
        // Initialize gap size
        this.gridGap = 5; // Default gap
        // Calculate cell size accounting for grid gaps and padding
        this.updateCellSize();
        
        // Animation state management
        this.isAnimating = false;
        this.animationQueue = [];
        this.currentAnimationPhase = 'idle'; // idle, elimination, cascade, special
        this.pendingAnimations = new Set(); // Track active animations
    }
    
    // Animation state management methods
    startAnimation(phase) {
        console.log(`🎬 Starting animation phase: ${phase}`);
        this.isAnimating = true;
        this.currentAnimationPhase = phase;
        
        // Disable spin button during animations
        if (window.game && window.game.spinButton) {
            window.game.spinButton.disabled = true;
            window.game.spinButton.style.opacity = '0.5';
            window.game.spinButton.style.cursor = 'not-allowed';
            window.game.spinButton.textContent = 'ANIMATING...';
            
            // Add visual pulse effect to indicate active animation
            window.game.spinButton.style.animation = 'pulse 1s infinite';
        }
    }
    
    endAnimation(phase) {
        console.log(`✅ Completed animation phase: ${phase}`);
        this.currentAnimationPhase = 'idle';
        
        // Check if all animations are complete
        if (this.pendingAnimations.size === 0) {
            this.isAnimating = false;
            console.log('🏁 All animations complete, enabling controls');
            
            // Only re-enable spin button if the spin is completely finished
            if (window.game && window.game.spinButton && !window.game.isSpinning) {
                window.game.spinButton.disabled = false;
                window.game.spinButton.style.opacity = '1';
                window.game.spinButton.style.cursor = 'pointer';
                window.game.spinButton.style.animation = ''; // Remove pulse
                if (window.game.freeSpinsRemaining > 0) {
                    window.game.spinButton.textContent = `FREE SPIN (${window.game.freeSpinsRemaining})`;
                } else {
                    window.game.spinButton.textContent = 'SPIN';
                }
            } else if (window.game && window.game.spinButton && window.game.isSpinning) {
                // Still spinning, keep showing ANIMATING...
                window.game.spinButton.textContent = 'ANIMATING...';
                window.game.spinButton.disabled = true;
                window.game.spinButton.style.animation = 'pulse 1s infinite';
            }
        }
    }
    
    // Check if any animations are currently playing
    isAnimationActive() {
        return this.isAnimating || this.pendingAnimations.size > 0;
    }
    
    // Wait for all animations to complete
    async waitForAnimationsComplete() {
        return new Promise(resolve => {
            const checkComplete = () => {
                if (!this.isAnimationActive()) {
                    resolve();
                } else {
                    setTimeout(checkComplete, 100);
                }
            };
            checkComplete();
        });
    }
    
    // Enhanced elimination animation with clear phases
    animateRemoval(clusters) {
        return new Promise(resolve => {
            // Prevent overlapping animations
            if (this.isAnimationActive()) {
                console.warn('⚠️ Animation already active, waiting for completion');
                this.waitForAnimationsComplete().then(() => {
                    // Retry after current animations complete
                    this.animateRemoval(clusters).then(resolve);
                });
                return;
            }
            
            this.startAnimation('elimination');
            const animationId = 'elimination-' + Date.now();
            this.pendingAnimations.add(animationId);
            
            console.log('🎆 Starting 4-phase elimination animation');
            
            // Phase 1: Highlight symbols to be eliminated (750ms)
            this.highlightForElimination(clusters).then(() => {
                // Phase 2: Clear the cells completely (300ms)
                return this.clearCells(clusters);
            }).then(() => {
                // Phase 3: Show empty cells clearly (500ms pause)
                return this.showEmptyCells(clusters);
            }).then(() => {
                // Phase 4: Ready for cascade
                console.log('✅ Empty cells shown, ready for cascade');
                this.pendingAnimations.delete(animationId);
                this.endAnimation('elimination');
                resolve();
            });
        });
    }
    
    // Phase 1: Highlight symbols that will be eliminated
    highlightForElimination(clusters) {
        return new Promise(async resolve => {
            console.log('📍 Phase 1: Highlighting symbols for elimination');
            
            // First, highlight each cluster sequentially
            for (let i = 0; i < clusters.length; i++) {
                const cluster = clusters[i];
                console.log(`🎯 Highlighting cluster ${i + 1}/${clusters.length}`);
                
                // Highlight all positions in this cluster
                cluster.positions.forEach(({row, col}) => {
                    const cell = this.getCell(row, col);
                    if (cell) {
                        // Clear previous states
                        cell.classList.remove('winning-flash');
                        
                        // Add sequential highlight effect
                        cell.classList.add('cluster-highlight-sequential');
                        cell.style.animationDelay = '0ms';
                        cell.style.zIndex = '50';
                    }
                });
                
                // Wait for this cluster to be highlighted
                await new Promise(r => setTimeout(r, 300));
            }
            
            // Wait a bit then highlight all together
            await new Promise(r => setTimeout(r, 200));
            
            // Now highlight all clusters together with elimination effect
            clusters.forEach(cluster => {
                cluster.positions.forEach(({row, col}) => {
                    const cell = this.getCell(row, col);
                    if (cell) {
                        // Remove sequential highlight
                        cell.classList.remove('cluster-highlight-sequential');
                        
                        // Add elimination highlight
                        cell.classList.add('elimination-highlight');
                        cell.style.zIndex = '100';
                        
                        // Add pulsing border effect
                        const pulseEffect = document.createElement('div');
                        pulseEffect.className = 'elimination-pulse';
                        pulseEffect.style.cssText = `
                            position: absolute;
                            top: -4px;
                            left: -4px;
                            right: -4px;
                            bottom: -4px;
                            border: 4px solid #FF0000;
                            border-radius: 8px;
                            animation: eliminationPulse 0.4s ease-in-out 3;
                            animation-fill-mode: forwards;
                            pointer-events: none;
                            z-index: 101;
                        `;
                        cell.style.position = 'relative';
                        cell.appendChild(pulseEffect);
                    }
                });
            });
            
            // Show highlight for 750ms
            setTimeout(() => {
                console.log('✅ Phase 1 complete: Symbols highlighted');
                resolve();
            }, 750);
        });
    }
    
    // Phase 2: Clear cells completely (leave empty spaces)
    clearCells(clusters) {
        return new Promise(resolve => {
            console.log('🗑️ Phase 2: Clearing eliminated cells');
            
            clusters.forEach(cluster => {
                cluster.positions.forEach(({row, col}) => {
                    const cell = this.getCell(row, col);
                    if (cell) {
                        // Add disappearing animation
                        cell.style.transition = 'all 0.3s ease-out';
                        cell.style.transform = 'scale(0) rotate(360deg)';
                        cell.style.opacity = '0';
                        
                        // Remove pulse effect
                        const pulseEffect = cell.querySelector('.elimination-pulse');
                        if (pulseEffect) {
                            pulseEffect.remove();
                        }
                    }
                });
            });
            
            // Complete clearing after animation
            setTimeout(() => {
                clusters.forEach(cluster => {
                    cluster.positions.forEach(({row, col}) => {
                        const cell = this.getCell(row, col);
                        if (cell) {
                            // Clear the cell completely
                            this.clearCell(cell);
                            
                            // Reset any transform/filter effects
                            cell.style.filter = '';
                            cell.style.transform = '';
                            cell.style.zIndex = '';
                            
                            // Mark in grid data as empty
                            this.grid.grid[row][col] = null;
                        }
                    });
                });
                
                console.log('✅ Phase 2 complete: Cells cleared and marked empty');
                resolve();
            }, 300);
        });
    }
    
    // Phase 3: Show empty cells clearly before cascade starts
    showEmptyCells(clusters) {
        return new Promise(resolve => {
            console.log('🕳️ Phase 3: Showing empty cells with background color');
            
            clusters.forEach(cluster => {
                cluster.positions.forEach(({row, col}) => {
                    const cell = this.getCell(row, col);
                    if (cell) {
                        // Ensure cell is truly empty
                        this.clearCell(cell);
                        cell.classList.remove('elimination-empty');
                        
                        // Update grid state to null for these positions
                        this.grid.grid[row][col] = null;
                    }
                });
            });
            
            // Brief pause to show empty cells, then start cascade
            setTimeout(() => {
                console.log('✅ Phase 3 complete: Empty cells shown, ready for cascade');
                resolve();
            }, 200);
        });
    }
    
    // Two-phase cascade animation: existing items settle down, then new items fall
    async animateCascade(movements, newSymbols) {
        // Wait for any active animations to complete before cascade
        if (this.isAnimationActive()) {
            console.warn('⚠️ Waiting for active animations to complete before cascade');
            await this.waitForAnimationsComplete();
        }
        
        return new Promise(async (resolve) => {
            this.startAnimation('cascade');
            const animationId = 'cascade-' + Date.now();
            this.pendingAnimations.add(animationId);
            
            console.log('⬇️ Starting synchronized two-phase cascade animation');
            
            // Clean up empty cell styles and dots
            document.querySelectorAll('.empty-cell').forEach(cell => {
                cell.style.border = '';
                cell.style.backgroundColor = '';
                cell.classList.remove('empty-cell', 'elimination-empty');
            });
            
            // Remove empty cell dots
            document.querySelectorAll('.empty-cell-dot').forEach(dot => {
                dot.remove();
            });
            
            try {
                // Phase 1: Existing symbols drop simultaneously
                if (movements.length > 0) {
                    console.log(`📍 Phase 1: ${movements.length} existing items dropping simultaneously`);
                    await this.animateExistingItemsSettling(movements);
                }
                
                // Phase 2: New symbols drop simultaneously after existing ones settle
                if (newSymbols.length > 0) {
                    // Small pause between phases for visual clarity
                    await new Promise(resolve => setTimeout(resolve, 200));
                    console.log(`📍 Phase 2: ${newSymbols.length} new items dropping simultaneously`);
                    await this.animateNewItemsDropping(newSymbols);
                }
                
                // Final verification
                this.verifyAllCellsHaveContent();
                
                // End cascade animation
                this.pendingAnimations.delete(animationId);
                this.endAnimation('cascade');
                
                console.log('✅ All cascade animations completed');
                resolve();
                
            } catch (error) {
                console.error('Error in cascade animation:', error);
                this.pendingAnimations.delete(animationId);
                this.endAnimation('cascade');
                resolve();
            }
        });
    }
    
    // Phase 1: Animate existing items settling down from their current positions
    animateExistingItemsSettling(movements) {
        return new Promise(resolve => {
            console.log('🔽 Phase 1: Existing items dropping simultaneously across all columns');
            
            let completedItems = 0;
            const totalItems = movements.length;
            
            if (totalItems === 0) {
                resolve();
                return;
            }
            
            // Start all existing item animations simultaneously
            movements.forEach((move) => {
                this.animateExistingItemSettle(move, () => {
                    completedItems++;
                    if (completedItems === totalItems) {
                        setTimeout(() => {
                            console.log('✅ Phase 1 complete: All existing items settled simultaneously');
                            resolve();
                        }, 200); // Small buffer
                    }
                });
            });
            
            // Fallback resolve in case something goes wrong
            setTimeout(() => {
                resolve();
            }, 2000);
        });
    }
    
    // Phase 2: Animate new items dropping from above (long drop with rotation)
    animateNewItemsDropping(newSymbols) {
        return new Promise((resolve) => {
            if (newSymbols.length === 0) {
                resolve();
                return;
            }
            
            console.log('🌟 Phase 2: New items dropping from above - all columns simultaneously');
            
            // First pass: Set up all content without animation
            newSymbols.forEach((newSymbol) => {
                const { symbol, row, col } = newSymbol;
                const targetCell = this.getCell(row, col);
                if (targetCell) {
                    // Update grid state
                    this.grid.grid[row][col] = symbol;
                    // Render the symbol immediately
                    this.renderCell(targetCell, symbol);
                }
            });
            
            // Use fixed animation duration for synchronization
            const animationDuration = 1200 + 500; // 1.2s animation + 0.5s buffer
            
            // Second pass: Start ALL animations at exactly the same time
            requestAnimationFrame(() => {
                console.log(`🌟 Starting ${newSymbols.length} items dropping simultaneously across all columns`);
                
                // Start all animations at once, no column-based delays
                newSymbols.forEach((newSymbol) => {
                    this.startNewItemDropAnimation(newSymbol);
                });
                
                // Resolve after all animations should be complete
                setTimeout(() => {
                    console.log('✅ Phase 2 complete: All new items dropped simultaneously');
                    resolve();
                }, animationDuration);
            });
        });
    }
    
    // Animate a single existing item dropping from its current position to new position
    animateExistingItemSettle(move, onComplete) {
        const { symbol, fromRow, toRow, col } = move;
        // Calculate drop distance from current position to target position, including gaps
        const dropDistance = (toRow - fromRow) * (this.cellSize + this.gridGap);
        
        // FIXED: Use uniform duration for all existing items to ensure synchronization
        const uniformFallDuration = 0.8; // Fixed 0.8 seconds for all existing items
        
        // Get source and target cells
        const fromCell = this.getCell(fromRow, col);
        const targetCell = this.getCell(toRow, col);
        
        if (fromCell && targetCell && fromRow !== toRow) {
            // Update grid state
            this.grid.grid[toRow][col] = symbol;
            this.grid.grid[fromRow][col] = null; // Source is now empty
            
            // Move the symbol from source to target
            this.moveCell(fromCell, targetCell, symbol);
            
            // Start target cell from the original position offset
            targetCell.style.transform = `translateY(-${dropDistance}px)`;
            targetCell.style.opacity = '1'; // Already visible since it was visible before
            targetCell.style.transition = 'none';
            
            requestAnimationFrame(() => {
                // Gentle falling animation for existing items (no rotation)
                targetCell.style.transition = `transform ${uniformFallDuration}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
                targetCell.style.transform = 'translateY(0px)';
                targetCell.style.opacity = '1';
                
                setTimeout(() => {
                    // Subtle bounce for existing items
                    this.addBounceEffect(targetCell, uniformFallDuration, false);
                    
                    // Source cell cleanup is already done in moveCell
                    
                    if (onComplete) onComplete();
                }, uniformFallDuration * 1000);
            });
        } else {
            // No movement needed, just ensure grid state is correct
            if (targetCell) {
                this.grid.grid[toRow][col] = symbol;
            }
            if (onComplete) onComplete();
        }
    }
    
    // Start animation for new item (content already set)
    startNewItemDropAnimation(newSymbol) {
        const { symbol, row, col, dropDistance } = newSymbol;
        const totalDistance = (this.cellSize + this.gridGap) * (dropDistance + row + 1);
        
        // FIXED: Use a uniform fall duration for ALL symbols to ensure synchronization
        const uniformFallDuration = 1.2; // Fixed 1.2 seconds for all symbols
        
        const targetCell = this.getCell(row, col);
        if (targetCell) {
            // Position element high above screen (invisible)
            const rotationAngle = Math.random() * 720;
            targetCell.style.transform = `translateY(-${totalDistance}px) rotate(${rotationAngle}deg)`;
            targetCell.style.opacity = '0';
            targetCell.style.transition = 'none';
            
            // Start the drop animation in next frame for perfect synchronization
            requestAnimationFrame(() => {
                targetCell.style.transition = `transform ${uniformFallDuration}s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s`;
                targetCell.style.transform = 'translateY(0px) rotate(0deg)';
                targetCell.style.opacity = '1';
                
                setTimeout(() => {
                    this.addBounceEffect(targetCell, uniformFallDuration, true);
                }, uniformFallDuration * 1000);
            });
        }
    }
    
    // Animate a single new item dropping from above (DEPRECATED - use startNewItemDropAnimation)
    animateNewItemDrop(newSymbol) {
        const { symbol, row, col, dropDistance } = newSymbol;
        const totalDistance = (this.cellSize + this.gridGap) * (dropDistance + row + 1);
        const fallDuration = Math.sqrt(totalDistance / 400) * 1.0; // Longer, more dramatic fall
        
        const targetCell = this.getCell(row, col);
        if (targetCell) {
            // Update grid state
            this.grid.grid[row][col] = symbol;
            
            // Set content safely without sudden appearance
            this.setCellContentSafely(targetCell, symbol);
            
            // Start from high above screen (completely invisible)
            const rotationAngle = Math.random() * 720; // Up to 2 full rotations
            targetCell.style.transform = `translateY(-${totalDistance}px) rotate(${rotationAngle}deg)`;
            targetCell.style.opacity = '0'; // Start completely invisible
            targetCell.style.transition = 'none';
            
            console.log(`🌟 New item at [${row},${col}] starting from ${totalDistance}px above`);
            
            requestAnimationFrame(() => {
                // Dramatic falling animation with rotation
                targetCell.style.transition = `transform ${fallDuration}s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s`;
                targetCell.style.transform = 'translateY(0px) rotate(0deg)';
                targetCell.style.opacity = '1';
                
                setTimeout(() => {
                    // Enhanced bounce for new items
                    this.addBounceEffect(targetCell, fallDuration, true);
                }, fallDuration * 1000);
            });
        }
    }
    
    // Animate a single item dropping from above (unified method - DEPRECATED)
    animateItemDrop(item, index) {
        const { type, symbol, targetRow, col, dropDistance, fromRow } = item;
        const totalFallDistance = dropDistance;
        const fallDuration = Math.sqrt(totalFallDistance / 400) * 0.9;
        
        // DEPRECATED METHOD - This method causes sudden appearance
        console.warn('⚠️ Using deprecated animateItemDrop method - may cause sudden appearance');
        
        // Clear source cell if it's an existing symbol moving (but not if it's the same as target)
        if (type === 'existing' && fromRow !== undefined && fromRow !== targetRow) {
            const fromCell = this.getCell(fromRow, col);
            if (fromCell) {
                fromCell.innerHTML = '';
                fromCell.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                fromCell.classList.add('temp-empty');
            }
        }
        
        // No internal delay - timing controlled externally for row synchronization
        const targetCell = this.getCell(targetRow, col);
        if (targetCell) {
            // Ensure grid state is updated first
            this.grid.grid[targetRow][col] = symbol;
            
            // Set content safely without sudden appearance
            this.setCellContentSafely(targetCell, symbol);
            
            // Double-check that content was set
            if (!targetCell.innerHTML.trim()) {
                console.warn(`⚠️ Empty cell detected at [${targetRow},${col}], forcing content update`);
                targetCell.innerHTML = symbol.icon; // Fallback to emoji
            }
            
            // Start from above the visible area (for ALL items) - invisible initially
            targetCell.style.transform = `translateY(-${totalFallDistance}px)`;
            if (type === 'new') {
                // New symbols also get rotation
                targetCell.style.transform += ` rotate(${Math.random() * 360}deg)`;
            }
            targetCell.style.opacity = '0';
            targetCell.style.transition = 'none';
            
            // Animate falling down with physics
            requestAnimationFrame(() => {
                const easing = type === 'new' ? 
                    'cubic-bezier(0.175, 0.885, 0.32, 1.275)' : // More dramatic for new
                    'cubic-bezier(0.55, 0.055, 0.675, 0.19)';   // Standard gravity
                    
                targetCell.style.transition = `transform ${fallDuration}s ${easing}, opacity 0.3s`;
                targetCell.style.transform = 'translateY(0px) rotate(0deg)';
                targetCell.style.opacity = '1';
                
                // Add bounce landing effect
                setTimeout(() => {
                    this.addBounceEffect(targetCell, fallDuration, type === 'new');
                    
                    // Clean up source cell (only if it's different from target)
                    if (type === 'existing' && fromRow !== undefined && fromRow !== targetRow) {
                        const fromCell = this.getCell(fromRow, col);
                        if (fromCell) {
                            fromCell.classList.remove('temp-empty');
                            // Keep transparent background for empty cells
                            fromCell.style.backgroundColor = 'transparent';
                        }
                    }
                }, fallDuration * 1000);
            });
        }
    }
    
    // Animate a single column's drops without overlapping (DEPRECATED - use animateItemDrop)
    animateColumnDrop(col, movements) {
        console.log(`⬇️ Animating column ${col} drops:`, movements.length);
        
        movements.forEach(({symbol, fromRow, toRow}, index) => {
            const dropDistance = (toRow - fromRow) * (this.cellSize + this.gridGap);
            const fallDuration = Math.sqrt(dropDistance / 400) * 0.8;
            
            // Clear original cell immediately and mark as empty
            const fromCell = this.getCell(fromRow, col);
            if (fromCell) {
                fromCell.innerHTML = '';
                fromCell.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                fromCell.classList.add('temp-empty'); // Mark as temporarily empty
            }
            
            // Add staggered animation with physics
            setTimeout(() => {
                const targetCell = this.getCell(toRow, col);
                if (targetCell) {
                    // Set initial position for the symbol in target cell
                    // REMOVED: Direct updateCell call - content set via copyElementWithStyles
                    targetCell.style.transform = `translateY(-${dropDistance}px)`;
                    targetCell.style.transition = 'none';
                    
                    // Animate with realistic physics (gravity + bounce)
                    requestAnimationFrame(() => {
                        // Use physics-based easing curve for gravity effect
                        targetCell.style.transition = `transform ${fallDuration}s cubic-bezier(0.55, 0.055, 0.675, 0.19)`;
                        targetCell.style.transform = 'translateY(0px)';
                        
                        // Add bounce landing effect
                        setTimeout(() => {
                            this.addBounceEffect(targetCell, fallDuration);
                            
                            // Clear temp-empty class from original cell
                            if (fromCell) {
                                fromCell.classList.remove('temp-empty');
                            }
                        }, fallDuration * 1000);
                    });
                }
            }, index * 50); // Stagger timing
        });
    }
    
    // DEPRECATED: Animate new symbols falling from above (use animateItemDrop instead)
    animateNewSymbols(newSymbols) {
        console.log(`⬇️ Animating ${newSymbols.length} new symbols`);
        
        newSymbols.forEach(({symbol, row, col, dropDistance}, index) => {
            const totalDistance = (this.cellSize + this.gridGap) * (dropDistance + row + 1);
            const fallDuration = Math.sqrt(totalDistance / 400) * 0.9;
            
            // Stagger the drops with physics
            setTimeout(() => {
                const targetCell = this.getCell(row, col);
                if (targetCell) {
                    // Place symbol directly in target cell
                    // REMOVED: Direct updateCell call - content set via setCellContentSafely
                    
                    // Start from above the visible area with spin
                    targetCell.style.transform = `translateY(-${totalDistance}px) rotate(${Math.random() * 360}deg)`;
                    targetCell.style.opacity = '0.9';
                    targetCell.style.transition = 'none';
                    
                    // Animate falling down with physics
                    requestAnimationFrame(() => {
                        // Stronger gravity effect for new symbols
                        targetCell.style.transition = `transform ${fallDuration}s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s`;
                        targetCell.style.transform = 'translateY(0px) rotate(0deg)';
                        targetCell.style.opacity = '1';
                        
                        // Add dramatic bounce landing
                        setTimeout(() => {
                            this.addBounceEffect(targetCell, fallDuration, true); // Enhanced bounce for new symbols
                        }, fallDuration * 1000);
                    });
                }
            }, index * 80); // Longer stagger for dramatic effect
        });
    }
    
    // Add realistic bounce effect after landing
    addBounceEffect(cell, originalDuration, isNewSymbol = false) {
        try {
            if (!cell) return;
            
            // Calculate bounce intensity based on fall speed
            const bounceIntensity = isNewSymbol ? 1.2 : 0.8;
            const bounceHeight = this.cellSize * 0.15 * bounceIntensity; // 15% of cell height
            
            // Apply initial impact squash
            cell.style.transition = 'transform 0.1s ease-out';
            cell.style.transform = 'scaleY(0.85) scaleX(1.1)'; // Squash on impact
            
            setTimeout(() => {
                // First bounce up
                cell.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                cell.style.transform = `translateY(-${bounceHeight}px) scaleY(1.1) scaleX(0.95)`;
                
                setTimeout(() => {
                    // Second small bounce
                    cell.style.transition = 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    cell.style.transform = `translateY(-${bounceHeight * 0.3}px) scaleY(1.05) scaleX(0.98)`;
                    
                    setTimeout(() => {
                        // Final settle with subtle overshoot
                        cell.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                        cell.style.transform = 'translateY(0px) scaleY(1.02) scaleX(0.99)';
                        
                        setTimeout(() => {
                            // Complete rest
                            cell.style.transition = 'transform 0.1s ease-out';
                            cell.style.transform = '';
                            
                            // Clean up after all bounces
                            setTimeout(() => {
                                cell.style.transition = '';
                            }, 100);
                            
                        }, 200);
                    }, 150);
                }, 200);
            }, 100);
            
            // Add dust and sound effects
            this.createDustEffect(cell);
            
            // Play impact sound
            if (window.game && window.game.soundManager) {
                window.game.soundManager.play('cascade');
            }
            
        } catch (error) {
            console.error('Error in addBounceEffect:', error);
        }
    }
    
    // Add landing impact effect to cells (deprecated - use addBounceEffect)
    addLandingEffect(row, col) {
        try {
            const cell = this.getCell(row, col);
            if (cell) {
                this.addBounceEffect(cell, 0.5, false);
            }
        } catch (error) {
            console.error('Error in addLandingEffect:', error);
        }
    }
    
    // Create dust particles on landing (supports both cell element and coordinates)
    createDustEffect(cellOrRow, col = null) {
        let cell;
        
        // Handle both cell element and row/col coordinates
        if (typeof cellOrRow === 'object' && cellOrRow.nodeType) {
            cell = cellOrRow; // It's already a cell element
        } else {
            cell = this.getCell(cellOrRow, col); // It's row/col coordinates
        }
        
        if (!cell) return;
        
        try {
            const cellRect = cell.getBoundingClientRect();
            const containerRect = this.gridElement.getBoundingClientRect();
            
            // Create 4 dust particles for more dramatic effect
            for (let i = 0; i < 4; i++) {
                const dust = document.createElement('div');
                dust.className = 'dust-particle';
                dust.style.cssText = `
                    position: absolute;
                    width: 4px;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.6);
                    border-radius: 50%;
                    pointer-events: none;
                    animation: dustFly 0.6s ease-out forwards;
                `;
                
                // Random position around the bottom of the cell
                const offsetX = (Math.random() - 0.5) * this.cellSize * 0.8;
                const offsetY = (Math.random() - 0.5) * this.cellSize * 0.3;
                const x = cellRect.left - containerRect.left + this.cellSize / 2 + offsetX;
                const y = cellRect.bottom - containerRect.top - 5 + offsetY;
                
                dust.style.left = x + 'px';
                dust.style.top = y + 'px';
                dust.style.animationDelay = `${i * 0.03}s`;
                
                this.gridElement.appendChild(dust);
                
                // Remove after animation
                setTimeout(() => {
                    if (dust.parentNode) dust.remove();
                }, 600);
            }
        } catch (error) {
            console.error('Error creating dust effect:', error);
        }
    }
    
    // Helper to get cell element
    getCell(row, col) {
        return document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    }
    
    // Move cell content from source to target (symbol moves as a unit)
    moveCell(fromCell, targetCell, symbol) {
        if (!fromCell || !targetCell) return;
        
        // Render the symbol in the target cell
        this.renderCell(targetCell, symbol);
        
        // Clear the source cell (it's now empty)
        this.clearCell(fromCell);
        
        console.log(`📋 Moved symbol from [${fromCell.dataset.row},${fromCell.dataset.col}] to [${targetCell.dataset.row},${targetCell.dataset.col}]`);
    }

    // Unified method to render a cell with symbol (symbol and background are one unit)
    renderCell(cell, symbol) {
        if (!cell) return;
        
        // If symbol exists, render it with its background
        if (symbol && symbol.id) {
            // Remove all empty states
            cell.classList.remove('empty-cell', 'elimination-empty', 'temp-empty');
            
            // Set content
            if (window.getSymbolDisplayWithLog) {
                cell.innerHTML = window.getSymbolDisplayWithLog(symbol);
            } else {
                cell.innerHTML = symbol.icon;
            }
            
            // Set background - this is part of the symbol
            cell.style.backgroundColor = symbol.color + '33';
            cell.style.opacity = '1';
            
            // Handle special symbols
            cell.classList.remove('special-symbol', 'wild-symbol');
            if (symbol.id && symbol.id.includes('special')) {
                cell.classList.add('special-symbol');
            }
            if (symbol.isWild || symbol.id === 'wild') {
                cell.classList.add('wild-symbol');
            }
        } else {
            // No symbol = truly empty cell
            this.clearCell(cell);
        }
    }
    
    // Clear a cell completely (make it empty)
    clearCell(cell) {
        if (!cell) return;
        
        cell.innerHTML = '';
        cell.style.backgroundColor = 'transparent';
        cell.style.border = '';
        cell.style.opacity = '1';
        cell.classList.remove('special-symbol', 'wild-symbol', 'winning-flash', 'elimination-highlight', 'cluster-highlight-sequential');
        cell.classList.add('empty-cell');
    }
    
    // Safe method to set cell content without sudden appearance
    setCellContentSafely(cell, symbol) {
        this.renderCell(cell, symbol);
    }
    
    // Force clear all yellow/gold effects (for debugging stuck elements)
    clearAllYellowEffects() {
        console.log('🧹 Force clearing all yellow/gold effects');
        
        // Remove all yellow effect classes
        const affectedCells = this.gridElement.querySelectorAll('.winning-flash, .elimination-highlight, .special-symbol');
        affectedCells.forEach(cell => {
            cell.classList.remove('winning-flash', 'elimination-highlight');
            
            // Force stop any running animations
            cell.style.animation = 'none';
            
            // Reset any yellow styling
            if (cell.style.border && cell.style.border.includes('#FFD700')) {
                cell.style.border = '';
            }
            if (cell.style.boxShadow && cell.style.boxShadow.includes('#FFD700')) {
                cell.style.boxShadow = '';
            }
            
            // Reset background if it contains gold colors
            if (cell.style.backgroundColor && (cell.style.backgroundColor.includes('#FFD700') || cell.style.backgroundColor.includes('gold'))) {
                cell.style.backgroundColor = '';
            }
        });
        
        // Remove all yellow effect elements (including pulse effects)
        const yellowElements = this.gridElement.querySelectorAll('.win-pulse-border, .elimination-pulse, .empty-cell-dot');
        yellowElements.forEach(el => {
            if (el.parentNode) {
                el.remove();
            }
        });
        
        // Clear any elements with inline yellow styles
        const inlineYellowElements = this.gridElement.querySelectorAll('[style*="#FFD700"], [style*="gold"], [style*="yellow"]');
        inlineYellowElements.forEach(el => {
            // Force stop animations
            el.style.animation = 'none';
            
            if (el.style.border && el.style.border.includes('#FFD700')) {
                el.style.border = '';
            }
            if (el.style.boxShadow && el.style.boxShadow.includes('#FFD700')) {
                el.style.boxShadow = '';
            }
            if (el.style.color && (el.style.color.includes('#FFD700') || el.style.color.includes('gold'))) {
                el.style.color = '';
            }
            if (el.style.backgroundColor && (el.style.backgroundColor.includes('#FFD700') || el.style.backgroundColor.includes('gold'))) {
                el.style.backgroundColor = '';
            }
        });
        
        // Force garbage collection by triggering a reflow
        this.gridElement.offsetHeight;
        
        console.log('✅ All yellow/gold effects cleared');
    }
    
    // Update cell size on resize
    updateCellSize() {
        try {
            // Get the actual cell element to measure its computed size
            const firstCell = this.gridElement.querySelector('.grid-cell');
            if (firstCell) {
                const cellRect = firstCell.getBoundingClientRect();
                this.cellSize = cellRect.height; // Use actual cell height
                
                // Also calculate the gap size for more accurate positioning
                const gridStyles = window.getComputedStyle(this.gridElement);
                this.gridGap = parseFloat(gridStyles.gap) || 5; // Default 5px gap
            } else {
                // Fallback calculation if no cells exist yet
                const gridWidth = this.gridElement.offsetWidth;
                const gridPadding = 20; // 10px padding on each side
                const totalGaps = (this.grid.size - 1) * 5; // 5px gap between cells
                this.cellSize = (gridWidth - gridPadding - totalGaps) / this.grid.size;
                this.gridGap = 5;
            }
        } catch (error) {
            console.error('Error updating cell size:', error);
            this.cellSize = 50; // Fallback size
            this.gridGap = 5;
        }
    }
    
    // Verify all cells have content and fix empty ones
    verifyAllCellsHaveContent() {
        console.log('🔍 Verifying all cells have content...');
        let emptyCount = 0;
        let fixedCount = 0;
        
        for (let row = 0; row < this.grid.size; row++) {
            for (let col = 0; col < this.grid.size; col++) {
                const cell = this.getCell(row, col);
                const gridSymbol = this.grid.grid[row][col];
                
                if (cell && (!cell.innerHTML.trim() || cell.innerHTML.trim() === '')) {
                    emptyCount++;
                    
                    if (gridSymbol) {
                        // Fix empty cell with grid data
                        console.warn(`🔧 Fixing empty cell [${row},${col}] with ${gridSymbol.name}`);
                        this.setCellContentSafely(cell, gridSymbol);
                        fixedCount++;
                    } else {
                        console.error(`❌ Cell [${row},${col}] is empty and has no grid data!`);
                        // Force a random symbol as last resort
                        const fallbackSymbol = { id: 'fallback', name: 'Fallback', icon: '❓', color: '#999999' };
                        this.grid.grid[row][col] = fallbackSymbol;
                        this.setCellContentSafely(cell, fallbackSymbol);
                        fixedCount++;
                    }
                } else if (cell && !gridSymbol) {
                    // Cell has content but grid doesn't - mark as empty for visual consistency
                    console.warn(`🔧 Cell [${row},${col}] has content but grid is null, marking empty`);
                    this.markCellAsEmpty(cell);
                }
            }
        }
        
        if (emptyCount > 0) {
            console.log(`🔧 Found ${emptyCount} empty cells, fixed ${fixedCount}`);
        } else {
            console.log('✅ All cells have content');
        }
    }
    
    // Mark a cell as empty
    markCellAsEmpty(cell) {
        if (cell) {
            this.clearCell(cell);
        }
    }
    
    // Clean up any stuck animations and reset cell states
    cleanup() {
        try {
            console.log('🧹 Cleaning up animation states');
            
            // Remove any remaining particle effects and stuck elements
            const orphanedElements = this.gridElement.querySelectorAll('.cascade-particle, .cascade-effect, .win-pulse-border, .dust-particle, .elimination-pulse, .empty-cell-dot');
            
            // Also check for any elements with yellow/gold styling that might be stuck
            const stuckYellowElements = this.gridElement.querySelectorAll('[style*="#FFD700"], [style*="gold"], [style*="yellow"]');
            orphanedElements.forEach(el => {
                if (el.parentNode) {
                    el.remove();
                }
            });
            
            // Clean up any stuck yellow/gold elements
            stuckYellowElements.forEach(el => {
                if (el && el.style) {
                    // Remove yellow/gold styling
                    el.style.border = '';
                    el.style.boxShadow = '';
                    el.style.backgroundColor = '';
                    el.style.color = '';
                    
                    // If it's not a grid cell, remove it completely
                    if (!el.classList.contains('grid-cell') && el.parentNode) {
                        el.remove();
                    }
                }
            });
            
            // Clear any stuck styles on grid cells
            const allCells = this.gridElement.querySelectorAll('.grid-cell');
            allCells.forEach(cell => {
                // Reset animation styles
                cell.style.transform = '';
                cell.style.transition = '';
                cell.style.opacity = '';
                cell.style.zIndex = '';
                cell.style.filter = '';
                cell.style.animation = '';
                cell.style.border = '';
                cell.style.boxShadow = '';
                
                // Remove all animation classes
                cell.classList.remove(
                    'winning-flash', 'symbol-remove', 'winning', 
                    'elimination-highlight', 'empty-cell', 'temp-empty'
                );
                
                // Fix any broken images in cells
                const brokenImages = cell.querySelectorAll('img[style*="display: none"]');
                brokenImages.forEach(img => {
                    if (img.nextSibling && img.nextSibling.style) {
                        img.nextSibling.style.display = 'inline';
                    }
                });
            });
            
            console.log(`🧹 Cleaned up ${orphanedElements.length} orphaned elements and reset all cell states`);
            
            // Force clear any stuck yellow effects
            this.clearAllYellowEffects();
            
            // Final verification after cleanup
            this.verifyAllCellsHaveContent();
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
    
    // Safe timeout management to prevent animation leaks
    setSafeTimeout(callback, delay, name = null) {
        const timeoutId = this.timeoutCounter++;
        const timeoutName = name || `timeout-${timeoutId}`;
        
        const timeout = setTimeout(() => {
            try {
                callback();
            } catch (error) {
                console.error(`Error in timeout ${timeoutName}:`, error);
            } finally {
                // Clean up from active timeouts
                this.activeTimeouts.delete(timeoutId);
            }
        }, delay);
        
        // Store the timeout for potential cleanup
        this.activeTimeouts.set(timeoutId, {
            timeout,
            name: timeoutName,
            startTime: Date.now(),
            delay
        });
        
        return timeoutId;
    }
    
    // Clear all active timeouts
    clearAllTimeouts() {
        console.log(`🧹 Clearing ${this.activeTimeouts.size} active timeouts`);
        
        this.activeTimeouts.forEach((timeoutInfo, id) => {
            clearTimeout(timeoutInfo.timeout);
            console.log(`❌ Cleared timeout: ${timeoutInfo.name}`);
        });
        
        this.activeTimeouts.clear();
        this.timeoutCounter = 0;
    }
    
    // Enhanced cleanup with timeout management
    forceCleanup() {
        console.log('🚨 Force cleanup triggered');
        
        // Clear all managed timeouts first
        this.clearAllTimeouts();
        
        // Clear animation state
        this.isAnimating = false;
        this.currentAnimationPhase = 'idle';
        this.pendingAnimations.clear();
        
        // Run the standard cleanup
        this.cleanup();
        
        // Force clear yellow effects
        this.clearAllYellowEffects();
        
        console.log('✅ Force cleanup completed');
    }
}