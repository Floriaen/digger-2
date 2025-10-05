/**
 * @file shadow.component.js
 * @description Player shadow component - renders shadow on ground below player
 */

import { Component } from '../core/component.base.js';
import { PLAYER_RADIUS } from '../utils/config.js';
import { PhysicsComponent } from './blocks/physics.component.js';

/**
 * ShadowComponent
 * Renders player shadow on the first solid block below
 * Handles coyote time and falling states
 */
export class ShadowComponent extends Component {
  init() {
    // Shadow will track player position
  }

  update() {
    // No update logic needed - shadow position calculated in render
  }

  render(ctx) {
    const player = this.game.components.find((c) => c.constructor.name === 'PlayerComponent');
    const camera = this.game.components.find((c) => c.constructor.name === 'CameraComponent');
    const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainComponent');

    if (!player || !camera || !terrain) return;

    const transform = camera.getTransform();

    // Always find the first solid block below the player
    let shadowY = player.y; // Default: shadow at player position

    // Search downward for first non-traversable block
    let checkY = player.gridY + 1;
    while (checkY < player.gridY + 20) { // Check up to 20 blocks down
      const block = terrain.getBlock(player.gridX, checkY);
      const physics = block.get(PhysicsComponent);

      if (physics && !physics.traversable) {
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
      player.x + transform.x,
      shadowY + PLAYER_RADIUS + transform.y - 10, // -4 for 3D fake offset
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
