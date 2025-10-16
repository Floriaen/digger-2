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
    // Support both old PlayerSystem and new PlayerManagerSystem
    const player = this.game.components.find(
      (c) => c.constructor.name === 'PlayerManagerSystem' || c.constructor.name === 'PlayerSystem',
    );
    const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainSystem');

    if (!player || !terrain) return;

    // Get player position (works with both PlayerSystem and PlayerManagerSystem)
    // PlayerManagerSystem has getGridPosition/getPixelPosition methods
    // PlayerSystem has direct properties
    let gridX;
    let gridY;
    let x;
    let y;
    if (typeof player.getGridPosition === 'function') {
      const gridPos = player.getGridPosition();
      gridX = gridPos.gridX;
      gridY = gridPos.gridY;
      const pixelPos = player.getPixelPosition();
      x = pixelPos.x;
      y = pixelPos.y;
    } else {
      gridX = player.gridX;
      gridY = player.gridY;
      x = player.x;
      y = player.y;
    }

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
