// Keyboard and mouse input for Solara Bay. Held keys give a move/steer vector;
// one-shot presses (enter car, punch, pause, confirm, mute, minimap zoom) are
// queued as bit flags and taken once by the loop, so a press between two frames
// is never lost and never counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_PUNCH = 8;
export const ACTION_SHOOT = 16;
export const ACTION_MUTE = 32;
export const ACTION_ZOOM = 64;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER = new Set(['KeyE']);
const PUNCH = new Set(['KeyF']);
const SHOOT = new Set(['KeyJ']);
const MUTE = new Set(['KeyM']);
const ZOOM = new Set(['KeyN']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;

  function press(code) {
    if (UP.has(code) || DOWN.has(code) || LEFT.has(code) || RIGHT.has(code)) held.add(code);
    else if (CONFIRM.has(code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(code)) actions |= ACTION_PAUSE;
    else if (ENTER.has(code)) actions |= ACTION_ENTER;
    else if (PUNCH.has(code)) actions |= ACTION_PUNCH;
    else if (SHOOT.has(code)) actions |= ACTION_SHOOT;
    else if (MUTE.has(code)) actions |= ACTION_MUTE;
    else if (ZOOM.has(code)) actions |= ACTION_ZOOM;
    else return false;
    return true;
  }

  window.addEventListener('keydown', (event) => {
    if (press(event.code) && !event.repeat) event.preventDefault();
    else if (press(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    mouseDown = true;
    if (event.button === 0) actions |= ACTION_SHOOT;
    else actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => { mouseDown = false; });

  function axis(setA, setB) {
    let v = 0;
    for (const c of held) {
      if (setA.has(c)) v -= 1;
      if (setB.has(c)) v += 1;
    }
    return v;
  }

  return {
    /** Move vector {x, y} in world directions, each component -1, 0 or 1. */
    move() { return { x: axis(LEFT, RIGHT), y: axis(UP, DOWN) }; },
    /** One-shot presses since the last call, as ACTION_* flags. */
    takeActions() { const taken = actions; actions = 0; return taken; },
    /** Mouse position in CSS pixels relative to the canvas. */
    mouse() { return { x: mouseX, y: mouseY, down: mouseDown }; },
    /** For scripted play: pretend a key is held or pressed. */
    fakePress(code) { press(code); },
    fakeHold(code, on) { if (on) held.add(code); else held.delete(code); },
    fakeMouse(x, y) { mouseX = x; mouseY = y; },
  };
}
