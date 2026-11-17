// DOCKMASTER configuration: every tunable number lives here, so tuning
// never means hunting through the simulation or the renderer.
export const VIEW_W = 1280;
export const VIEW_H = 720;

export const COLOURS = [
  { id: 'red', name: 'RED', fill: '#E4572E', dark: '#A83A17', light: '#F2825A' },
  { id: 'yellow', name: 'YELLOW', fill: '#F2C230', dark: '#C79A12', light: '#FFD95E' },
  { id: 'green', name: 'GREEN', fill: '#2FA84F', dark: '#1F7A37', light: '#4CC46E' },
  { id: 'blue', name: 'BLUE', fill: '#2E6FE8', dark: '#1D4CB0', light: '#5B8FF2' },
];
export function colourById(id) {
  return COLOURS.find((c) => c.id === id) || COLOURS[0];
}

export const SHIP_NAMES = [
  'MV PELICAN',
  'MV CORAL',
  'SS HARBOUR LIGHT',
  'MV SEAGULL',
  'SS TIDAL',
  'MV ANCHOR',
  'MV BADAI',
];

// One ship kind per ship index: slot count, timer and wind grow with it.
// Timers are tuned so a careful human finishes with seconds to spare
// and a careless one runs out: ~10s per container early, tighter later.
export const SHIP_PLAN = [
  { slots: 6, timer: 80, wind: 0.0 },
  { slots: 6, timer: 75, wind: 0.1 },
  { slots: 6, timer: 70, wind: 0.2 },
  { slots: 6, timer: 66, wind: 0.35 },
  { slots: 6, timer: 62, wind: 0.5 },
  { slots: 6, timer: 58, wind: 0.65 },
  { slots: 8, timer: 60, wind: 1.0 }, // MV BADAI: double load, storm wind
];

export const DIFFICULTIES = {
  calm: { label: 'CALM', desc: 'Long timers, gentle breeze', timerMult: 1.25, windMult: 0.5, scoreMult: 0.8 },
  breezy: { label: 'BREEZY', desc: 'The intended shift', timerMult: 1.0, windMult: 1.0, scoreMult: 1.0 },
  storm: { label: 'STORM', desc: 'Short timers, howling wind', timerMult: 0.8, windMult: 1.6, scoreMult: 1.3 },
};
export const DIFFICULTY_ORDER = ['calm', 'breezy', 'storm'];

export const WIN_SHIPS = 7;
export const MAX_STRIKES = 3;

export const CRANE = {
  railY: 96,
  minX: 70,
  maxX: 1210,
  trolleySpeed: 560,
  hookSpeed: 430,
  hookMaxLen: 470,
  grabRadiusX: 48,
  grabRadiusY: 34,
};

export const DOCK = {
  groundY: 600,
  berthX: [92, 192, 292, 392],
  containerW: 76,
  containerH: 34,
  maxStack: 3,
};

export const SHIP = {
  hullX0: 560,
  hullX1: 1240,
  deckY: 512,
  slotW: 118,
  slotH: 44,
  slotGapX: 14,
  slotGapY: 12,
  gridX0: 648,
  gridY0: 428,
  bossGridX0: 596,
  bossSlotW: 108,
};

export const SCORING = {
  placeBase: 100,
  shipBonusPerSecond: 10,
  perfectShipBonus: 500,
  gradeSMin: 12000,
};

export const UPGRADES = [
  { id: 'magnet', name: 'DOUBLE MAGNET', desc: 'Hook carries 2 containers at once', icon: '🧲' },
  { id: 'hook', name: 'FAST HOOK', desc: 'Hook rises and lowers 60% faster', icon: '⚡' },
  { id: 'berth', name: 'EXTRA BERTH', desc: 'Containers arrive 40% faster', icon: '📦' },
  { id: 'wind', name: 'WIND STABILIZER', desc: 'Wind sway cut to one third', icon: '🛟' },
  { id: 'wild', name: 'WILD SLOT', desc: 'One slot per ship takes any colour', icon: '🃏' },
];
