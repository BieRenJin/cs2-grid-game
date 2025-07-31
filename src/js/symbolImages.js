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
        return `<img src="${imagePath}" alt="${symbol.name}" class="symbol-image" onerror="this.style.display='none'; this.nextSibling.style.display='inline';" /><span style="display:none;">${symbol.icon}</span>`;
    }
    return symbol.icon;
}

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