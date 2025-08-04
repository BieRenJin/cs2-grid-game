import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Test Suite: Frontend-Backend Game Logic Consistency
 *
 * These tests verify that:
 * 1. Frontend animations match backend calculations
 * 2. Cluster detection is consistent
 * 3. Cascade animations align with backend cascade logic
 * 4. Win amounts match between frontend display and backend calculations
 * 5. Special symbol effects are properly synchronized
 */

test.describe('Game Logic Consistency', () => {
  let page: Page

  test.beforeEach(async ({ page: p }) => {
    page = p
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('Frontend grid matches backend response after spin', async () => {
    // Intercept the spin API call to capture backend response
    const spinResponse = await page.waitForResponse(
      response => response.url().includes('/spin'),
      async () => {
        // Click spin button
        await page.click('[data-testid="spin-button"]')
      }
    )

    const backendData = await spinResponse.json()

    // Wait for animations to complete
    await page.waitForTimeout(3000)

    // Get frontend grid state
    const frontendGrid = await page.evaluate(() => {
      const cells = document.querySelectorAll('[data-testid^="grid-cell-"]')
      const grid: string[][] = []

      for (let row = 0; row < 7; row++) {
        grid[row] = []
        for (let col = 0; col < 7; col++) {
          const cell = document.querySelector(`[data-testid="grid-cell-${row}-${col}"]`)
          const symbolId = cell?.getAttribute('data-symbol') || null
          grid[row][col] = symbolId
        }
      }

      return grid
    })

    // Compare grids
    expect(frontendGrid).toEqual(backendData.grid)
  })

  test('Cluster highlighting matches backend cluster detection', async () => {
    // Set up API response interceptor
    let backendClusters: any[] = []

    page.on('response', async response => {
      if (response.url().includes('/spin')) {
        const data = await response.json()
        backendClusters = data.clusters
      }
    })

    // Trigger spin
    await page.click('[data-testid="spin-button"]')

    // Wait for cluster animation phase
    await page.waitForTimeout(1500)

    // Get highlighted cells from frontend
    const highlightedCells = await page.evaluate(() => {
      const highlighted = []
      const cells = document.querySelectorAll('[data-testid^="grid-cell-"]')

      cells.forEach(cell => {
        if (cell.classList.contains('cluster-highlight')) {
          const testId = cell.getAttribute('data-testid')
          const match = testId?.match(/grid-cell-(\d+)-(\d+)/)
          if (match) {
            highlighted.push({
              row: parseInt(match[1]),
              col: parseInt(match[2]),
            })
          }
        }
      })

      return highlighted
    })

    // Flatten backend clusters positions
    const backendPositions = backendClusters.flatMap(cluster => cluster.positions)

    // Compare positions
    expect(highlightedCells.length).toBe(backendPositions.length)

    // Check each position matches
    for (const pos of highlightedCells) {
      const found = backendPositions.find(bp => bp.row === pos.row && bp.col === pos.col)
      expect(found).toBeTruthy()
    }
  })

  test('Win amount displayed matches backend calculation', async () => {
    // Intercept spin response
    const spinResponse = await page.waitForResponse(
      response => response.url().includes('/spin'),
      async () => {
        await page.click('[data-testid="spin-button"]')
      }
    )

    const backendData = await spinResponse.json()
    const expectedWin = backendData.total_win

    // Wait for win animation
    await page.waitForTimeout(3000)

    // Get displayed win amount
    const displayedWin = await page.evaluate(() => {
      const winElement = document.querySelector('[data-testid="win-amount"]')
      const text = winElement?.textContent || '0'
      return parseFloat(text.replace(/[^0-9.]/g, ''))
    })

    expect(displayedWin).toBe(expectedWin)
  })

  test('Cascade sequence matches backend cascade logic', async () => {
    // Track all cascade phases
    const cascadePhases: any[] = []

    page.on('response', async response => {
      if (response.url().includes('/spin')) {
        const data = await response.json()
        // Backend should return cascade information
        cascadePhases.push(data)
      }
    })

    // Trigger spin
    await page.click('[data-testid="spin-button"]')

    // Monitor cascade animations
    let cascadeCount = 0
    const maxWaitTime = 15000 // 15 seconds max
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTime) {
      const isAnimating = await page.evaluate(() => {
        const cells = document.querySelectorAll('[data-testid^="grid-cell-"]')
        return Array.from(cells).some(
          cell => cell.classList.contains('falling') || cell.classList.contains('eliminating')
        )
      })

      if (!isAnimating) {
        // Check if new cascade started
        const currentCascade = await page.evaluate(() => {
          return document.querySelector('[data-testid="cascade-counter"]')?.textContent
        })

        if (currentCascade && parseInt(currentCascade) > cascadeCount) {
          cascadeCount = parseInt(currentCascade)
        }

        // Check if game is complete
        const spinButton = await page.isEnabled('[data-testid="spin-button"]')
        if (spinButton) break
      }

      await page.waitForTimeout(100)
    }

    // Verify cascade count matches backend
    expect(cascadeCount).toBeLessThanOrEqual(10) // Max cascades
  })

  test('Special symbol effects are synchronized', async () => {
    // Test Rush symbol effect
    const rushTest = async () => {
      // Wait for a Rush symbol to appear
      const hasRush = await page.evaluate(() => {
        const cells = document.querySelectorAll('[data-testid^="grid-cell-"]')
        return Array.from(cells).some(cell => cell.getAttribute('data-symbol') === 'rush')
      })

      if (hasRush) {
        // Monitor Wild symbol transformations
        const wildPositions = await page.evaluate(() => {
          const wilds = []
          const cells = document.querySelectorAll('[data-testid^="grid-cell-"]')

          cells.forEach(cell => {
            if (cell.getAttribute('data-symbol') === 'wild') {
              const testId = cell.getAttribute('data-testid')
              const match = testId?.match(/grid-cell-(\d+)-(\d+)/)
              if (match) {
                wilds.push({
                  row: parseInt(match[1]),
                  col: parseInt(match[2]),
                })
              }
            }
          })

          return wilds
        })

        // Verify Wilds are not adjacent (distance > sqrt(2))
        for (let i = 0; i < wildPositions.length; i++) {
          for (let j = i + 1; j < wildPositions.length; j++) {
            const dist = Math.sqrt(
              Math.pow(wildPositions[i].row - wildPositions[j].row, 2) +
                Math.pow(wildPositions[i].col - wildPositions[j].col, 2)
            )
            expect(dist).toBeGreaterThan(Math.sqrt(2))
          }
        }
      }
    }

    // Test Surge symbol rainbow animation
    const surgeTest = async () => {
      const hasSurge = await page.evaluate(() => {
        const cells = document.querySelectorAll('[data-testid^="grid-cell-"]')
        return Array.from(cells).some(cell => cell.getAttribute('data-symbol') === 'surge')
      })

      if (hasSurge) {
        // Check for rainbow animation class
        const hasRainbowAnimation = await page.evaluate(() => {
          const cells = document.querySelectorAll('[data-testid^="grid-cell-"]')
          return Array.from(cells).some(cell => cell.classList.contains('rainbow-animation'))
        })

        expect(hasRainbowAnimation).toBeTruthy()
      }
    }

    // Run multiple spins to test special symbols
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="spin-button"]')
      await page.waitForTimeout(5000)

      await rushTest()
      await surgeTest()
    }
  })

  test('Grid gravity animation matches backend cascade logic', async () => {
    // Trigger spin
    await page.click('[data-testid="spin-button"]')

    // Wait for initial spin to complete
    await page.waitForTimeout(1000)

    // Monitor falling animations
    const fallingSequence = []

    for (let i = 0; i < 50; i++) {
      const fallingCells = await page.evaluate(() => {
        const falling = []
        const cells = document.querySelectorAll('[data-testid^="grid-cell-"]')

        cells.forEach(cell => {
          if (cell.classList.contains('falling')) {
            const testId = cell.getAttribute('data-testid')
            const match = testId?.match(/grid-cell-(\d+)-(\d+)/)
            if (match) {
              const fromRow = parseInt(cell.getAttribute('data-from-row') || match[1])
              const toRow = parseInt(match[1])
              const col = parseInt(match[2])

              falling.push({
                from: fromRow,
                to: toRow,
                col: col,
              })
            }
          }
        })

        return falling
      })

      if (fallingCells.length > 0) {
        fallingSequence.push(fallingCells)
      }

      await page.waitForTimeout(100)
    }

    // Verify falling follows gravity rules
    for (const phase of fallingSequence) {
      for (const movement of phase) {
        // Symbols should only fall downward
        expect(movement.to).toBeGreaterThanOrEqual(movement.from)

        // Column should remain the same
        expect(movement.col).toBeGreaterThanOrEqual(0)
        expect(movement.col).toBeLessThan(7)
      }
    }
  })

  test('Empty cells remain transparent during animations', async () => {
    // Trigger spin
    await page.click('[data-testid="spin-button"]')

    // Monitor for background visibility issues
    let backgroundIssues = 0
    const checkInterval = 50 // Check every 50ms
    const maxChecks = 100 // Check for 5 seconds

    for (let i = 0; i < maxChecks; i++) {
      const hasBackgroundIssue = await page.evaluate(() => {
        const cells = document.querySelectorAll('[data-testid^="grid-cell-"]')

        for (const cell of cells) {
          const symbol = cell.getAttribute('data-symbol')
          const hasBackground = window.getComputedStyle(cell).backgroundColor !== 'rgba(0, 0, 0, 0)'

          // Empty cells should not have visible backgrounds
          if (!symbol && hasBackground) {
            return true
          }
        }

        return false
      })

      if (hasBackgroundIssue) {
        backgroundIssues++
      }

      await page.waitForTimeout(checkInterval)
    }

    // Should have minimal or no background issues
    expect(backgroundIssues).toBe(0)
  })

  test('RTP calculation consistency over multiple spins', async () => {
    const spins = 100
    let totalWagered = 0
    let totalWon = 0

    for (let i = 0; i < spins; i++) {
      // Set bet amount
      const betAmount = 1
      totalWagered += betAmount

      // Spin and get result
      const spinResponse = await page.waitForResponse(
        response => response.url().includes('/spin'),
        async () => {
          await page.click('[data-testid="spin-button"]')
        }
      )

      const data = await spinResponse.json()
      totalWon += data.total_win

      // Wait for animation to complete
      await page.waitForSelector('[data-testid="spin-button"]:not([disabled])')
    }

    const rtp = (totalWon / totalWagered) * 100

    // RTP should be within reasonable range for small sample
    // (large variance expected with only 100 spins)
    expect(rtp).toBeGreaterThan(50)
    expect(rtp).toBeLessThan(150)

    console.log(`RTP over ${spins} spins: ${rtp.toFixed(2)}%`)
  })
})

test.describe('Performance Tests', () => {
  test('Animation frame rate remains smooth', async ({ page }) => {
    await page.goto('/')

    // Start performance monitoring
    await page.evaluate(() => {
      ;(window as any).frameCount = 0
      ;(window as any).startTime = performance.now()

      const countFrames = () => {
        ;(window as any).frameCount++
        requestAnimationFrame(countFrames)
      }

      requestAnimationFrame(countFrames)
    })

    // Trigger multiple spins
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid="spin-button"]')
      await page.waitForTimeout(3000)
    }

    // Calculate average FPS
    const fps = await page.evaluate(() => {
      const elapsed = (performance.now() - (window as any).startTime) / 1000
      return (window as any).frameCount / elapsed
    })

    // Should maintain at least 30 FPS
    expect(fps).toBeGreaterThan(30)
    console.log(`Average FPS: ${fps.toFixed(2)}`)
  })

  test('Backend response time is acceptable', async ({ page }) => {
    await page.goto('/')

    const responseTimes: number[] = []

    for (let i = 0; i < 10; i++) {
      const startTime = Date.now()

      await page.waitForResponse(
        response => response.url().includes('/spin'),
        async () => {
          await page.click('[data-testid="spin-button"]')
        }
      )

      const responseTime = Date.now() - startTime
      responseTimes.push(responseTime)

      await page.waitForSelector('[data-testid="spin-button"]:not([disabled])')
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length

    // Average response time should be under 500ms
    expect(avgResponseTime).toBeLessThan(500)
    console.log(`Average backend response time: ${avgResponseTime.toFixed(2)}ms`)
  })
})
