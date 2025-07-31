// Static CS2 symbol images
const SYMBOL_IMAGES = {
    flashbang: '/src/assets/images/flashbang.svg',
    smoke: '/src/assets/images/smoke.svg',
    hegrenade: '/src/assets/images/hegrenade.svg',
    kevlar: '/src/assets/images/kevlar.svg',
    defusekit: '/src/assets/images/defusekit.svg',
    deagle: '/src/assets/images/deagle.svg',
    ak47: '/src/assets/images/ak47.svg',
    awp: '/src/assets/images/awp.svg',
    rush: '/src/assets/images/rush.svg',
    surge: '/src/assets/images/surge.svg',
    slash: '/src/assets/images/slash.svg',
    scatter: '/src/assets/images/scatter.svg'
};

// Get symbol display content (image or emoji fallback)
export function getSymbolDisplay(symbol) {
    const imagePath = SYMBOL_IMAGES[symbol.id];
    if (imagePath) {
        return `<img src="${imagePath}" alt="${symbol.name}" class="symbol-image" />`;
    }
    return symbol.icon;
}

// Preload all symbol images
export function preloadSymbolImages() {
    Object.values(SYMBOL_IMAGES).forEach(imagePath => {
        const img = new Image();
        img.src = imagePath;
    });
    console.log('CS2 symbol images preloaded');
}