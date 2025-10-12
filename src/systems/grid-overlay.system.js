/**
 * @file grid-overlay.component.js
 * @description Grid overlay component - renders subtle grid lines on solid blocks
 */

import { System } from '../core/system.js';
import { TILE_WIDTH, TILE_HEIGHT } from '../utils/config.js';
import { PhysicsComponent } from '../components/block/physics.component.js';

/**
 * GridOverlayComponent
 * Renders a subtle grid on top of solid blocks (not on empty or red torus)
 */
export class GridOverlaySystem extends System {
  init() {
    // No initialization needed
  }

  update() {
    // No update logic needed
  }

  render(ctx) {
    const camera = this.game.components.find((c) => c.constructor.name === 'CameraSystem');
    const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainSystem');

    if (!camera || !terrain) return;

    const viewBounds = camera.getViewBounds(ctx.canvas);

    // Calculate visible tile range
    const startX = Math.floor(viewBounds.left / TILE_WIDTH) - 1;
    const endX = Math.ceil(viewBounds.right / TILE_WIDTH) + 1;
    const startY = Math.floor(viewBounds.top / TILE_HEIGHT) - 1;
    const endY = Math.ceil(viewBounds.bottom / TILE_HEIGHT) + 1;

    // Save context state
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#AA7A42';
    ctx.lineWidth = 1;

    // Draw grid on solid blocks
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const block = terrain.getBlock(x, y);
        const physics = block.get(PhysicsComponent);

        // Skip blocks without collision
        if (!physics || !physics.isCollidable()) {
          continue;
        }

        // Draw grid rectangle for this solid block
        const worldX = x * TILE_WIDTH;
        const worldY = y * TILE_HEIGHT;

        ctx.beginPath();
        ctx.rect(worldX, worldY, TILE_WIDTH, TILE_HEIGHT);
        ctx.stroke();
      }
    }

    // Restore context state
    ctx.restore();
  }

  destroy() {
    // Cleanup if needed
  }
}
