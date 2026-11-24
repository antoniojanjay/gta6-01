// HUD: money, health bar, wanted stars, mission objective, clock, speed, and
// the dialogue subtitle line. Drawn in screen space (1280x720 logical) on top
// of the world, after the camera transform is reset.
import { FONT, PALETTE } from './config.js';
import { missionObjectiveText } from './missions.js';

export function drawHud(ctx, state, view) {
  ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
  ctx.textBaseline = 'top';
  // Top-left: money and health.
  ctx.fillStyle = 'rgba(10,14,22,0.62)';
  ctx.fillRect(14, 12, 250, 74);
  ctx.font = `700 26px ${FONT}`;
  ctx.fillStyle = PALETTE.gold;
  ctx.textAlign = 'left';
  ctx.fillText('$' + state.money, 26, 20);
  ctx.font = `16px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('Missions done: ' + state.missionsDone + ' / 6', 26, 54);
  // Health bar.
  ctx.fillStyle = '#222';
  ctx.fillRect(150, 24, 100, 16);
  ctx.fillStyle = state.player.health > 40 ? '#4fc94f' : '#e5534b';
  ctx.fillRect(150, 24, Math.max(0, 100 * state.player.health / 100), 16);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `13px ${FONT}`;
  ctx.fillText('HP', 128, 25);
  // Top-right: wanted stars.
  const stars = state.wanted;
  ctx.font = `30px ${FONT}`;
  ctx.textAlign = 'right';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < stars ? '#ffd94a' : 'rgba(255,255,255,0.22)';
    ctx.fillText('★', 1266 - i * 34, 14);
  }
  // Clock and day time.
  const hours = Math.floor(state.clock);
  const mins = Math.floor((state.clock - hours) * 60);
  ctx.font = `20px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0'), 1266, 52);
  // Objective banner under the stars.
  const objective = missionObjectiveText(state);
  ctx.font = `600 19px ${FONT}`;
  ctx.textAlign = 'center';
  const w = ctx.measureText(objective).width + 28;
  ctx.fillStyle = 'rgba(10,14,22,0.62)';
  ctx.fillRect((1280 - w) / 2, 12, w, 34);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(objective, 640, 19);
  // Progress inside a timed step (rob / follow).
  const step = state.missionStepProgress;
  if (step && step > 0 && step < 1) {
    ctx.fillStyle = '#222';
    ctx.fillRect(490, 54, 300, 12);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(490, 54, 300 * step, 12);
  }
  // Speed, bottom-right, when driving.
  if (state.player.vehicle) {
    const v = state.player.vehicle;
    const mph = Math.round(Math.abs(v.speed) * 0.12);
    ctx.font = `700 30px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(mph + ' mph', 1266, 640);
    ctx.font = `15px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(v.name + (v.stolen ? '  •  STOLEN' : ''), 1266, 676);
  }
  // Dialogue subtitle, bottom-centre.
  if (state.dialogue && state.elapsed < state.dialogue.until) {
    ctx.font = `19px ${FONT}`;
    ctx.textAlign = 'center';
    const text = state.dialogue.text;
    const dw = ctx.measureText(text).width + 30;
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect((1280 - dw) / 2, 668, dw, 36);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(text, 640, 676);
  }
  // "WASTED" / arrested flash is drawn by the renderer; here show hints.
  if (state.hint) {
    ctx.font = `16px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(state.hint, 640, 96);
  }
}
