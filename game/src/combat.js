// Combat: fists and a pistol, enemies who guard robbery targets, bullets,
// muzzle flashes and knockback. The player punches with F, shoots toward the
// mouse with a click (or J), and takes damage from enemies and police. Health
// regenerates slowly out of combat.
import { PLAYER } from './config.js';

export function spawnEnemy(state, x, y) {
  const e = { x, y, angle: 0, hp: 50, speed: 150, shootTimer: 1 + Math.random() * 2, punchTimer: 0, alive: true };
  state.enemies.push(e);
  return e;
}

/** Player punch: damages the nearest enemy or cop within arm's reach. */
export function playerPunch(state) {
  const p = state.player;
  if (p.punchTimer > 0) return false;
  p.punchTimer = 0.45;
  p.punchAnim = 0.25;
  let hitAny = false;
  const range = 46;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (Math.hypot(e.x - p.x, e.y - p.y) < range) {
      e.hp -= 25;
      e.x += Math.cos(p.angle) * 24;
      e.y += Math.sin(p.angle) * 24;
      hitAny = true;
      if (e.hp <= 0) { e.alive = false; state.money += 25; }
    }
  }
  for (const c of state.cops) {
    if (Math.hypot(c.x - p.x, c.y - p.y) < range) {
      c.hp -= 25;
      hitAny = true;
      if (c.hp <= 0) {
        state.cops.splice(state.cops.indexOf(c), 1);
        state.money += 20;
      }
    }
  }
  return hitAny;
}

/** Fire one bullet from the player toward (tx, ty) in world coordinates. */
export function playerShoot(state, tx, ty) {
  const p = state.player;
  if (p.shootTimer > 0 || p.vehicle) return false;
  p.shootTimer = 0.28;
  const angle = Math.atan2(ty - p.y, tx - p.x);
  state.bullets.push({
    x: p.x + Math.cos(angle) * 20, y: p.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * 900, vy: Math.sin(angle) * 900,
    life: 0.9, fromPlayer: true,
  });
  state.muzzle = 0.08;
  state.ammo = Math.max(0, (state.ammo || 24) - 1);
  return true;
}

export function enemyShoot(state, e, dt) {
  e.shootTimer -= dt;
  if (e.shootTimer > 0 || !e.alive) return;
  const p = state.player;
  const dist = Math.hypot(p.x - e.x, p.y - e.y);
  if (dist > 520) return;
  e.shootTimer = 1.4 + Math.random() * 1.2;
  const angle = Math.atan2(p.y - e.y, p.x - e.x) + (Math.random() - 0.5) * 0.15;
  state.bullets.push({
    x: e.x + Math.cos(angle) * 20, y: e.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * 620, vy: Math.sin(angle) * 620,
    life: 1.1, fromPlayer: false,
  });
}

/** Move bullets, resolve hits on enemies, cops, the player and the world. */
export function stepBullets(state, dt) {
  const p = state.player;
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead && b.fromPlayer) {
      for (const e of state.enemies) {
        if (e.alive && Math.hypot(e.x - b.x, e.y - b.y) < 18) {
          e.hp -= 34;
          dead = true;
          if (e.hp <= 0) { e.alive = false; state.money += 25; }
          break;
        }
      }
      if (!dead) {
        for (const c of state.cops) {
          if (Math.hypot(c.x - b.x, c.y - b.y) < 18) {
            c.hp -= 34;
            dead = true;
            if (c.hp <= 0) state.cops.splice(state.cops.indexOf(c), 1);
            break;
          }
        }
      }
    } else if (!dead && !b.fromPlayer) {
      if (Math.hypot(p.x - b.x, p.y - b.y) < 16 && p.invuln <= 0 && !p.vehicle) {
        p.health -= 10;
        p.invuln = 0.4;
        dead = true;
      }
      if (!dead && p.vehicle && Math.hypot(p.vehicle.x - b.x, p.vehicle.y - b.y) < 30) {
        dead = true;
      }
    }
    if (dead) state.bullets.splice(i, 1);
  }
  state.enemies = state.enemies.filter((e) => e.alive);
}

/** Enemies walk toward the player and shoot when in range. */
export function stepEnemies(state, dt) {
  const p = state.player;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const dist = Math.hypot(p.x - e.x, p.y - e.y);
    e.angle = Math.atan2(p.y - e.y, p.x - e.x);
    if (dist > 90) {
      e.x += Math.cos(e.angle) * e.speed * dt;
      e.y += Math.sin(e.angle) * e.speed * dt;
    } else if (p.invuln <= 0 && !p.vehicle) {
      e.punchTimer -= dt;
      if (e.punchTimer <= 0) {
        e.punchTimer = 0.9;
        p.health -= 7;
        p.invuln = 0.4;
      }
    }
    enemyShoot(state, e, dt);
  }
}

export function regenHealth(state, dt) {
  const p = state.player;
  if (p.invuln > 0) p.invuln -= dt;
  if (p.punchTimer > 0) p.punchTimer -= dt;
  if (p.shootTimer > 0) p.shootTimer -= dt;
  if (p.punchAnim > 0) p.punchAnim -= dt;
  if (state.muzzle > 0) state.muzzle -= dt;
  if (p.health < PLAYER.health && state.wanted === 0 && p.health > 0) {
    p.health = Math.min(PLAYER.health, p.health + 2 * dt);
  }
}
