// Simple test script to verify the game works without crashes
console.log('🧪 Starting CS2 Game Test...');

// Simulate page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM loaded');
    
    // Wait for game to initialize
    setTimeout(() => {
        if (window.game) {
            console.log('✅ Game instance found');
            testGameplay();
        } else {
            console.error('❌ Game instance not found');
        }
    }, 1000);
});

function testGameplay() {
    let spinCount = 0;
    const maxSpins = 5;
    
    function performTestSpin() {
        if (spinCount >= maxSpins) {
            console.log('🎉 Test completed successfully - no crashes detected');
            return;
        }
        
        console.log(`🎯 Test spin ${spinCount + 1}/${maxSpins}`);
        
        try {
            // Check if game is ready to spin
            if (window.game.isSpinning) {
                console.log('⏳ Game is spinning, waiting...');
                setTimeout(performTestSpin, 2000);
                return;
            }
            
            // Perform spin
            window.game.spin();
            spinCount++;
            
            // Schedule next spin
            setTimeout(performTestSpin, 5000); // Wait 5 seconds between spins
            
        } catch (error) {
            console.error('❌ Error during test spin:', error);
        }
    }
    
    // Start testing
    performTestSpin();
}

// Monitor for crashes
window.addEventListener('error', (event) => {
    console.error('💥 JavaScript Error detected:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('💥 Unhandled Promise Rejection:', event.reason);
});