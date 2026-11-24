// Solara Bay's city: a road grid with blocks of buildings, a park, a beach and a
// harbor. buildCity generates the building rectangles once from a seeded random
// function; the helpers answer "is this point on a road / inside a building /
// in the water" for movement, traffic and the renderer.
import { LANDMARKS, ROADS_X, ROADS_Y, ROAD_W, WORLD } from './config.js';
import { randInt } from './random.js';

const BEACH_TOP = 2380; // south strip: sand, then water
const WATER_TOP = 2500;
const HARBOR_X = 3180; // east strip: harbor water

export function buildCity(random) {
  const buildings = [];
  const trees = [];
  const colors = ['#6b5a49', '#7d6b5a', '#5a6b7d', '#75604e', '#64707e'];
  for (let ix = 0; ix < ROADS_X.length - 1; ix += 1) {
    for (let iy = 0; iy < ROADS_Y.length - 1; iy += 1) {
      const x0 = ROADS_X[ix] + ROAD_W / 2 + 14;
      const x1 = ROADS_X[ix + 1] - ROAD_W / 2 - 14;
      const y0 = ROADS_Y[iy] + ROAD_W / 2 + 14;
      const y1 = ROADS_Y[iy + 1] - ROAD_W / 2 - 14;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      // Palm Park block stays open green; the plaza block stays open paved.
      if (Math.abs(cx - 1425) < 200 && Math.abs(cy - 850) < 200) {
        for (let t = 0; t < 14; t += 1) {
          trees.push({ x: x0 + random() * (x1 - x0), y: y0 + random() * (y1 - y0) });
        }
        continue;
      }
      if (Math.abs(cx - 1875) < 200 && Math.abs(cy - 1250) < 200) continue;
      if (cy > BEACH_TOP - 60) continue; // beach blocks stay open
      if (cx > HARBOR_X - 60) continue; // harbor blocks stay open
      const count = randInt(random, 2, 5);
      for (let b = 0; b < count; b += 1) {
        const w = randInt(random, 70, 150);
        const h = randInt(random, 60, 120);
        const x = x0 + random() * Math.max(1, x1 - x0 - w);
        const y = y0 + random() * Math.max(1, y1 - y0 - h);
        buildings.push({
          x, y, w, h,
          color: colors[Math.floor(random() * colors.length)],
          tall: random() < 0.3,
        });
      }
      if (random() < 0.6) trees.push({ x: x0 + random() * (x1 - x0), y: y0 + random() * (y1 - y0) });
    }
  }
  return { buildings, trees, landmarks: LANDMARKS };
}

export function isOnRoad(x, y) {
  for (const rx of ROADS_X) if (Math.abs(x - rx) <= ROAD_W / 2) return true;
  for (const ry of ROADS_Y) if (Math.abs(y - ry) <= ROAD_W / 2) return true;
  return false;
}

export function isWater(x, y) {
  return y >= WATER_TOP || x >= HARBOR_X + 120;
}

export function isBeach(x, y) {
  return y >= BEACH_TOP && y < WATER_TOP && x < HARBOR_X;
}

/** Nearest road centre point to (x, y): traffic and the autopilot steer toward it. */
export function nearestRoadPoint(x, y) {
  let bestX = ROADS_X[0];
  let bestD = Infinity;
  for (const rx of ROADS_X) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; bestX = rx; }
  }
  let bestY = ROADS_Y[0];
  bestD = Infinity;
  for (const ry of ROADS_Y) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; bestY = ry; }
  }
  // Prefer the road the point is already closest to travelling along.
  if (Math.abs(x - bestX) < Math.abs(y - bestY)) return { x: bestX, y, vertical: true };
  return { x, y: bestY, vertical: false };
}

/** Push a circle out of every building it overlaps; returns true if it hit one. */
export function collideBuildings(city, x, y, r) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      hit = true;
      if (d2 > 0.01) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r;
        y = cy + (dy / d) * r;
      } else {
        y = b.y - r;
      }
    }
  }
  return { x, y, hit };
}

export function pointInBuilding(city, x, y) {
  for (const b of city.buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
  }
  return false;
}

export function clampToWorld(x, y) {
  return {
    x: Math.max(20, Math.min(WORLD.width - 20, x)),
    y: Math.max(20, Math.min(WORLD.height - 20, y)),
  };
}
