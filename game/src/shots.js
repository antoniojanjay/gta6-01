// The screenshot scenes behind ?shot=chase|street|mission|start. Each one plays
// the real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot (drive along a road, walk a downtown loop, stand in the
// robbery), so the frame is what real play looks like and the same seed always
// gives the same frame.
import { STEP } from './config.js';
import { makeVehicle } from './vehicles.js';
import { addHeat } from './police.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const STREET_SECONDS = 6;
const CHASE_SECONDS = 2;
const MISSION_SECONDS = 5;

function stubInput(moveFn) {
  return { move: moveFn, takeActions: () => 0, mouse: () => ({ x: 0, y: 0, down: false }) };
}

function stepFor(world, seconds, moveFn) {
  const input = stubInput(moveFn);
  for (let i = 0; i < seconds / STEP; i += 1) world.step(STEP, input, null);
}

/**
 * Set `world` to the named scene (chase, street, mission or start; any other
 * name is start) and return the screen to draw over it and the best fortune.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  if (name === 'chase') {
    // Cover: a high-speed chase — player in the Falcon GT, three stars, police
    // cars on the tail, the escape mission live on the HUD.
    state.missionIndex = 3;
    state.missionStep = 2;
    state.money = 2450;
    state.hint = '';
    const car = makeVehicle('sports', 900, 1450, 0);
    car.stolen = true;
    car.driver = false;
    state.vehicles.push(car);
    state.player.vehicle = car;
    state.player.x = car.x;
    state.player.y = car.y;
    state.player.angle = 0;
    car.speed = 500;
    addHeat(state, 60);
    state.dialogue = { text: 'Eddie: "Lose them, Leo — the Safehouse is east!"', until: 999 };
    state.elapsed = 0;
    // Clear the chase lane so the cover is a clean high-speed run, not a crash.
    state.vehicles = state.vehicles.filter((v) => v === car || !(Math.abs(v.y - 1450) < 70 && v.x > 700 && v.x < 2800));
    // Three police cars behind, far enough back not to ram the player yet.
    for (let i = 0; i < 3; i += 1) {
      const cop = makeVehicle('police', 900 - 280 - i * 130, 1450 + (i - 1) * 36, 0);
      cop.siren = 1;
      state.policeCars.push(cop);
    }
    stepFor(world, CHASE_SECONDS, () => {
      const steer = Math.max(-1, Math.min(1, (1450 - state.player.y) / 60));
      return { x: steer, y: -1 };
    });
    state.dialogue = { text: 'Eddie: "Lose them, Leo — the Safehouse is east!"', until: state.elapsed + 999 };
    return { screen: SCREEN_PLAY, best: 2450 };
  }
  if (name === 'street') {
    // On foot downtown: traffic, pedestrians, the city itself.
    state.player.x = 1650;
    state.player.y = 1050;
    state.player.angle = 0;
    state.money = 620;
    stepFor(world, STREET_SECONDS, () => {
      const t = state.elapsed;
      if (t < 2) return { x: 0, y: -1 };
      if (t < 4) return { x: 1, y: 0 };
      return { x: 0, y: 0 };
    });
    return { screen: SCREEN_PLAY, best: 620 };
  }
  if (name === 'mission') {
    // Mission in progress: robbing the Corner Store, guards closing in.
    state.missionIndex = 3;
    state.missionStep = 1;
    state.money = 1100;
    state.player.x = 975;
    state.player.y = 1230;
    state.player.angle = Math.PI / 2;
    addHeat(state, 25);
    stepFor(world, MISSION_SECONDS, () => ({ x: 0, y: 0 }));
    state.dialogue = { text: 'Leo: "Cash is mine. Time to run!"', until: state.elapsed + 999 };
    return { screen: SCREEN_PLAY, best: 1100 };
  }
  // Title screen over a living city.
  stepFor(world, 5, () => ({ x: 0, y: 0 }));
  return { screen: SCREEN_TITLE, best: 2450 };
}
