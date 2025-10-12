/**
 * @file dig-indicator.component.js
 * @description Renders dig target outline on top of all terrain
 */

import { System } from '../core/system.js';
import { TILE_WIDTH, SPRITE_HEIGHT, TILE_CAP_HEIGHT } from '../utils/config.js';
import { PhysicsComponent } from '../components/block/physics.component.js';

/**
 * DigIndicatorComponent
 * Renders white outline around the block being dug (always on top of terrain)
 */
export class DigIndicatorSystem extends System {
  init() {
    // No initialization needed
  }

  update(_deltaTime) {
    // No update logic needed
  }

  /**
   * Render dig target outline on top of all terrain
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    // Get player's current dig target
    const player = this.game.components.find((c) => c.constructor.name === 'PlayerSystem');
    if (!player || !player.currentDigTarget) return;

    const digTarget = player.currentDigTarget;
    const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainSystem');
    if (!terrain) return;

    // Calculate screen position
    const worldX = digTarget.x * TILE_WIDTH;
    const worldY = digTarget.y * TILE_WIDTH;

    // Check if there's a block above
    const blockAbove = terrain.getBlock(digTarget.x, digTarget.y - 1);
    const physics = blockAbove.get(PhysicsComponent);
    const hasBlockAbove = physics && physics.isCollidable();

    // Full height (16x25) if no block above, partial (16x16) if block above
    const outlineHeight = hasBlockAbove ? TILE_WIDTH : SPRITE_HEIGHT;
    const outlineY = hasBlockAbove ? worldY : worldY - TILE_CAP_HEIGHT;

    // Draw outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(worldX, outlineY, TILE_WIDTH, outlineHeight);
  }

  destroy() {
    // No cleanup needed
  }
}
