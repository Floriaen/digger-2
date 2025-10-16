/**
 * @file render.component.js
 * @description Player rendering (Pac-Man style ball with animated mouth)
 *
 * Renders the player as a red Pac-Man ball with animated eating mouth.
 * Extracted from PlayerSystem lines 264-352.
 */

import { Component } from '../../core/component.js';
import { PLAYER_RADIUS } from '../../utils/config.js';
import { PhysicsComponent } from '../block/physics.component.js';
import { PLAYER_STATE } from './state.component.js';

export class RenderComponent extends Component {
  /**
   * Render player
   * @param {Object} entity - Player entity
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} context - Game context with camera and terrain
   */
  render(entity, ctx, context) {
    const { game, camera, terrain } = context;
    const cameraRef = camera
      || game?.components?.find((c) => c.constructor.name === 'CameraSystem');
    const terrainRef = terrain
      || game?.components?.find((c) => c.constructor.name === 'TerrainSystem');

    if (!cameraRef) return;

    const PositionComponent = this._getPositionComponent(entity);
    const StateComponent = this._getStateComponent(entity);
    const DiggingComponent = this._getDiggingComponent(entity);

    const position = entity.get(PositionComponent);
    const state = entity.get(StateComponent);
    const digging = DiggingComponent ? entity.get(DiggingComponent) : null;

    if (!position || !state) return;

    const viewBounds = cameraRef.getViewBounds(ctx.canvas);

    // Check if there's a block above that should occlude the player
    const blockAbove = terrainRef ? terrainRef.getBlock(position.gridX, position.gridY - 1) : null;
    const physicsAbove = blockAbove?.get(PhysicsComponent);
    const shouldClip = physicsAbove && physicsAbove.isCollidable();

    ctx.save();

    if (shouldClip) {
      // Clip the player to only render below the block above
      // Block above starts at (gridY - 1) * 16, cap extends 9px up, so block bottom is at gridY * 16
      const clipTop = position.gridY * 16;
      ctx.beginPath();
      ctx.rect(
        viewBounds.left,
        clipTop,
        viewBounds.right - viewBounds.left,
        viewBounds.bottom - clipTop,
      );
      ctx.clip();
    }

    // Draw Pac-Man style ball
    const centerX = position.x;
    const centerY = position.y - 5; // -5 for 3D Fake

    ctx.fillStyle = '#E53935';

    // Calculate mouth angle based on dig timer (animated)
    let mouthAngle = 0;
    let directionAngle = 0;

    // Show mouth only while actively digging (not during coyote time or falling)
    const isEating = digging
      && digging.currentDigTarget
      && !state.is(PLAYER_STATE.FALLING);

    if (isEating && digging) {
      // 3-frame animation like original Pac-Man: open -> half -> closed -> half -> open
      const frameTime = 70; // Time per frame in ms
      const frame = Math.floor(digging.digTimer / frameTime) % 4;

      // Frame sequence: 0=open, 1=half, 2=closed, 3=half
      if (frame === 0) mouthAngle = Math.PI / 4; // Fully open (45°)
      else if (frame === 1) mouthAngle = Math.PI / 8; // Half open (22.5°)
      else if (frame === 2) mouthAngle = 0; // Closed
      else if (frame === 3) mouthAngle = Math.PI / 8; // Half open (22.5°)

      // Direction based on dig direction
      const { dx, dy } = digging.digDirection;
      if (dx > 0) directionAngle = 0; // Right
      else if (dx < 0) directionAngle = Math.PI; // Left
      else if (dy > 0) directionAngle = Math.PI / 2; // Down
      else if (dy < 0) directionAngle = -Math.PI / 2; // Up
    }

    if (isEating) {
      // Draw Pac-Man with mouth (animated)
      if (mouthAngle > 0) {
        ctx.beginPath();
        ctx.arc(
          centerX,
          centerY,
          PLAYER_RADIUS,
          directionAngle + mouthAngle,
          directionAngle - mouthAngle + Math.PI * 2,
        );
        ctx.lineTo(centerX, centerY);
        ctx.closePath();
        ctx.fill();
      } else {
        // Closed mouth frame - still show direction with full circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, PLAYER_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Draw full circle when not digging
      ctx.beginPath();
      ctx.arc(centerX, centerY, PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
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
}
