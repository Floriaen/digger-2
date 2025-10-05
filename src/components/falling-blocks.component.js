/**
 * @file falling-blocks.component.js
 * @description Manages falling solid blocks (rocks) and lethal collisions
 */

import { Component } from '../core/component.base.js';
import { BLOCK_TYPES, isSolid, isTraversable } from '../terrain/block-registry.js';
import { GRAVITY, FALL_SPEED_MAX, TILE_HEIGHT } from '../utils/config.js';
import { eventBus } from '../utils/event-bus.js';
import { PhysicsComponent } from './blocks/physics.component.js';
import { FallableComponent } from './blocks/fallable.component.js';
import { BlockFactory } from '../factories/block.factory.js';

/**
 * FallingBlock class
 * Represents a single falling rock block
 */
class FallingBlock {
  constructor(gridX, gridY, block) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.block = block; // Block entity
    this.y = gridY * TILE_HEIGHT; // Pixel Y position
    this.velocityY = 0;
    this.alive = true;
  }

  /**
   * Update falling physics
   * @param {number} deltaTime
   * @returns {boolean} True if still falling
   */
  update(deltaTime) {
    this.velocityY += GRAVITY;
    if (this.velocityY > FALL_SPEED_MAX) this.velocityY = FALL_SPEED_MAX;

    this.y += this.velocityY;
    this.gridY = Math.floor(this.y / TILE_HEIGHT);

    return this.alive;
  }
}

/**
 * FallingBlocksComponent
 * Detects unsupported rock blocks and makes them fall
 * Checks for lethal player collisions
 */
export class FallingBlocksComponent extends Component {
  init() {
    this.fallingBlocks = [];

    // Listen for block destruction to check for unsupported rocks above
    eventBus.on('block:destroyed', this._onBlockDestroyed.bind(this));
  }

  update(deltaTime) {
    const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainComponent');
    const player = this.game.components.find((c) => c.constructor.name === 'PlayerComponent');

    if (!terrain || !player) return;

    // Update all falling blocks
    this.fallingBlocks = this.fallingBlocks.filter((fb) => {
      if (!fb.update(deltaTime)) return false;

      // Check if block hit solid ground or another block
      const blockBelow = terrain.getBlock(fb.gridX, fb.gridY + 1);
      const physicsBelow = blockBelow.get(PhysicsComponent);
      const isSolid = physicsBelow && !physicsBelow.traversable;

      if (isSolid || fb.gridY > 500) {
        // Stop falling - place block in terrain
        terrain.setBlock(fb.gridX, fb.gridY, fb.block);
        return false;
      }

      // Check collision with player (lethal) - same grid position
      if (fb.gridX === player.gridX && fb.gridY === player.gridY) {
        eventBus.emit('player:death', { cause: 'falling_rock' });
        // Stop falling block
        terrain.setBlock(fb.gridX, fb.gridY, fb.block);
        return false;
      }

      // Check if falling block is directly above player (will hit next frame)
      if (fb.gridX === player.gridX && fb.gridY + 1 === player.gridY) {
        eventBus.emit('player:death', { cause: 'falling_rock' });
        // Stop falling block
        terrain.setBlock(fb.gridX, fb.gridY, fb.block);
        return false;
      }

      return true;
    });
  }

  render(ctx) {
    const camera = this.game.components.find((c) => c.constructor.name === 'CameraComponent');
    if (!camera) return;

    const transform = camera.getTransform();

    // Render falling blocks (simple gray rectangles for now)
    this.fallingBlocks.forEach((fb) => {
      const screenX = fb.gridX * 16 + transform.x;
      const screenY = fb.y + transform.y;

      ctx.fillStyle = '#9E9E9E';
      ctx.fillRect(screenX, screenY, 16, 25);

      // Darker cap
      ctx.fillStyle = '#757575';
      ctx.fillRect(screenX, screenY, 16, 9);
    });
  }

  destroy() {
    this.fallingBlocks = [];
  }

  /**
   * Handle block destruction - check for unsupported rocks above
   * @param {Object} data - Event data {x, y}
   * @private
   */
  _onBlockDestroyed(data) {
    const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainComponent');
    if (!terrain) return;

    const { x, y } = data;

    // Check if there's a fallable block directly above that lost support
    for (let checkY = y - 1; checkY >= Math.max(0, y - 10); checkY -= 1) {
      const block = terrain.getBlock(x, checkY);

      // Only blocks with FallableComponent can fall
      if (block.has(FallableComponent)) {
        const blockBelow = terrain.getBlock(x, checkY + 1);
        const physicsBelow = blockBelow.get(PhysicsComponent);

        // If no support below, make it fall
        if (physicsBelow && physicsBelow.traversable) {
          this._spawnFallingBlock(x, checkY, block);
          terrain.setBlock(x, checkY, BlockFactory.createEmpty());
        }
      } else {
        // Check if this block is solid
        const physics = block.get(PhysicsComponent);
        if (physics && !physics.traversable) {
          // Hit another solid block, stop checking upward
          break;
        }
      }
    }
  }

  /**
   * Spawn a falling block
   * @param {number} gridX
   * @param {number} gridY
   * @param {Block} block - Block entity
   * @private
   */
  _spawnFallingBlock(gridX, gridY, block) {
    const fb = new FallingBlock(gridX, gridY, block);
    this.fallingBlocks.push(fb);
  }
}
