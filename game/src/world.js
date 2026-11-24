// The world's rules and state, with no drawing in it: the player on foot and in
// cars, traffic and pedestrians, police and the wanted level, missions, combat,
// money, the clock and the camera. step() advances one fixed step and returns
// what happened as bit flags, so the caller can react (sounds, announcements)
// without the world knowing about screens.
import { MONEY_START, PLAYER, STEP, VEHICLES, WORLD } from './config.js';
import { buildCity, clampToWorld, collideBuildings, isWater, pointInBuilding } from './city.js';
import { driveVehicle, makeVehicle, nearestCar, spawnParkedCars, stealCar } from './vehicles.js';
import { spawnTrafficCar, stepTrafficCar, trafficCountFor } from './traffic.js';
import { pedCount, spawnPed, stepPed } from './pedestrians.js';
import { addHeat, stepFootCop, stepPoliceCar, stepWanted } from './police.js';
import { MISSIONS, currentStep, startMission, updateMission } from './missions.js';
import { playerPunch, playerShoot, regenHealth, spawnEnemy, stepBullets, stepEnemies } from './combat.js';

export const EVENT_OVER = 1;
export const EVENT_WANTED_UP = 2;
export const EVENT_MISSION_DONE = 4;
export const EVENT_CRIME = 8;
export const EVENT_ARRESTED = 16;

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function createWorld(random) {
  const city = buildCity(random);
  const state = {
    random, city, elapsed: 0, clock: 16.2, money: MONEY_START,
    wanted: 0, heat: 0, hiddenTimer: 0,
    missionIndex: 0, missionStep: 0, missionsDone: 0, storyDone: false,
    dialogue: null, pendingIntro: null, hint: 'WASD move · E steal car · F punch · Click shoot · P pause',
    player: {
      x: 525, y: 2050, angle: 0, health: PLAYER.health, invuln: 0,
      vehicle: null, punchTimer: 0, shootTimer: 0, punchAnim: 0,
    },
    camera: { x: 0, y: 0 },
    vehicles: [], policeCars: [], cops: [], peds: [], enemies: [],
    bullets: [], particles: [], chaseTarget: null,
    robTimer: 0, followTimer: 0, missionStepProgress: 0,
    ammo: 24, muzzle: 0, guardStepKey: '', robHeatGiven: false,
    stats: { carsStolen: 0, pedsHit: 0, missionsDone: 0 },
    night: false,
  };

  function reset() {
    state.elapsed = 0;
    state.clock = 16.2;
    state.money = MONEY_START;
    state.wanted = 0;
    state.heat = 0;
    state.hiddenTimer = 0;
    state.missionIndex = 0;
    state.missionStep = 0;
    state.missionsDone = 0;
    state.storyDone = false;
    state.dialogue = null;
    state.pendingIntro = null;
    state.player.x = 525;
    state.player.y = 2050;
    state.player.angle = 0;
    state.player.health = PLAYER.health;
    state.player.invuln = 0;
    state.player.vehicle = null;
    state.player.punchTimer = 0;
    state.player.shootTimer = 0;
    state.vehicles = [];
    state.policeCars = [];
    state.cops = [];
    state.peds = [];
    state.enemies = [];
    state.bullets = [];
    state.particles = [];
    state.chaseTarget = null;
    state.robTimer = 0;
    state.followTimer = 0;
    state.missionStepProgress = 0;
    state.ammo = 24;
    state.guardStepKey = '';
    state.robHeatGiven = false;
    state.stats = { carsStolen: 0, pedsHit: 0, missionsDone: 0 };
    // Parked cars, plus the Falcon GT the Hot Wheels job needs at Grand Plaza.
    state.vehicles = spawnParkedCars(random, city, 16);
    const falcon = makeVehicle('sports', 1875, 1180, 0);
    falcon.driver = false;
    state.vehicles.push(falcon);
    for (let i = 0; i < trafficCountFor(0); i += 1) {
      state.vehicles.push(spawnTrafficCar(random, state.player.x, state.player.y));
    }
    for (let i = 0; i < pedCount(); i += 1) {
      state.peds.push(spawnPed(random, state.player.x, state.player.y));
    }
    state.camera.x = state.player.x - 640;
    state.camera.y = state.player.y - 360;
    startMission(state);
  }

  function addParticles(x, y, color, n) {
    for (let i = 0; i < n; i += 1) {
      state.particles.push({
        x, y, vx: (random() - 0.5) * 260, vy: (random() - 0.5) * 260,
        life: 0.5 + random() * 0.4, color,
      });
    }
  }

  function movePlayer(dt, move) {
    const p = state.player;
    if (p.vehicle) {
      const car = p.vehicle;
      const throttle = -move.y;
      const steer = move.x;
      driveVehicle(car, dt, throttle, steer, city);
      p.x = car.x;
      p.y = car.y;
      p.angle = car.angle;
      // Running over a pedestrian is a crime.
      for (let i = state.peds.length - 1; i >= 0; i -= 1) {
        const ped = state.peds[i];
        if (Math.abs(car.speed) > 120 && dist(ped.x, ped.y, car.x, car.y) < 30) {
          state.peds.splice(i, 1);
          state.stats.pedsHit += 1;
          addParticles(ped.x, ped.y, '#e5534b', 10);
          addHeat(state, 12);
          state.peds.push(spawnPed(random, p.x, p.y));
        }
      }
      // Bumping traffic cars slows both and dents tempers.
      for (const v of state.vehicles) {
        if (v === car || v.police) continue;
        if (dist(v.x, v.y, car.x, car.y) < 44 && Math.abs(car.speed) > 150) {
          car.speed *= 0.55;
          v.speed = 0;
          addParticles(v.x, v.y, '#f2c94c', 6);
          if (v.traffic) addHeat(state, 4);
        }
      }
      return;
    }
    const len = Math.hypot(move.x, move.y);
    if (len > 0) {
      const speed = PLAYER.walkSpeed;
      const nx = p.x + (move.x / len) * speed * dt;
      const ny = p.y + (move.y / len) * speed * dt;
      p.angle = Math.atan2(move.y, move.x);
      const fixed = collideBuildings(city, nx, ny, PLAYER.radius);
      let cx = fixed.x;
      let cy = fixed.y;
      if (isWater(cx, cy)) { cx = p.x; cy = p.y; }
      const clamped = clampToWorld(cx, cy);
      p.x = clamped.x;
      p.y = clamped.y;
    }
  }

  /** E: get in the nearest car, or get out of the one you are driving. */
  function tryEnterExitCar() {
    const p = state.player;
    if (p.vehicle) {
      const car = p.vehicle;
      car.speed = 0;
      p.vehicle = null;
      const nx = car.x + Math.cos(car.angle + Math.PI / 2) * 40;
      const ny = car.y + Math.sin(car.angle + Math.PI / 2) * 40;
      const fixed = collideBuildings(city, nx, ny, PLAYER.radius);
      p.x = fixed.x;
      p.y = fixed.y;
      p.angle = car.angle;
      return 'exit';
    }
    const car = nearestCar(state.vehicles, p.x, p.y, 78);
    if (!car) return 'none';
    if (car.driver) {
      // The driver bails and runs; stealing a occupied car is a crime.
      car.driver = false;
      state.peds.push({
        id: 9000 + car.id, x: car.x + 30, y: car.y + 30, angle: 0,
        speed: 190, shirt: '#e8e8e8', panic: 3, walkPhase: 0, changeTimer: 0,
      });
    }
    // Stealing any car — parked or occupied — is grand theft: it raises the heat.
    if (!car.stolen) addHeat(state, 8);
    stealCar(car);
    state.stats.carsStolen += 1;
    p.vehicle = car;
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    return 'enter';
  }

  function maintainCrowd() {
    const wantTraffic = trafficCountFor(state.wanted);
    let traffic = 0;
    for (const v of state.vehicles) if (v.traffic) traffic += 1;
    while (traffic < wantTraffic) {
      state.vehicles.push(spawnTrafficCar(random, state.player.x, state.player.y));
      traffic += 1;
    }
    while (state.peds.length < pedCount()) {
      state.peds.push(spawnPed(random, state.player.x, state.player.y));
    }
    // Drop traffic that wandered far away.
    state.vehicles = state.vehicles.filter((v) => {
      if (v.traffic && dist(v.x, v.y, state.player.x, state.player.y) > 2200) return false;
      return true;
    });
  }

  function missionSideEffects(dt) {
    const step = currentStep(state);
    if (!step) return;
    // Robbery guards appear once per robbery step.
    if (step.type === 'rob') {
      const key = state.missionIndex + '-' + state.missionStep;
      if (state.guardStepKey !== key) {
        state.guardStepKey = key;
        spawnEnemy(state, step.x - 60, step.y - 40);
        spawnEnemy(state, step.x + 60, step.y + 40);
        state.dialogue = { text: 'Guard: "Hey! Nobody moves!"', until: state.elapsed + 3 };
      }
      if (!state.robHeatGiven && state.robTimer > 0) {
        state.robHeatGiven = true;
        addHeat(state, 25);
      }
      state.missionStepProgress = Math.min(1, (state.robTimer || 0) / (step.hold || 5));
    } else if (step.type === 'follow') {
      state.missionStepProgress = Math.min(1, (state.followTimer || 0) / (step.hold || 5));
    } else {
      state.missionStepProgress = 0;
      state.robHeatGiven = false;
    }
    // The courier van for the tail job.
    if (state.missionIndex === 2 && !state.chaseTarget) {
      const van = makeVehicle('van', 2100, 1050, 0);
      van.traffic = false;
      van.driver = true;
      state.chaseTarget = van;
      state.vehicles.push(van);
      state.chaseWaypoints = [
        { x: 1200, y: 1050 }, { x: 1200, y: 1850 }, { x: 750, y: 1850 },
      ];
      state.chaseWp = 0;
    }
    if (state.chaseTarget) {
      const t = state.chaseTarget;
      const wp = state.chaseWaypoints ? state.chaseWaypoints[state.chaseWp] : null;
      if (wp) {
        const a = Math.atan2(wp.y - t.y, wp.x - t.x);
        let diff = a - t.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        t.angle += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
        t.speed = 210;
        t.x += Math.cos(t.angle) * t.speed * dt;
        t.y += Math.sin(t.angle) * t.speed * dt;
        if (dist(t.x, t.y, wp.x, wp.y) < 60) state.chaseWp += 1;
      }
    }
  }

  function step(dt, input, audio) {
    let events = 0;
    state.elapsed += dt;
    state.clock = (16.2 + state.elapsed / 120) % 24;
    state.night = state.clock >= 19.5 || state.clock < 6;
    const move = input.move();
    movePlayer(dt, move);
    // Traffic.
    for (const v of state.vehicles) {
      if (v.traffic) stepTrafficCar(v, dt, city, state.player.x, state.player.y, random);
    }
    // Pedestrians panic near a speeding player or a fight.
    const dangerR = state.player.vehicle ? 220 : 140;
    for (const ped of state.peds) {
      stepPed(ped, dt, city, state.player.x, state.player.y, dangerR, random);
    }
    maintainCrowd();
    // Missions.
    missionSideEffects(dt);
    const prevStep = currentStep(state);
    const missionEvent = updateMission(state, dt);
    if (missionEvent === 'done') {
      events |= EVENT_MISSION_DONE;
      state.stats.missionsDone = state.missionsDone;
      if (audio) audio.missionDone();
      if (audio) audio.cash();
    } else if (missionEvent === 'step' && prevStep && prevStep.type === 'rob') {
      addHeat(state, state.missionIndex === 5 ? 50 : 25);
    }
    if (state.pendingIntro) {
      state.dialogue = { text: state.pendingIntro, until: state.elapsed + 5 };
      state.pendingIntro = null;
    }
    // Police.
    events |= stepWanted(state, dt, random);
    for (const car of state.policeCars) stepPoliceCar(car, dt, state);
    for (let i = state.cops.length - 1; i >= 0; i -= 1) {
      const r = stepFootCop(state.cops[i], dt, state);
      if (r) events |= EVENT_ARRESTED;
    }
    // Combat.
    stepBullets(state, dt);
    stepEnemies(state, dt);
    regenHealth(state, dt);
    // Particles.
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const pt = state.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }
    // Camera follows the player with a little lookahead.
    const p = state.player;
    const tx = p.x + Math.cos(p.angle) * 60 - 640;
    const ty = p.y + Math.sin(p.angle) * 60 - 360;
    state.camera.x += (tx - state.camera.x) * Math.min(1, dt * 4);
    state.camera.y += (ty - state.camera.y) * Math.min(1, dt * 4);
    state.camera.x = Math.max(-40, Math.min(WORLD.width - 1240, state.camera.x));
    state.camera.y = Math.max(-40, Math.min(WORLD.height - 680, state.camera.y));
    // Audio cues.
    if (audio) {
      const driving = !!p.vehicle;
      audio.engine(driving ? Math.abs(p.vehicle.speed) / VEHICLES[p.vehicle.type].top : 0, driving);
      audio.siren(state.policeCars.length > 0, state.elapsed);
    }
    if (p.health <= 0) events |= EVENT_OVER;
    if (state.wanted > 0 && events & 0) { /* reserved */ }
    return events;
  }

  reset();
  return { state, reset, step, tryEnterExitCar, addParticles };
}

export { playerPunch, playerShoot };
