/**
 * @file movement.component.js
 * @description Player movement (smooth lerp transitions between tiles)
 *
 * Manages smooth pixel-based movement between grid positions.
 * Extracted from PlayerSystem lines 87-98, 740-817.
 */

import { Component } from '../../core/component.js';
import { TILE_WIDTH, TILE_HEIGHT } from '../../utils/config.js';
import { PLAYER_STATE } from './state.component.js';

const HORIZONTAL_MOVE_DURATION_MS = 120;

export class MovementComponent extends Component {
  constructor() {
    super();

    this.active = false;
    this.duration = HORIZONTAL_MOVE_DURATION_MS;
    this.elapsed = 0;
    this.startX = 0;
    this.startY = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.targetGridX = 0;
    this.targetGridY = 0;
  }

  /**
   * Begin smooth movement to target grid position
   * @param {Object} entity - Player entity
   * @param {number} targetGridX - Target grid X
   * @param {number} targetGridY - Target grid Y
   * @param {number} durationMs - Movement duration in milliseconds
   */
  beginMovement(entity, targetGridX, targetGridY, durationMs = HORIZONTAL_MOVE_DURATION_MS) {
    const PositionComponent = this._getPositionComponent(entity);
    if (!PositionComponent) return;

    const position = entity.get(PositionComponent);
    if (!position) return;

    this.active = true;
    this.duration = Math.max(1, durationMs);
    this.elapsed = 0;
    this.startX = position.x;
    this.startY = position.y;
    this.targetX = targetGridX * TILE_WIDTH + TILE_WIDTH / 2;
    this.targetY = targetGridY * TILE_HEIGHT + TILE_HEIGHT / 2;
    this.targetGridX = targetGridX;
    this.targetGridY = targetGridY;

    const StateComponent = this._getStateComponent(entity);
    if (StateComponent) {
      const state = entity.get(StateComponent);
      if (state) {
        state.setState(PLAYER_STATE.MOVING);
      }
    }
  }

  /**
   * Stop movement immediately
   */
  stopMovement() {
    this.active = false;
    this.elapsed = 0;
  }

  /**
   * Update movement - called each frame
   * @param {Object} entity - Player entity
   * @param {number} deltaTime - Time elapsed since last frame
   * @param {Object} context - Game context with terrain reference
   * @returns {boolean} True if still moving, false if completed
   */
  update(entity, deltaTime, context) {
    if (!this.active) {
      return false;
    }

    const PositionComponent = this._getPositionComponent(entity);
    const StateComponent = this._getStateComponent(entity);

    if (!PositionComponent || !StateComponent) {
      return false;
    }

    const position = entity.get(PositionComponent);
    const state = entity.get(StateComponent);

    if (!position || !state) {
      return false;
    }

    this.elapsed += deltaTime;
    const progress = Math.min(1, this.elapsed / this.duration);

    // Lerp pixel position
    position.x = this._lerp(this.startX, this.targetX, progress);
    position.y = this._lerp(this.startY, this.targetY, progress);

    if (progress >= 1) {
      // Movement complete
      position.gridX = this.targetGridX;
      position.gridY = this.targetGridY;
      position.x = this.targetX;
      position.y = this.targetY;
      state.setState(PLAYER_STATE.IDLE);
      this.active = false;

      // Handle post-movement logic (door check, chaining, gravity)
      this._handleMovementComplete(entity, context);
      return false;
    }

    return true;
  }

  /**
   * Handle logic after movement completes
   * @param {Object} entity - Player entity
   * @param {Object} context - Game context with terrain reference
   * @private
   */
  _handleMovementComplete(entity, context) {
    const { terrain, game } = context;
    if (!terrain && !game) return;

    const terrainRef = terrain
      || game?.components?.find((c) => c.constructor.name === 'TerrainSystem');
    if (!terrainRef) return;

    const PositionComponent = this._getPositionComponent(entity);
    const position = entity.get(PositionComponent);
    if (!position) return;

    // Check if we entered a door
    const block = terrainRef.getBlock(position.gridX, position.gridY);
    const DiggingComponent = this._getDiggingComponent(entity);
    if (DiggingComponent) {
      const digging = entity.get(DiggingComponent);
      if (digging && digging.enterDoor) {
        if (digging.enterDoor(entity, block, position.gridX, position.gridY, 'player:movement')) {
          return;
        }
      }
    }

    // Try to chain into next tile (prefer requested direction, then current dig direction)
    const InputComponent = this._getInputComponent(entity);
    const input = InputComponent ? entity.get(InputComponent) : null;

    if (input && input.requestedDirection && DiggingComponent) {
      const digging = entity.get(DiggingComponent);
      if (digging && digging.canDigDirection) {
        const { dx, dy } = input.requestedDirection;
        if (digging.canDigDirection(entity, terrainRef, dx, dy)) {
          digging.digDirection = input.requestedDirection;
          const StateComponent = this._getStateComponent(entity);
          const state = StateComponent ? entity.get(StateComponent) : null;
          if (state) {
            state.setState(dy === 0 ? PLAYER_STATE.DIGGING_LATERAL : PLAYER_STATE.DIGGING);
          }
          digging.currentDigTarget = null;
          digging.digInDirection(entity, terrainRef, dx, dy);
          input.requestedDirection = null;
          return;
        }
      }
    }

    // Try to continue in current dig direction
    if (DiggingComponent) {
      const digging = entity.get(DiggingComponent);
      if (digging && digging.digDirection && digging.canDigDirection) {
        const { dx, dy } = digging.digDirection;
        if (digging.canDigDirection(entity, terrainRef, dx, dy)) {
          const StateComponent = this._getStateComponent(entity);
          const state = StateComponent ? entity.get(StateComponent) : null;
          if (state) {
            state.setState(dy === 0 ? PLAYER_STATE.DIGGING_LATERAL : PLAYER_STATE.DIGGING);
          }
          digging.currentDigTarget = null;
          digging.digInDirection(entity, terrainRef, dx, dy);
          return;
        }
      }
    }

    // Check if we need to fall
    if (DiggingComponent) {
      const digging = entity.get(DiggingComponent);
      if (digging && digging.beginFallIfUnsupported) {
        digging.beginFallIfUnsupported(entity, terrainRef);
      }
    }
  }

  /**
   * Linear interpolation
   * @param {number} start - Start value
   * @param {number} end - End value
   * @param {number} t - Progress (0-1)
   * @returns {number} Interpolated value
   * @private
   */
  _lerp(start, end, t) {
    return start + (end - start) * t;
  }

  /**
   * Get PositionComponent class
   * @param {Object} entity - Player entity
   * @returns {Function|null} PositionComponent class
   * @private
   */
  _getPositionComponent(entity) {
    if (!entity || !entity.components) return null;
    for (const component of entity.components.values()) {
      if (component.constructor.name === 'PositionComponent') {
        return component.constructor;
      }
    }
    return null;
  }

  /**
   * Get StateComponent class
   * @param {Object} entity - Player entity
   * @returns {Function|null} StateComponent class
   * @private
   */
  _getStateComponent(entity) {
    if (!entity || !entity.components) return null;
    for (const component of entity.components.values()) {
      if (component.constructor.name === 'StateComponent') {
        return component.constructor;
      }
    }
    return null;
  }

  /**
   * Get DiggingComponent class
   * @param {Object} entity - Player entity
   * @returns {Function|null} DiggingComponent class
   * @private
   */
  _getDiggingComponent(entity) {
    if (!entity || !entity.components) return null;
    for (const component of entity.components.values()) {
      if (component.constructor.name === 'DiggingComponent') {
        return component.constructor;
      }
    }
    return null;
  }

  /**
   * Get InputComponent class
   * @param {Object} entity - Player entity
   * @returns {Function|null} InputComponent class
   * @private
   */
  _getInputComponent(entity) {
    if (!entity || !entity.components) return null;
    for (const component of entity.components.values()) {
      if (component.constructor.name === 'InputComponent') {
        return component.constructor;
      }
    }
    return null;
  }
}
