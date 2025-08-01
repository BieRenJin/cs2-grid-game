import { getSymbolDisplay, preloadSymbolImages } from './symbolImages.js';
import { rtpManager } from './rtp.js';

// CS2-themed symbols configuration
export const SYMBOLS = {
    FLASHBANG: {
        id: 'flashbang',
        name: 'Flashbang',
        icon: '💥',
        color: '#808080',
        tier: 1,
        paytable: {
            5: 0.12, 6: 0.22, 7: 0.35, 8: 0.55, 9: 0.75,
            10: 1.1, 11: 1.6, 12: 2.7, 13: 5.4, 14: 10.8, 15: 21.6
        }
    },
    SMOKE: {
        id: 'smoke',
        name: 'Smoke Grenade',
        icon: '💨',
        color: '#696969',
        tier: 1,
        paytable: {
            5: 0.12, 6: 0.22, 7: 0.35, 8: 0.55, 9: 0.75,
            10: 1.1, 11: 1.6, 12: 2.7, 13: 5.4, 14: 10.8, 15: 21.6
        }
    },
    HE_GRENADE: {
        id: 'hegrenade',
        name: 'HE Grenade',
        icon: '💣',
        color: '#8B4513',
        tier: 2,
        paytable: {
            5: 0.1, 6: 0.3, 7: 0.4, 8: 0.6, 9: 0.8,
            10: 1.2, 11: 2.0, 12: 3.5, 13: 6.0, 14: 12.0, 15: 25.0
        }
    },
    KEVLAR: {
        id: 'kevlar',
        name: 'Kevlar Vest',
        icon: '🛡️',
        color: '#4169E1',
        tier: 2,
        paytable: {
            5: 0.2, 6: 0.3, 7: 0.5, 8: 0.7, 9: 1.0,
            10: 1.5, 11: 2.5, 12: 4.0, 13: 8.0, 14: 15.0, 15: 30.0
        }
    },
    DEFUSE_KIT: {
        id: 'defusekit',
        name: 'Defuse Kit',
        icon: '🔧',
        color: '#32CD32',
        tier: 3,
        paytable: {
            5: 0.2, 6: 0.4, 7: 0.6, 8: 0.9, 9: 1.2,
            10: 1.8, 11: 3.0, 12: 5.0, 13: 10.0, 14: 20.0, 15: 40.0
        }
    },
    DEAGLE: {
        id: 'deagle',
        name: 'Desert Eagle',
        icon: '🔫',
        color: '#FFD700',
        tier: 3,
        paytable: {
            5: 0.3, 6: 0.5, 7: 0.8, 8: 1.2, 9: 1.5,
            10: 2.0, 11: 4.0, 12: 7.0, 13: 12.0, 14: 25.0, 15: 60.0
        }
    },
    AK47: {
        id: 'ak47',
        name: 'AK-47',
        icon: '🔥',
        color: '#FF4500',
        tier: 4,
        paytable: {
            5: 0.5, 6: 0.7, 7: 1.0, 8: 1.5, 9: 2.0,
            10: 3.0, 11: 5.0, 12: 10.0, 13: 15.0, 14: 35.0, 15: 100.0
        }
    },
    AWP: {
        id: 'awp',
        name: 'AWP',
        icon: '🎯',
        color: '#00FF00',
        tier: 5,
        paytable: {
            5: 1.0, 6: 1.5, 7: 2.0, 8: 3.0, 9: 5.0,
            10: 10.0, 11: 15.0, 12: 25.0, 13: 50.0, 14: 100.0, 15: 200.0
        }
    }
};

// Special symbols
export const SPECIAL_SYMBOLS = {
    RUSH: {
        id: 'rush',
        name: 'CT Badge',
        icon: '⭐',
        color: '#FFD700',
        description: 'Adds 4-11 Wild symbols'
    },
    SURGE: {
        id: 'surge',
        name: 'Rainbow Bomb',
        icon: '🌈',
        color: '#FF69B4',
        description: 'Transforms adjacent symbols'
    },
    SLASH: {
        id: 'slash',
        name: 'Karambit',
        icon: '🗡️',
        color: '#8A2BE2',
        description: 'Removes horizontal and vertical lines'
    },
    MULTIPLIER: {
        id: 'multiplier',
        name: 'MVP Star',
        icon: '⭐',
        color: '#FFD700',
        description: 'Multiplies winnings (Free Spins only)'
    },
    SCATTER: {
        id: 'scatter',
        name: 'Bomb',
        icon: '💣',
        color: '#FF0000',
        description: 'Triggers Free Spins'
    }
};

// Get random symbol based on weighted probability
export function getRandomSymbol(includeScatter = false) {
    const weights = [
        { symbol: SYMBOLS.FLASHBANG, weight: rtpManager.getSymbolWeight('flashbang') },
        { symbol: SYMBOLS.SMOKE, weight: rtpManager.getSymbolWeight('smoke') },
        { symbol: SYMBOLS.HE_GRENADE, weight: rtpManager.getSymbolWeight('hegrenade') },
        { symbol: SYMBOLS.KEVLAR, weight: rtpManager.getSymbolWeight('kevlar') },
        { symbol: SYMBOLS.DEFUSE_KIT, weight: rtpManager.getSymbolWeight('defusekit') },
        { symbol: SYMBOLS.DEAGLE, weight: rtpManager.getSymbolWeight('deagle') },
        { symbol: SYMBOLS.AK47, weight: rtpManager.getSymbolWeight('ak47') },
        { symbol: SYMBOLS.AWP, weight: rtpManager.getSymbolWeight('awp') }
    ];
    
    // Add scatter symbol with RTP-controlled probability if enabled
    if (includeScatter && rtpManager.shouldAppearSpecialSymbol('scatter')) {
        weights.push({ symbol: SPECIAL_SYMBOLS.SCATTER, weight: 0.5 });
    }
    
    const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of weights) {
        random -= item.weight;
        if (random <= 0) {
            console.log(`🎲 Selected symbol: ${item.symbol.name} (${item.symbol.id})`);
            return item.symbol;
        }
    }
    
    console.log(`🎲 Fallback symbol: ${weights[0].symbol.name}`);
    return weights[0].symbol;
}

// Initialize symbol images with logging
export function initializeSymbolImages() {
    console.log('🎮 Initializing CS2 symbol images...');
    console.log('📊 Available symbols:', Object.keys(SYMBOLS));
    console.log('⭐ Special symbols:', Object.keys(SPECIAL_SYMBOLS));
    preloadSymbolImages();
}

// Enhanced getSymbolDisplay with logging
export function getSymbolDisplayWithLog(symbol) {
    const result = getSymbolDisplay(symbol);
    const hasImage = result.includes('<img');
    console.log(`🎨 Symbol ${symbol.id} (${symbol.name}): ${hasImage ? 'Using SVG image' : 'Using emoji fallback'}`);
    return result;
}

// Export both versions
export { getSymbolDisplay };

// Get symbol array as list for easier access
export const SYMBOL_LIST = Object.values(SYMBOLS);