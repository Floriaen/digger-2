/**
 * @file shadow.component.js
 * @description Player shadow component - renders shadow on ground below player
 */

import { System } from '../core/system.js';
import { PLAYER_RADIUS } from '../utils/config.js';
import { PhysicsComponent } from '../components/block/physics.component.js';

/**
 * ShadowComponent
 * Renders player shadow on the first solid block below
 * Handles coyote time and falling states
 */
export class ShadowSystem extends System {
  init() {
    // Shadow will track player position
  }

  update() {
    // No update logic needed - shadow position calculated in render
  }

  render(ctx) {
    const player = this.game.components.find((c) => c.constructor.name === 'PlayerManagerSystem');
    const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainSystem');

    if (!player || !terrain) return;

    // Get player position
    const { gridX, gridY } = player.getGridPosition();
    const { x, y } = player.getPixelPosition();

    // Always find the first solid block below the player
    let shadowY = y; // Default: shadow at player position

    // Search downward for first non-traversable block
    let checkY = gridY + 1;
    while (checkY < gridY + 20) { // Check up to 20 blocks down
      const block = terrain.getBlock(gridX, checkY);
      const physics = block.get(PhysicsComponent);

      if (physics && physics.isCollidable()) {
        // Found solid block - shadow goes on top of it
        shadowY = checkY * 16;
        break;
      }
      checkY += 1;
    }

    // Draw shadow ellipse
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(
      x,
      shadowY + PLAYER_RADIUS - 10, // -4 for 3D fake offset
      PLAYER_RADIUS * 0.8,
      PLAYER_RADIUS * 0.3,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  destroy() {
    // Cleanup if needed
  }
}
