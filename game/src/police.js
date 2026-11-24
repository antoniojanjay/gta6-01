// Police and the wanted level: crimes add heat, heat becomes stars, stars
// decide how many police cars and foot officers hunt the player. Police cars
// chase, ram and set roadblocks; foot officers chase on foot and arrest the
// player at close range. Hide long enough with no police nearby and the stars
// fall away one by one.
import { WANTED } from './config.js';
import { makeVehicle } from './vehicles.js';
import { clampToWorld } from './city.js';

export const EVENT_ARRESTED = 1;
export const EVENT_WANTED_UP = 2;
export const EVENT_WANTED_DOWN = 4;

export function addHeat(state, amount) {
  state.heat += amount;
  const stars = Math.min(5, Math.floor(state.heat / 25) + (state.heat > 0 ? 1 : 0));
  // heat 1..24 -> 1 star, 25..49 -> 2, and so on; heat 0 -> 0 stars.
  const wanted = state.heat <= 0 ? 0 : Math.min(5, 1 + Math.floor(state.heat / 25));
  if (wanted > state.wanted) {
    state.wanted = wanted;
    state.hiddenTimer = 0;
    return EVENT_WANTED_UP;
  }
  state.wanted = wanted;
  return 0;
}

export function spawnPoliceCar(state, random) {
  const px = state.player.x;
  const py = state.player.y;
  const angle = random() * Math.PI * 2;
  const dist = 700 + random() * 300;
  const car = makeVehicle('police', px + Math.cos(angle) * dist, py + Math.sin(angle) * dist, angle);
  car.traffic = false;
  car.cruise = 0;
  car.siren = 1;
  const clamped = clampToWorld(car.x, car.y);
  car.x = clamped.x;
  car.y = clamped.y;
  state.policeCars.push(car);
  return car;
}

export function spawnFootCop(state, random) {
  const px = state.player.x;
  const py = state.player.y;
  const angle = random() * Math.PI * 2;
  state.cops.push({
    x: px + Math.cos(angle) * 420, y: py + Math.sin(angle) * 420,
    angle, speed: 250, hp: 40, punchTimer: 0, arrestTimer: 0,
  });
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function turnToward(car, target, dt, rate) {
  let diff = target - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-rate * dt, Math.min(rate * dt, diff));
}

/** One police car chasing the player: steer at them, ram, and slow near roadblocks. */
export function stepPoliceCar(car, dt, state) {
  const p = state.player;
  const target = angleTo(car.x, car.y, p.x, p.y);
  turnToward(car, target, dt, 3.2);
  const dist = Math.hypot(p.x - car.x, p.y - car.y);
  const speed = dist > 120 ? 560 : 420;
  car.speed = speed;
  car.x += Math.cos(car.angle) * speed * dt;
  car.y += Math.sin(car.angle) * speed * dt;
  const clamped = clampToWorld(car.x, car.y);
  car.x = clamped.x;
  car.y = clamped.y;
  // Ramming the player's car slows both and hurts the player a little.
  if (dist < 46) {
    car.speed *= 0.5;
    if (state.player.vehicle) {
      state.player.vehicle.speed *= 0.6;
    } else if (state.player.invuln <= 0) {
      state.player.health -= 6 * dt * 10;
      state.player.invuln = 0.4;
    }
  }
  return car;
}

/** Foot officers run at the player; standing next to one for a second arrests you. */
export function stepFootCop(cop, dt, state) {
  const p = state.player;
  const dist = Math.hypot(p.x - cop.x, p.y - cop.y);
  cop.angle = angleTo(cop.x, cop.y, p.x, p.y);
  if (dist > 30) {
    cop.x += Math.cos(cop.angle) * cop.speed * dt;
    cop.y += Math.sin(cop.angle) * cop.speed * dt;
    cop.arrestTimer = 0;
  } else {
    cop.arrestTimer += dt;
    if (cop.arrestTimer > 1.2 && !p.vehicle) return EVENT_ARRESTED;
  }
  // A cop on foot can punch the player when close.
  if (dist < 40 && cop.punchTimer <= 0 && !p.vehicle) {
    cop.punchTimer = 0.9;
    if (p.invuln <= 0) {
      p.health -= 8;
      p.invuln = 0.5;
    }
  }
  cop.punchTimer -= dt;
  return 0;
}

/** Keep the police force matched to the wanted level, and decay stars while hidden. */
export function stepWanted(state, dt, random) {
  let events = 0;
  const wanted = state.wanted;
  const wantCars = wanted === 0 ? 0 : wanted === 1 ? 1 : Math.min(WANTED.maxCops[wanted], 1 + Math.floor(wanted / 2));
  const wantCops = wanted === 1 ? 2 : wanted >= 3 ? 2 : 0;
  while (state.policeCars.length < wantCars) spawnPoliceCar(state, random);
  while (state.cops.length < wantCops) spawnFootCop(state, random);
  if (state.policeCars.length > wantCars) state.policeCars.length = wantCars;
  if (state.cops.length > wantCops) state.cops.length = wantCops;
  // Hidden: no police within 500 and no recent crime.
  const nearPolice = state.policeCars.some((c) => Math.hypot(c.x - state.player.x, c.y - state.player.y) < 500)
    || state.cops.some((c) => Math.hypot(c.x - state.player.x, c.y - state.player.y) < 400);
  if (wanted > 0 && !nearPolice) {
    state.hiddenTimer += dt;
    if (state.hiddenTimer > WANTED.decayDelay + WANTED.decayStep) {
      state.hiddenTimer = WANTED.decayDelay;
      state.heat = Math.max(0, state.heat - 25);
      const next = state.heat <= 0 ? 0 : Math.min(5, 1 + Math.floor(state.heat / 25));
      if (next < state.wanted) {
        state.wanted = next;
        events |= EVENT_WANTED_DOWN;
      }
    }
  } else {
    state.hiddenTimer = 0;
  }
  return events;
}
