import { CS2GridGame } from './game.js';

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new CS2GridGame();
    console.log('CS2 Grid Battle initialized!');
    
    // Make game instance available globally for debugging
    window.game = game;
});