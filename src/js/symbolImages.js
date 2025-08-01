// Static CS2 symbol images
const SYMBOL_IMAGES = {
    flashbang: '/assets/images/flashbang.svg',
    smoke: '/assets/images/smoke.svg',
    hegrenade: '/assets/images/hegrenade.svg',
    kevlar: '/assets/images/kevlar.svg',
    defusekit: '/assets/images/defusekit.svg',
    deagle: '/assets/images/deagle.svg',
    ak47: '/assets/images/ak47.svg',
    awp: '/assets/images/awp.svg',
    rush: '/assets/images/rush.svg',
    surge: '/assets/images/surge.svg',
    slash: '/assets/images/slash.svg',
    scatter: '/assets/images/scatter.svg'
};

// Get symbol display content (image or emoji fallback)
export function getSymbolDisplay(symbol) {
    const imagePath = SYMBOL_IMAGES[symbol.id];
    if (imagePath) {
        return `<img src="${imagePath}" alt="${symbol.name}" class="symbol-image" onerror="handleImageError(this)" /><span style="display:none;">${symbol.icon}</span>`;
    }
    return symbol.icon;
}

// Safe image error handler
window.handleImageError = function(img) {
    try {
        if (!img || !img.parentNode) {
            console.warn('Image element not found or already removed');
            return;
        }
        
        // Hide the failed image
        img.style.display = 'none';
        
        // Show emoji fallback if it exists
        let fallbackSpan = img.nextSibling;
        let attempts = 0;
        
        // Try to find the fallback span within reasonable range
        while (fallbackSpan && attempts < 3) {
            if (fallbackSpan.nodeType === 1 && fallbackSpan.tagName === 'SPAN') {
                fallbackSpan.style.display = 'inline';
                console.log('🔄 Switched to emoji fallback for failed image');
                return;
            }
            fallbackSpan = fallbackSpan.nextSibling;
            attempts++;
        }
        
        // If no fallback found, add one
        const parent = img.parentNode;
        if (parent) {
            const fallback = document.createElement('span');
            fallback.textContent = '❓'; // Default fallback
            fallback.style.display = 'inline';
            parent.appendChild(fallback);
            console.log('📝 Added default fallback for failed image');
        }
        
    } catch (error) {
        console.error('Error handling image fallback:', error);
        // Completely fail silently to prevent cascading errors
    }
};

// Preload all symbol images
export function preloadSymbolImages() {
    Object.entries(SYMBOL_IMAGES).forEach(([symbolId, imagePath]) => {
        const img = new Image();
        img.onload = () => console.log(`✅ Loaded: ${symbolId}`);
        img.onerror = () => console.error(`❌ Failed to load: ${symbolId} from ${imagePath}`);
        img.src = imagePath;
    });
    console.log('🎮 Preloading CS2 symbol images...');
}