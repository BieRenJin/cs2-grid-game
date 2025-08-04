// CS2-themed symbols configuration
export interface Symbol {
  id: string
  name: string
  icon: string
  color: string
  tier: number
  isWild?: boolean
  isSpecial?: boolean
  paytable: Record<number, number> // cluster size -> multiplier
}

export const SYMBOLS: Record<string, Symbol> = {
  FLASHBANG: {
    id: 'flashbang',
    name: 'Flashbang',
    icon: '💥',
    color: '#808080',
    tier: 1,
    paytable: {
      5: 0.05,
      6: 0.08,
      7: 0.12,
      8: 0.18,
      9: 0.25,
      10: 0.35,
      11: 0.5,
      12: 0.8,
      13: 1.2,
      14: 2.0,
      15: 3.5,
    },
  },
  SMOKE: {
    id: 'smoke',
    name: 'Smoke Grenade',
    icon: '💨',
    color: '#696969',
    tier: 1,
    paytable: {
      5: 0.05,
      6: 0.08,
      7: 0.12,
      8: 0.18,
      9: 0.25,
      10: 0.35,
      11: 0.5,
      12: 0.8,
      13: 1.2,
      14: 2.0,
      15: 3.5,
    },
  },
  HE_GRENADE: {
    id: 'hegrenade',
    name: 'HE Grenade',
    icon: '💣',
    color: '#8B4513',
    tier: 2,
    paytable: {
      5: 0.08,
      6: 0.12,
      7: 0.18,
      8: 0.25,
      9: 0.35,
      10: 0.5,
      11: 0.8,
      12: 1.2,
      13: 2.0,
      14: 3.5,
      15: 6.0,
    },
  },
  KEVLAR: {
    id: 'kevlar',
    name: 'Kevlar Vest',
    icon: '🛡️',
    color: '#4169E1',
    tier: 2,
    paytable: {
      5: 0.1,
      6: 0.15,
      7: 0.22,
      8: 0.32,
      9: 0.45,
      10: 0.65,
      11: 1.0,
      12: 1.5,
      13: 2.5,
      14: 4.0,
      15: 7.0,
    },
  },
  DEFUSE_KIT: {
    id: 'defuse',
    name: 'Defuse Kit',
    icon: '🔧',
    color: '#32CD32',
    tier: 3,
    paytable: {
      5: 0.15,
      6: 0.25,
      7: 0.35,
      8: 0.5,
      9: 0.75,
      10: 1.1,
      11: 1.6,
      12: 2.5,
      13: 4.0,
      14: 6.5,
      15: 11.0,
    },
  },
  DEAGLE: {
    id: 'deagle',
    name: 'Desert Eagle',
    icon: '🔫',
    color: '#DAA520',
    tier: 3,
    paytable: {
      5: 0.2,
      6: 0.3,
      7: 0.45,
      8: 0.65,
      9: 0.95,
      10: 1.4,
      11: 2.1,
      12: 3.2,
      13: 5.0,
      14: 8.0,
      15: 13.0,
    },
  },
  AK47: {
    id: 'ak47',
    name: 'AK-47',
    icon: '🔫',
    color: '#8B0000',
    tier: 4,
    paytable: {
      5: 0.3,
      6: 0.5,
      7: 0.75,
      8: 1.1,
      9: 1.6,
      10: 2.4,
      11: 3.6,
      12: 5.5,
      13: 8.5,
      14: 13.0,
      15: 20.0,
    },
  },
  AWP: {
    id: 'awp',
    name: 'AWP',
    icon: '🎯',
    color: '#4B0082',
    tier: 4,
    paytable: {
      5: 0.5,
      6: 0.8,
      7: 1.2,
      8: 1.8,
      9: 2.7,
      10: 4.0,
      11: 6.0,
      12: 9.0,
      13: 14.0,
      14: 22.0,
      15: 35.0,
    },
  },
}

export const SPECIAL_SYMBOLS: Record<string, Symbol> = {
  RUSH: {
    id: 'rush',
    name: 'Rush',
    icon: '🌟',
    color: '#FFD700',
    tier: 5,
    isSpecial: true,
    paytable: {}, // Special symbols don't have standard payouts
  },
  SURGE: {
    id: 'surge',
    name: 'Surge',
    icon: '🌈',
    color: '#FF69B4',
    tier: 5,
    isSpecial: true,
    paytable: {},
  },
  SLASH: {
    id: 'slash',
    name: 'Slash',
    icon: '⚔️',
    color: '#FF4500',
    tier: 5,
    isSpecial: true,
    paytable: {},
  },
}

export const ALL_SYMBOLS = { ...SYMBOLS, ...SPECIAL_SYMBOLS }

// Symbol weights for RNG
export const SYMBOL_WEIGHTS = {
  [SYMBOLS.FLASHBANG.id]: 20,
  [SYMBOLS.SMOKE.id]: 20,
  [SYMBOLS.HE_GRENADE.id]: 15,
  [SYMBOLS.KEVLAR.id]: 15,
  [SYMBOLS.DEFUSE_KIT.id]: 12,
  [SYMBOLS.DEAGLE.id]: 10,
  [SYMBOLS.AK47.id]: 6,
  [SYMBOLS.AWP.id]: 4,
  // Special symbols (rare)
  [SPECIAL_SYMBOLS.RUSH.id]: 0.8,
  [SPECIAL_SYMBOLS.SURGE.id]: 0.6,
  [SPECIAL_SYMBOLS.SLASH.id]: 0.6,
}
