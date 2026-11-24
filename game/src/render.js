// Drawing only: the world state and the current screen in, pixels out. The
// camera follows the player across Solara Bay; the HUD and minimap are drawn in
// screen space on top. Flat vector art, canvas text, no images, no network.
import { FONT, LANDMARKS, PALETTE, ROADS_X, ROADS_Y, ROAD_W, VIEW, WORLD } from './config.js';
import { currentStep } from './missions.js';
import { drawHud } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function drawCar(ctx, v, isPlayer) {
  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.angle);
  const len = v.len;
  const wid = v.wid;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-len / 2 + 3, -wid / 2 + 4, len, wid);
  ctx.fillStyle = v.color;
  ctx.fillRect(-len / 2, -wid / 2, len, wid);
  // Roof and windshield.
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(-len / 4, -wid / 2 + 3, len / 3, wid - 6);
  ctx.fillStyle = '#1d2733';
  ctx.fillRect(len / 4, -wid / 2 + 3, 8, wid - 6);
  // Headlights.
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(len / 2 - 3, -wid / 2 + 2, 3, 5);
  ctx.fillRect(len / 2 - 3, wid / 2 - 7, 3, 5);
  if (v.police) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-len / 2 + 6, -wid / 2 + 2, len - 12, 4);
    ctx.fillStyle = '#3d7bd9';
    ctx.fillRect(-len / 4, -wid / 2 - 2, 8, 5);
    ctx.fillStyle = '#e5534b';
    ctx.fillRect(-len / 4 + 10, -wid / 2 - 2, 8, 5);
  }
  if (v.type === 'taxi') {
    ctx.fillStyle = '#111';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 3);
  }
  if (isPlayer) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-len / 2 - 3, -wid / 2 - 3, len + 6, wid + 6);
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, shirt, radius, walkPhase) {
  const bob = Math.sin(walkPhase) * 2;
  ctx.save();
  ctx.translate(x, y + bob * 0.3);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 4, radius, radius * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath();
  ctx.arc(Math.cos(angle) * 4, Math.sin(angle) * 4, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / VIEW.width, height / VIEW.height);
    view.x = (width - VIEW.width * view.scale) / 2;
    view.y = (height - VIEW.height * view.scale) / 2;
  }

  function screenToWorld(mx, my) {
    const ratio = window.devicePixelRatio || 1;
    const sx = mx * ratio;
    const sy = my * ratio;
    return {
      x: (sx - view.x) / view.scale + 0, // camera added by caller via state
      y: (sy - view.y) / view.scale,
    };
  }

  function drawGround(state) {
    const cam = state.camera;
    const x0 = cam.x - 40;
    const y0 = cam.y - 40;
    const x1 = cam.x + VIEW.width + 40;
    const y1 = cam.y + VIEW.height + 40;
    // Grass base.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // Beach and water (south and east).
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(x0, 2380, x1 - x0, 120);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(x0, 2500, x1 - x0, 100);
    ctx.fillRect(3300, y0, WORLD.width - 3300, y1 - y0);
    ctx.fillStyle = PALETTE.waterDeep;
    ctx.fillRect(x0, 2540, x1 - x0, 60);
    // Palm Park.
    ctx.fillStyle = PALETTE.park;
    ctx.fillRect(1200, 650, 450, 400);
    // Grand Plaza paving.
    ctx.fillStyle = '#9a938a';
    ctx.fillRect(1650, 1050, 450, 400);
    // Roads.
    ctx.fillStyle = PALETTE.road;
    for (const rx of ROADS_X) ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, WORLD.height);
    for (const ry of ROADS_Y) ctx.fillRect(0, ry - ROAD_W / 2, WORLD.width, ROAD_W);
    // Centre dashes.
    ctx.fillStyle = PALETTE.roadLine;
    for (const rx of ROADS_X) {
      for (let y = 0; y < WORLD.height; y += 64) ctx.fillRect(rx - 2, y, 4, 30);
    }
    for (const ry of ROADS_Y) {
      for (let x = 0; x < WORLD.width; x += 64) ctx.fillRect(x, ry - 2, 30, 4);
    }
    // Sidewalks.
    ctx.strokeStyle = PALETTE.sidewalk;
    ctx.lineWidth = 10;
    for (const rx of ROADS_X) {
      ctx.beginPath(); ctx.moveTo(rx - ROAD_W / 2 - 5, 0); ctx.lineTo(rx - ROAD_W / 2 - 5, WORLD.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx + ROAD_W / 2 + 5, 0); ctx.lineTo(rx + ROAD_W / 2 + 5, WORLD.height); ctx.stroke();
    }
    // Buildings.
    for (const b of state.city.buildings) {
      if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = PALETTE.roof;
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      ctx.fillStyle = '#f2c94c';
      for (let wx = b.x + 14; wx < b.x + b.w - 10; wx += 26) {
        for (let wy = b.y + 14; wy < b.y + b.h - 10; wy += 26) {
          ctx.fillRect(wx, wy, 8, 10);
        }
      }
      if (b.tall) {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(b.x, b.y, b.w, 10);
      }
    }
    // Trees.
    for (const t of state.city.trees) {
      if (t.x < x0 || t.x > x1 || t.y < y0 || t.y > y1) continue;
      ctx.fillStyle = '#2f5a26';
      ctx.beginPath(); ctx.arc(t.x, t.y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3f7a32';
      ctx.beginPath(); ctx.arc(t.x - 3, t.y - 3, 9, 0, Math.PI * 2); ctx.fill();
    }
    // Landmark labels.
    ctx.font = `600 15px ${FONT}`;
    ctx.textAlign = 'center';
    for (const lm of LANDMARKS) {
      if (lm.x < x0 || lm.x > x1 || lm.y < y0 || lm.y > y1) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      const w = ctx.measureText(lm.name).width + 12;
      ctx.fillRect(lm.x - w / 2, lm.y - 22, w, 20);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(lm.name, lm.x, lm.y - 8);
    }
  }

  function drawWorld(state, time) {
    const cam = state.camera;
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x - cam.x * view.scale, view.y - cam.y * view.scale);
    drawGround(state);
    // Mission beacon.
    const step = currentStep(state);
    if (step) {
      const pulse = 1 + Math.sin(time * 4) * 0.15;
      ctx.strokeStyle = '#ffd94a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(step.x, step.y, 46 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,217,74,0.25)';
      ctx.beginPath();
      ctx.arc(step.x, step.y, 46 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd94a';
      ctx.beginPath();
      ctx.moveTo(step.x, step.y - 52);
      ctx.lineTo(step.x - 10, step.y - 30);
      ctx.lineTo(step.x + 10, step.y - 30);
      ctx.closePath();
      ctx.fill();
    }
    // Vehicles (traffic, parked, police, chase target).
    for (const v of state.vehicles) drawCar(ctx, v, state.player.vehicle === v);
    for (const c of state.policeCars) drawCar(ctx, c, false);
    // Pedestrians.
    for (const ped of state.peds) drawPerson(ctx, ped.x, ped.y, ped.angle, ped.shirt, 11, ped.walkPhase);
    // Enemies (red shirts, armed).
    for (const e of state.enemies) {
      drawPerson(ctx, e.x, e.y, e.angle, '#8a1f1f', 12, time * 6);
      ctx.fillStyle = '#222';
      ctx.fillRect(e.x - 8, e.y - 22, 16, 4);
      ctx.fillStyle = '#e5534b';
      ctx.fillRect(e.x - 8, e.y - 22, 16 * Math.max(0, e.hp / 50), 4);
    }
    // Foot cops.
    for (const c of state.cops) {
      drawPerson(ctx, c.x, c.y, c.angle, '#22303f', 12, time * 8);
      ctx.fillStyle = '#3d7bd9';
      ctx.beginPath(); ctx.arc(c.x, c.y - 4, 5, 0, Math.PI * 2); ctx.fill();
    }
    // Player on foot.
    const p = state.player;
    if (!p.vehicle) {
      if (p.invuln <= 0 || Math.floor(time * 10) % 2 === 0) {
        drawPerson(ctx, p.x, p.y, p.angle, '#2fae5f', 13, time * 8);
        // White ring so the player always stands out in a crowd.
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
        ctx.stroke();
        // Punch arm.
        if (p.punchAnim > 0) {
          ctx.strokeStyle = '#f2c9a0';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + Math.cos(p.angle) * 30, p.y + Math.sin(p.angle) * 30);
          ctx.stroke();
        }
      }
    }
    // Bullets and muzzle flash.
    ctx.fillStyle = '#ffe9a8';
    for (const b of state.bullets) {
      ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    if (state.muzzle > 0 && !p.vehicle) {
      ctx.fillStyle = '#ffdf6b';
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(p.angle) * 26, p.y + Math.sin(p.angle) * 26, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    // Particles.
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life * 2);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - 3, pt.y - 3, 6, 6);
    }
    ctx.globalAlpha = 1;
    // Night tint.
    if (state.night) {
      ctx.fillStyle = 'rgba(10,16,48,0.28)';
      ctx.fillRect(cam.x - 40, cam.y - 40, VIEW.width + 80, VIEW.height + 80);
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    const width = 640;
    const height = 150 + lines.length * 32 + 70;
    const x = (VIEW.width - width) / 2;
    const y = (VIEW.height - height) / 2;
    ctx.fillStyle = 'rgba(8,12,20,0.88)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = accent || PALETTE.gold;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 46px ${FONT}`;
    ctx.fillText(title, VIEW.width / 2, y + 66);
    ctx.font = `19px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, y + 116 + i * 32));
    ctx.font = `600 22px ${FONT}`;
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(prompt, VIEW.width / 2, y + height - 30);
  }

  function draw(state, screen, best, time, minimap) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawWorld(state, time);
    if (screen === SCREEN_TITLE) {
      drawPanel('SUNSET STREETS', [
        'Solara Bay  ·  an open-world crime story',
        'Leo Marlow owes Mara Quinn. Six jobs clear the debt.',
        'WASD move / drive  ·  E steal a car  ·  F punch  ·  Click shoot',
        'P pause  ·  M mute  ·  N minimap zoom  ·  progress saves automatically',
        best > 0 ? 'Best fortune: $' + best : 'A new driver arrives in Solara Bay…',
      ], state.hasSave ? 'Press SPACE to continue  ·  N for a new game' : 'Press SPACE to start');
      return;
    }
    drawHud(ctx, state, view);
    if (minimap) minimap.draw(ctx, state, view, time);
    if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', ['The city waits for no one — except right now.', 'Missions, money and wanted level are saved.'], 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      const busted = state.arrested;
      drawPanel(busted ? 'BUSTED' : 'WASTED', [
        busted ? 'The Solara Bay police caught up with Leo.' : 'Leo Marlow did not make it out of Solara Bay.',
        'Missions done: ' + state.missionsDone + ' / 6    ·    Fortune: $' + state.money,
        'The bail cost you half your cash.',
      ], 'Press SPACE to try again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view, screenToWorld };
}
