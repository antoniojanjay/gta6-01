// Traffic: civilian cars that cruise the road grid, stop for nothing, and panic
// when the player rams them. Each traffic car picks a road, a direction and a
// cruise speed, turns at intersections, and respawns far away when it leaves
// the player's neighbourhood.
import { ROADS_X, ROADS_Y, VEHICLES } from './config.js';
import { randPick } from './random.js';
import { driveVehicle, makeVehicle } from './vehicles.js';
import { nearestRoadPoint } from './city.js';

const CIV_TYPES = ['hatchback', 'sedan', 'taxi', 'truck', 'van'];

export function spawnTrafficCar(random, nearX, nearY) {
  const vertical = random() < 0.5;
  const x = vertical ? randPick(random, ROADS_X) + (random() < 0.5 ? -18 : 18)
    : nearX + (random() - 0.5) * 1400;
  const y = vertical ? nearY + (random() - 0.5) * 1400
    : randPick(random, ROADS_Y) + (random() < 0.5 ? -18 : 18);
  const car = makeVehicle(randPick(random, CIV_TYPES), x, y, vertical ? Math.PI / 2 : 0);
  car.traffic = true;
  car.driver = true;
  car.cruise = 140 + random() * 120;
  car.dir = random() < 0.5 ? 1 : -1;
  if (vertical) car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  else car.angle = car.dir > 0 ? 0 : Math.PI;
  return car;
}

function angleTo(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

function turnToward(car, target, dt, rate) {
  let diff = target - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-rate * dt, Math.min(rate * dt, diff));
}

/** Steer one traffic car along the grid toward its cruise speed. */
export function stepTrafficCar(car, dt, city, playerX, playerY, random) {
  const road = nearestRoadPoint(car.x, car.y);
  const onVertical = Math.abs(car.x - road.x) < 40;
  // At an intersection, sometimes turn onto the crossing road.
  const atX = ROADS_X.some((rx) => Math.abs(car.x - rx) < 26);
  const atY = ROADS_Y.some((ry) => Math.abs(car.y - ry) < 26);
  if (atX && atY && random() < dt * 0.25) {
    car.vertical = !car.vertical;
  }
  let target;
  if (car.vertical === undefined) car.vertical = onVertical;
  if (car.vertical) {
    target = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    // stay on the road's lane
    const laneX = road.x + (car.dir > 0 ? 18 : -18);
    car.x += (laneX - car.x) * Math.min(1, dt * 2);
  } else {
    target = car.dir > 0 ? 0 : Math.PI;
    const laneY = road.y + (car.dir > 0 ? 18 : -18);
    car.y += (laneY - car.y) * Math.min(1, dt * 2);
  }
  turnToward(car, target, dt, 2.2);
  // Panic: a nearby speeding player makes traffic swerve away.
  const playerNear = Math.hypot(car.x - playerX, car.y - playerY) < 160;
  const speed = playerNear ? car.cruise * 1.5 : car.cruise;
  const nx = car.x + Math.cos(car.angle) * speed * dt;
  const ny = car.y + Math.sin(car.angle) * speed * dt;
  car.x = nx;
  car.y = ny;
  car.speed = speed;
  // Keep the car inside the map; flip direction at the edge.
  if (car.x < 80 || car.x > 3440 || car.y < 80 || car.y > 2360) car.dir *= -1;
  return car;
}

export function trafficCountFor(wanted) {
  return 14 + Math.max(0, 3 - wanted);
}

export { driveVehicle, VEHICLES };
