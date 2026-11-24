// Minimap: a scaled-down live map of Solara Bay in the bottom-left corner.
// Roads, water, beach and park, the player (white arrow), police (blue),
// traffic (yellow dots), the mission target (pulsing gold star) and the
// safehouse. N zooms it between two sizes.
import { LANDMARKS, WORLD } from './config.js';
import { currentStep } from './missions.js';

export function createMinimap() {
  let zoom = 0; // 0 = small, 1 = large
  return {
    toggleZoom() { zoom = 1 - zoom; return zoom; },
    zoomLevel() { return zoom; },
    draw(ctx, state, view, time) {
      const size = zoom === 0 ? 190 : 300;
      const x0 = 14;
      const y0 = 720 - size - 14;
      const scale = size / WORLD.width;
      ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
      ctx.fillStyle = 'rgba(10,14,22,0.78)';
      ctx.fillRect(x0 - 4, y0 - 4, size + 8, size + 8);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y0, size, size);
      ctx.clip();
      // Ground, water and beach.
      ctx.fillStyle = '#4a6b3a';
      ctx.fillRect(x0, y0, size, size);
      ctx.fillStyle = '#2e6f9e';
      ctx.fillRect(x0, y0 + 2500 * scale, size, size);
      ctx.fillRect(x0 + 3300 * scale, y0, size, size);
      ctx.fillStyle = '#d9c27a';
      ctx.fillRect(x0, y0 + 2380 * scale, 3300 * scale, 120 * scale);
      // Park.
      ctx.fillStyle = '#3f6b32';
      ctx.fillRect(x0 + 1200 * scale, y0 + 650 * scale, 450 * scale, 400 * scale);
      // Roads.
      ctx.strokeStyle = '#3a3f47';
      ctx.lineWidth = Math.max(2, 96 * scale);
      ctx.beginPath();
      for (const rx of [300, 750, 1200, 1650, 2100, 2550, 3000, 3300]) {
        ctx.moveTo(x0 + rx * scale, y0);
        ctx.lineTo(x0 + rx * scale, y0 + size);
      }
      for (const ry of [250, 650, 1050, 1450, 1850, 2250]) {
        ctx.moveTo(x0, y0 + ry * scale);
        ctx.lineTo(x0 + size, y0 + ry * scale);
      }
      ctx.stroke();
      const dot = (x, y, color, r) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x0 + x * scale, y0 + y * scale, r, 0, Math.PI * 2);
        ctx.fill();
      };
      // Landmarks.
      for (const lm of LANDMARKS) dot(lm.x, lm.y, '#8a8d94', 2.5);
      // Traffic cars.
      for (const v of state.vehicles) {
        if (v.police) continue;
        dot(v.x, v.y, '#e8b93c', 2);
      }
      // Police.
      for (const c of state.policeCars) dot(c.x, c.y, '#3d7bd9', 3);
      for (const c of state.cops) dot(c.x, c.y, '#3d7bd9', 2.5);
      // Mission target: pulsing gold star.
      const step = currentStep(state);
      if (step) {
        const pulse = 4 + Math.sin(time * 5) * 1.5;
        dot(step.x, step.y, '#ffd94a', pulse);
        ctx.strokeStyle = '#ffd94a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x0 + step.x * scale, y0 + step.y * scale, pulse + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Player arrow.
      const px = x0 + state.player.x * scale;
      const py = y0 + state.player.y * scale;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(state.player.angle);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-6, -5);
      ctx.lineTo(-6, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.restore();
      // North label.
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('N', x0 + size - 14, y0 + 16);
    },
  };
}
