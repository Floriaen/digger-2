import { Component } from '../../core/component.js';
import { PhysicsComponent } from './physics.component.js';
import { GRAVITY, FALL_SPEED_MAX } from '../../utils/config.js';

/**
 * FallableComponent
 *
 * Handles gravity and falling physics for entities (blocks and player).
 * Stores velocity and provides falling behavior.
 */
export class FallableComponent extends Component {
  constructor() {
    super();
    this.velocityY = 0;
    this.isFalling = false;
    // Position data for falling blocks (pixel position, not grid)
    this.pixelY = null;
    this.gridX = null;
    this.gridY = null;
  }

  /**
   * Check if this entity should fall (has no support below)
   * @param {Block} block - The block entity
   * @param {TerrainSystem} terrain - Terrain to check
   * @param {number} gridX - Block X position
   * @param {number} gridY - Block Y position
   * @returns {boolean} True if should fall
   */
  checkSupport(block, terrain, gridX, gridY) {
    const blockBelow = terrain.getBlock(gridX, gridY + 1);
    const physicsBelow = blockBelow.get(PhysicsComponent);

    // Fall if no support below (block below is not collidable)
    return physicsBelow && !physicsBelow.isCollidable();
  }

  /**
   * Update falling physics
   * @param {number} _deltaTime - Time since last frame
   */
  updateFalling(_deltaTime) {
    this.velocityY += GRAVITY;
    if (this.velocityY > FALL_SPEED_MAX) {
      this.velocityY = FALL_SPEED_MAX;
    }

    // Update pixel position
    if (this.pixelY !== null) {
      this.pixelY += this.velocityY;
      this.gridY = Math.floor(this.pixelY / 16); // 16 = TILE_HEIGHT
    }
  }

  /**
   * Start falling from a grid position
   * @param {number} gridX - Starting grid X
   * @param {number} gridY - Starting grid Y
   */
  startFalling(gridX, gridY) {
    this.isFalling = true;
    this.velocityY = 0;
    this.gridX = gridX;
    this.gridY = gridY;
    this.pixelY = gridY * 16; // 16 = TILE_HEIGHT
  }

  /**
   * Stop falling (hit ground)
   */
  stopFalling() {
    this.isFalling = false;
    this.velocityY = 0;
    this.pixelY = null;
    this.gridX = null;
    this.gridY = null;
  }
}
