// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. Screens: title, play, paused, game over. Progress saves
// to localStorage whenever a mission completes and every 15 seconds.
//
// ?seed=N fixes the random city. ?shot=chase|street|mission|start (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, SAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_ARRESTED, EVENT_MISSION_DONE, EVENT_OVER, EVENT_WANTED_UP } from './world.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_MUTE, ACTION_PAUSE, ACTION_PUNCH, ACTION_SHOOT, ACTION_ZOOM, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createMinimap } from './minimap.js';
import { createAudio } from './audio.js';
import { playerPunch, playerShoot } from './combat.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const minimap = createMinimap();
const audio = createAudio();

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSave(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: state.money, missionIndex: state.missionIndex, missionStep: state.missionStep,
      missionsDone: state.missionsDone, health: state.player.health,
      x: state.player.x, y: state.player.y, clock: state.clock,
    }));
    window.localStorage.setItem(BEST_KEY, String(Math.max(readBest(), state.money)));
  } catch {
    // Storage can be off: progress then lasts this visit only.
  }
}

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function applySave(state, save) {
  state.money = save.money;
  state.missionIndex = save.missionIndex;
  state.missionStep = save.missionStep;
  state.missionsDone = save.missionsDone;
  state.player.health = save.health;
  state.player.x = save.x;
  state.player.y = save.y;
  state.clock = save.clock || 16.2;
  state.camera.x = save.x - 640;
  state.camera.y = save.y - 360;
}

function runShot(name) {
  const scene = stageShot(name, world);
  window.__solara = { world, get state() { return world.state; } };
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, world.state.elapsed, minimap);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  // Debug hook for automated play-testing: exposes the live world state.
  window.__solara = {
    world, input, renderer,
    get screen() { return screen; },
    get state() { return world.state; },
  };
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let saveTimer = 0;
  const save = readSave();
  world.state.hasSave = !!save;

  function announce(message) {
    status.textContent = message;
  }

  function startGame(fresh) {
    world.reset();
    if (!fresh && save) applySave(world.state, save);
    accumulator = 0;
    saveTimer = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing in Solara Bay. Follow the gold marker.');
  }

  function endGame(arrested) {
    const state = world.state;
    state.arrested = arrested;
    if (arrested) state.money = Math.floor(state.money / 2);
    screen = SCREEN_OVER;
    writeSave(state);
    announce(arrested ? 'Busted. The police caught Leo.' : 'Wasted. Leo did not make it.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      world.state.hint = muted ? 'Sound muted (M to unmute)' : '';
    }
    if (actions & ACTION_ZOOM) minimap.toggleZoom();
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startGame(false);
      return;
    }
    if (screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) startGame(true);
      return;
    }
    if (actions & ACTION_PAUSE) {
      screen = screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
      announce(screen === SCREEN_PAUSED ? 'Paused.' : 'Playing.');
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_ENTER) {
      const result = world.tryEnterExitCar();
      if (result === 'enter') {
        audio.unlock();
        world.state.hint = '';
        if (world.state.wanted > 0) announce('Stolen car. The police are coming.');
      }
    }
    if (actions & ACTION_PUNCH) {
      audio.unlock();
      if (playerPunch(world.state)) audio.punch();
    }
    if (actions & ACTION_SHOOT) {
      audio.unlock();
      const m = input.mouse();
      const v = renderer.screenToWorld(m.x, m.y);
      const wx = v.x + world.state.camera.x;
      const wy = v.y + world.state.camera.y;
      if (playerShoot(world.state, wx, wy)) audio.gunshot();
    }
  }

  // N on the title screen starts a brand-new game instead of continuing.
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyN' && screen === SCREEN_TITLE) startGame(true);
  });

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { move: () => ({ x: 0, y: 0 }) }, null);
      return;
    }
    const events = world.step(STEP, input, audio);
    saveTimer += STEP;
    if (saveTimer > 15) {
      saveTimer = 0;
      writeSave(world.state);
    }
    if (events & EVENT_MISSION_DONE) {
      writeSave(world.state);
      best = Math.max(best, world.state.money);
      announce('Mission complete. $' + world.state.money + ' in the bank.');
    } else if (events & EVENT_WANTED_UP) {
      audio.wantedUp();
      announce('Wanted level ' + world.state.wanted + '. Lose the police!');
    }
    if (events & EVENT_ARRESTED) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, world.state.elapsed, minimap);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sunset Streets: Solara Bay. Press Space to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
