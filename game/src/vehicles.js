// Vehicles: definitions, spawning parked cars, driving physics, and stealing.
// A vehicle is { type, x, y, angle, speed, color, stolen, driver, traffic }.
// Driving is arcade: W/S accelerate and brake, A/D steer harder the faster you go.
import { ROADS_X, ROADS_Y, VEHICLES, WORLD } from './config.js';
import { randPick } from './random.js';
import { clampToWorld, collideBuildings, isOnRoad } from './city.js';

const PARK_TYPES = ['hatchback', 'sedan', 'taxi', 'sports', 'truck', 'van'];
let nextId = 1;

export function makeVehicle(type, x, y, angle) {
  const def = VEHICLES[type];
  return {
    id: nextId += 1, type, name: def.name, x, y, angle, speed: 0,
    color: def.color, len: def.len, wid: def.wid, top: def.top,
    accel: def.accel, steer: def.steer, stolen: false, driver: true,
    traffic: false, police: type === 'police', siren: 0, stuck: 0,
  };
}

export function spawnParkedCars(random, city, count) {
  const cars = [];
  let guard = 0;
  while (cars.length < count && guard < count * 40) {
    guard += 1;
    const vertical = random() < 0.5;
    const rx = randPick(random, ROADS_X);
    const ry = randPick(random, ROADS_Y);
    const x = vertical ? rx + (random() < 0.5 ? -34 : 34) : 120 + random() * (WORLD.width - 240);
    const y = vertical ? 120 + random() * (WORLD.height - 240) : ry + (random() < 0.5 ? -34 : 34);
    if (x > 3100 || y > 2320) continue;
    const car = makeVehicle(randPick(random, PARK_TYPES), x, y, vertical ? Math.PI / 2 : 0);
    car.driver = false;
    cars.push(car);
  }
  return cars;
}

/** Drive one vehicle for dt seconds from throttle (-1..1) and steer (-1..1). */
export function driveVehicle(car, dt, throttle, steer, city) {
  const def = VEHICLES[car.type];
  if (throttle > 0) car.speed += def.accel * throttle * dt;
  else if (throttle < 0) car.speed += def.accel * throttle * dt * 0.7;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 160 * dt);
  if (car.speed > def.top) car.speed = def.top;
  if (car.speed < -def.top * 0.4) car.speed = -def.top * 0.4;
  car.angle += steer * def.steer * dt * Math.min(1, Math.abs(car.speed) / 120) * Math.sign(car.speed || 1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const fixed = collideBuildings(city, nx, ny, car.len / 2);
  if (fixed.hit) car.speed *= 0.4;
  const clamped = clampToWorld(fixed.x, fixed.y);
  car.x = clamped.x;
  car.y = clamped.y;
  return car;
}

/** Nearest stealable car within reach of (x, y), or null. */
export function nearestCar(vehicles, x, y, reach) {
  let best = null;
  let bestD = reach;
  for (const v of vehicles) {
    if (v.police) continue;
    const d = Math.hypot(v.x - x, v.y - y);
    if (d < bestD) { bestD = d; best = v; }
  }
  return best;
}

/** Steal a car: the driver (if any) flees on foot and the car is flagged stolen. */
export function stealCar(car) {
  car.stolen = true;
  car.driver = false;
  car.traffic = false;
  return car;
}

export function carOnRoadBonus(car) {
  return isOnRoad(car.x, car.y) ? 1 : 0.55;
}
