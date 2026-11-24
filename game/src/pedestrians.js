// Pedestrians: ordinary people of Solara Bay who stroll the sidewalks, cross at
// corners, and run away screaming when a car or a fight comes near. Hitting one
// is a crime: it raises the wanted level, so the crowd is both scenery and risk.
import { WORLD } from './config.js';
import { randInt, randPick } from './random.js';
import { clampToWorld, collideBuildings, isWater } from './city.js';

const SHIRTS = ['#d96a4f', '#4f8ad9', '#7ac94f', '#c94f9e', '#e8d44f', '#9e7ad9', '#4fd9c9', '#e8e8e8'];
let nextId = 1;

export function spawnPed(random, nearX, nearY) {
  const x = Math.max(60, Math.min(WORLD.width - 60, nearX + (random() - 0.5) * 1200));
  const y = Math.max(60, Math.min(WORLD.height - 60, nearY + (random() - 0.5) * 900));
  if (isWater(x, y)) return spawnPed(random, nearX, nearY);
  return {
    id: nextId += 1, x, y, angle: random() * Math.PI * 2,
    speed: 40 + random() * 40, shirt: randPick(random, SHIRTS),
    panic: 0, walkPhase: random() * 6, changeTimer: 2 + random() * 4,
  };
}

export function stepPed(ped, dt, city, dangerX, dangerY, dangerR, random) {
  const danger = Math.hypot(ped.x - dangerX, ped.y - dangerY);
  if (danger < dangerR) ped.panic = 2.5;
  if (ped.panic > 0) {
    ped.panic -= dt;
    ped.angle = Math.atan2(ped.y - dangerY, ped.x - dangerX);
    ped.speed = 190;
  } else {
    ped.changeTimer -= dt;
    if (ped.changeTimer <= 0) {
      ped.changeTimer = 2 + random() * 4;
      ped.angle = randPick(random, [0, Math.PI / 2, Math.PI, -Math.PI / 2]) + (random() - 0.5) * 0.4;
      ped.speed = 40 + random() * 40;
    }
  }
  ped.walkPhase += dt * (ped.panic > 0 ? 14 : 7);
  const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
  const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
  const fixed = collideBuildings(city, nx, ny, 12);
  const clamped = clampToWorld(fixed.x, fixed.y);
  if (fixed.hit) ped.angle += Math.PI / 2;
  ped.x = clamped.x;
  ped.y = clamped.y;
  return ped;
}

/** How many pedestrians the streets hold. */
export function pedCount() {
  return 42;
}

export { randInt };
