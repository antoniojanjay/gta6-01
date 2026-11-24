// Solara Bay — tuning, palette and city layout for "Sunset Streets: Solara Bay",
// a 2D top-down open-world crime game. All numbers live here so the rest of the
// game reads like rules, not magic constants.
export const STEP = 1 / 60;
export const WORLD = { width: 3600, height: 2600 };
export const VIEW = { width: 1280, height: 720 };

// Road grid: vertical roads at these x centres, horizontal at these y centres.
export const ROADS_X = [300, 750, 1200, 1650, 2100, 2550, 3000, 3300];
export const ROADS_Y = [250, 650, 1050, 1450, 1850, 2250];
export const ROAD_W = 96;

export const PLAYER = { radius: 14, walkSpeed: 230, runSpeed: 330, health: 100 };
export const CAMERA = { lookahead: 60 };

// Vehicle types: top speed, acceleration, steering and colour. No real-world names.
export const VEHICLES = {
  hatchback: { name: 'Pipit', top: 420, accel: 300, steer: 2.6, len: 52, wid: 26, color: '#c94f4f' },
  sedan: { name: 'Comet', top: 480, accel: 340, steer: 2.4, len: 58, wid: 27, color: '#4f7ec9' },
  taxi: { name: 'Sun Cab', top: 460, accel: 320, steer: 2.5, len: 58, wid: 27, color: '#e8b93c' },
  sports: { name: 'Falcon GT', top: 640, accel: 520, steer: 3.1, len: 60, wid: 26, color: '#d7263d' },
  truck: { name: 'Mule', top: 360, accel: 220, steer: 1.9, len: 76, wid: 30, color: '#7a8a99' },
  van: { name: 'Carrier', top: 400, accel: 260, steer: 2.1, len: 66, wid: 30, color: '#8a7ad9' },
  police: { name: 'Interceptor', top: 580, accel: 460, steer: 3.0, len: 60, wid: 27, color: '#22303f' },
};

export const WANTED = {
  decayDelay: 14, // seconds hidden before stars start falling
  decayStep: 6, // seconds per star lost while hidden
  maxCops: [0, 2, 3, 5, 7, 9],
};

export const MONEY_START = 120;
export const SAVE_KEY = 'solara-bay.save.v1';
export const BEST_KEY = 'solara-bay.best.v1';

export const PALETTE = {
  backdrop: '#0d1420',
  grass: '#5d8a4a',
  park: '#4c7a3e',
  sand: '#d9c27a',
  water: '#2e6f9e',
  waterDeep: '#1d4f78',
  road: '#3a3f47',
  roadLine: '#c9b458',
  sidewalk: '#8a8d94',
  building: '#6b5a49',
  building2: '#7d6b5a',
  building3: '#5a6b7d',
  roof: '#4a3f35',
  text: '#f2f4f6',
  muted: '#b9c0c9',
  gold: '#f2c94c',
  red: '#e5534b',
  blue: '#4fc3f7',
  police: '#3d7bd9',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// Landmarks of Solara Bay (original names, placed on the map for the minimap and missions).
export const LANDMARKS = [
  { name: 'Solara Pier', x: 3300, y: 2250, kind: 'pier' },
  { name: 'Marina Harbor', x: 3350, y: 1050, kind: 'harbor' },
  { name: 'Palm Park', x: 1425, y: 850, kind: 'park' },
  { name: 'Sunset Beach', x: 1800, y: 2520, kind: 'beach' },
  { name: 'Grand Plaza', x: 1875, y: 1250, kind: 'plaza' },
  { name: 'North Mall', x: 975, y: 450, kind: 'mall' },
  { name: 'Riverside Diner', x: 2325, y: 1650, kind: 'diner' },
  { name: 'Safehouse', x: 525, y: 2050, kind: 'safehouse' },
  { name: 'City Bank', x: 1875, y: 850, kind: 'bank' },
  { name: 'Corner Store', x: 975, y: 1250, kind: 'store' },
];
