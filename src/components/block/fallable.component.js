import { Component } from '../../core/component.js';
import { PhysicsComponent } from './physics.component.js';
import { GRAVITY, FALL_SPEED_MAX, TILE_HEIGHT } from '../../utils/config.js';

/**
 * FallableComponent
 *
 * Handles gravity and falling physics for all entities (blocks, NPCs, player).
 * Uses realistic acceleration (GRAVITY constant).
 *
 * Hybrid position model:
 * - For entities WITH PositionComponent (NPCs): reads/writes PositionComponent
 * - For entities WITHOUT PositionComponent (blocks): uses own position fields
 */
export class FallableComponent extends Component {
  constructor() {
    super();
    this.velocityY = 0;
    this.isFalling = false;
    // Position data for falling blocks without PositionComponent (pixel position, not grid)
    this.pixelY = null;
    this.gridX = null;
    this.gridY = null;
  }

  /**
   * Check if this entity should fall (has no support below)
   * @param {Entity} entity - The entity (block or NPC)
   * @param {TerrainSystem} terrain - Terrain to check
   * @param {number} gridX - Entity X position
   * @param {number} gridY - Entity Y position
   * @returns {boolean} True if should fall
   */
  checkSupport(entity, terrain, gridX, gridY) {
    const blockBelow = terrain.getBlock(gridX, gridY + 1);
    const physicsBelow = blockBelow.get(PhysicsComponent);

    // Fall if no support below (block below is not collidable)
    return physicsBelow && !physicsBelow.isCollidable();
  }

  /**
   * Update falling physics with realistic acceleration
   * Works with both PositionComponent (NPCs) and own fields (blocks)
   * @param {Entity} entity - The entity
   * @param {number} _deltaTime - Time since last frame
   */
  updateFalling(entity, _deltaTime) {
    // Apply gravity acceleration
    this.velocityY += GRAVITY;
    if (this.velocityY > FALL_SPEED_MAX) {
      this.velocityY = FALL_SPEED_MAX;
    }

    // Try to get PositionComponent (NPCs)
    let PositionComponent;
    try {
      // eslint-disable-next-line global-require
      PositionComponent = require('../npc/position.component.js').PositionComponent;
    } catch {
      PositionComponent = null;
    }

    const positionComp = PositionComponent ? entity.get(PositionComponent) : null;

    if (positionComp) {
      // NPC with PositionComponent: update via translate
      positionComp.translate(0, this.velocityY);
    } else if (this.pixelY !== null) {
      // Block without PositionComponent: update own fields
      this.pixelY += this.velocityY;
      this.gridY = Math.floor(this.pixelY / TILE_HEIGHT);
    }
  }

  /**
   * Start falling from a grid position
   * @param {Entity} entity - The entity
   * @param {number} gridX - Starting grid X
   * @param {number} gridY - Starting grid Y
   */
  startFalling(entity, gridX, gridY) {
    this.isFalling = true;
    this.velocityY = 0;

    // Try to get PositionComponent (NPCs)
    let PositionComponent;
    try {
      // eslint-disable-next-line global-require
      PositionComponent = require('../npc/position.component.js').PositionComponent;
    } catch {
      PositionComponent = null;
    }

    const positionComp = PositionComponent ? entity.get(PositionComponent) : null;

    if (!positionComp) {
      // Block without PositionComponent: use own fields
      this.gridX = gridX;
      this.gridY = gridY;
      this.pixelY = gridY * TILE_HEIGHT;
    }
    // For NPCs with PositionComponent, position is already in the component
  }

  /**
   * Stop falling (hit ground)
   * @param {Entity} entity - The entity
   */
  stopFalling(entity) {
    this.isFalling = false;
    this.velocityY = 0;

    // Try to get PositionComponent (NPCs)
    let PositionComponent;
    try {
      // eslint-disable-next-line global-require
      PositionComponent = require('../npc/position.component.js').PositionComponent;
    } catch {
      PositionComponent = null;
    }

    const positionComp = PositionComponent ? entity.get(PositionComponent) : null;

    if (positionComp) {
      // NPC: snap to grid
      positionComp.y = positionComp.gridY * TILE_HEIGHT;
      positionComp.syncSpawn();
    } else {
      // Block: clear own fields
      this.pixelY = null;
      this.gridX = null;
      this.gridY = null;
    }
  }

  /**
   * Get current grid position (adapts to both models)
   * @param {Entity} entity - The entity
   * @returns {{gridX: number, gridY: number}|null}
   */
  getGridPosition(entity) {
    // Try to get PositionComponent (NPCs)
    let PositionComponent;
    try {
      // eslint-disable-next-line global-require
      PositionComponent = require('../npc/position.component.js').PositionComponent;
    } catch {
      PositionComponent = null;
    }

    const positionComp = PositionComponent ? entity.get(PositionComponent) : null;

    if (positionComp) {
      return { gridX: positionComp.gridX, gridY: positionComp.gridY };
    }

    if (this.gridX !== null && this.gridY !== null) {
      return { gridX: this.gridX, gridY: this.gridY };
    }

    return null;
  }
}
