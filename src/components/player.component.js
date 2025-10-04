/**
 * @file player.component.js
 * @description Player component - handles red ball movement, digging, and state machine
 */

import { Component } from '../core/component.base.js';
import {
  DIG_INTERVAL_MS, PLAYER_RADIUS, GRAVITY, FALL_SPEED_MAX,
} from '../utils/config.js';
import { BLOCK_TYPES, isDiggable, isTraversable, getBlock } from '../terrain/block-registry.js';
import { eventBus } from '../utils/event-bus.js';

/**
 * Player states
 */
const PLAYER_STATE = {
  IDLE: 'idle',
  DIGGING: 'digging',
  FALLING: 'falling',
  DIGGING_LATERAL: 'digging_lateral',
};

/**
 * PlayerComponent
 * Manages player position, state, and digging behavior
 */
export class PlayerComponent extends Component {
  init() {
    // Grid position (tiles) - start position (in grass layer, first line)
    this.gridX = 12;
    this.gridY = 2;

    // World position (pixels) - centered on tile
    this.x = this.gridX * 16 + 8; // Center horizontally (16/2)
    this.y = this.gridY * 16 + 8; // Center vertically on 16x16 collision box

    // Movement
    this.velocityY = 0;
    this.state = PLAYER_STATE.IDLE;
    this.digTimer = 0;
    this.currentDigTarget = null; // { x, y, hp, maxHp }
    this.digDirection = { dx: 0, dy: 1 }; // Current dig direction (default: down)
    this.requestedDirection = null; // Pending direction change request
    this.hasStarted = false; // Requires down arrow to start
    this.dead = false;

    // Coyote time: delay before falling
    this.coyoteTime = 0;
    this.coyoteTimeMax = 150; // 150ms grace period

    // Input subscription
    this.unsubscribeLeft = eventBus.on('input:move-left', () => this._requestDirection(-1, 0));
    this.unsubscribeRight = eventBus.on('input:move-right', () => this._requestDirection(1, 0));
    this.unsubscribeDown = eventBus.on('input:move-down', () => {
      if (!this.hasStarted) {
        this.hasStarted = true;
      } else {
        this._requestDirection(0, 1);
      }
    });
    this.unsubscribeDeath = eventBus.on('player:death', () => {
      this.dead = true;
    });
  }

  update(deltaTime) {
    const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainComponent');
    if (!terrain) return;

    // Stop updating if dead
    if (this.dead) {
      this.state = PLAYER_STATE.IDLE;
      return;
    }

    // Wait for down arrow to start
    if (!this.hasStarted) {
      this.state = PLAYER_STATE.IDLE;
      return;
    }

    // Auto-dig timer
    this.digTimer += deltaTime;

    // Check block at current position (in case we fell into it)
    const blockAtPosition = terrain.getBlock(this.gridX, this.gridY);
    if (!isTraversable(blockAtPosition) && isDiggable(blockAtPosition)) {
      // We're inside a block, dig it first
      this._digInDirection(terrain, 0, 0);
      return;
    }

    // Handle direction change requests
    if (this.requestedDirection) {
      const canChange = this._tryChangeDirection(terrain);
      if (canChange) {
        this.digDirection = this.requestedDirection;
      }
      this.requestedDirection = null; // Clear request after attempting
    }

    // Unified directional digging
    this._updateDirectionalDig(terrain, deltaTime);
  }

  render(ctx) {
    const camera = this.game.components.find((c) => c.constructor.name === 'CameraComponent');
    const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainComponent');
    if (!camera) return;

    const transform = camera.getTransform();

    // Check if there's a block above that should occlude the player
    const blockAbove = terrain ? terrain.getBlock(this.gridX, this.gridY - 1) : null;
    const shouldClip = blockAbove && !isTraversable(blockAbove);

    ctx.save();

    if (shouldClip) {
      // Clip the player to only render below the block above
      // Block above starts at (gridY - 1) * 16, cap extends 9px up, so block bottom is at gridY * 16
      const clipTop = this.gridY * 16 + transform.y;
      ctx.beginPath();
      ctx.rect(0, clipTop, ctx.canvas.width, ctx.canvas.height - clipTop);
      ctx.clip();
    }

    // Draw Pac-Man style ball
    const centerX = this.x + transform.x;
    const centerY = this.y - 5 + transform.y; // -5 for 3D Fake

    ctx.fillStyle = '#E53935';

    // Calculate mouth angle based on dig timer (animated)
    let mouthAngle = 0;
    let directionAngle = 0;

    // Show mouth while digging OR during coyote time (but not when falling)
    const isEating = (this.currentDigTarget || (this.coyoteTime > 0 && this.coyoteTime < this.coyoteTimeMax))
      && this.state !== PLAYER_STATE.FALLING;

    if (isEating) {
      // 3-frame animation like original Pac-Man: open -> half -> closed -> half -> open
      const frameTime = 100; // Time per frame in ms
      const frame = Math.floor(this.digTimer / frameTime) % 4;

      // Frame sequence: 0=open, 1=half, 2=closed, 3=half
      if (frame === 0) mouthAngle = Math.PI / 4; // Fully open (45°)
      else if (frame === 1) mouthAngle = Math.PI / 8; // Half open (22.5°)
      else if (frame === 2) mouthAngle = 0; // Closed
      else if (frame === 3) mouthAngle = Math.PI / 8; // Half open (22.5°)

      // Direction based on dig direction
      const { dx, dy } = this.digDirection;
      if (dx > 0) directionAngle = 0; // Right
      else if (dx < 0) directionAngle = Math.PI; // Left
      else if (dy > 0) directionAngle = Math.PI / 2; // Down
      else if (dy < 0) directionAngle = -Math.PI / 2; // Up
    }

    if (isEating && mouthAngle > 0) {
      // Draw Pac-Man with mouth
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
      // Draw full circle when not digging
      ctx.beginPath();
      ctx.arc(centerX, centerY, PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Render dig progress (white outline fade) - always on top
    if (this.currentDigTarget) {
      const progress = 1 - (this.currentDigTarget.hp / this.currentDigTarget.maxHp);
      const alpha = 0.3 + progress * 0.5;

      const targetX = this.currentDigTarget.x * 16 + transform.x;
      const targetY = this.currentDigTarget.y * 16 + transform.y;

      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(targetX, targetY, 16, 16);
    }
  }

  destroy() {
    this.unsubscribeLeft();
    this.unsubscribeRight();
    this.unsubscribeDown();
    this.unsubscribeDeath();
  }

  /**
   * Request a direction change
   * @param {number} dx - Delta X (-1 left, 0 none, 1 right)
   * @param {number} dy - Delta Y (0 none, 1 down)
   * @private
   */
  _requestDirection(dx, dy) {
    if (!this.hasStarted || this.dead) return;
    // Block input during coyote time
    if (this.coyoteTime > 0 && this.coyoteTime < this.coyoteTimeMax) return;
    this.requestedDirection = { dx, dy };
  }

  /**
   * Try to change direction - succeeds if target block is diggable
   * @param {TerrainComponent} terrain
   * @returns {boolean} True if direction change allowed
   * @private
   */
  _tryChangeDirection(terrain) {
    const { dx, dy } = this.requestedDirection;
    const targetX = this.gridX + dx;
    const targetY = this.gridY + dy;
    const targetBlock = terrain.getBlock(targetX, targetY);

    // Can change direction if target is diggable
    return isDiggable(targetBlock);
  }

  /**
   * Update directional digging (unified for all directions)
   * @param {TerrainComponent} terrain
   * @param {number} deltaTime - Time since last update
   * @private
   */
  _updateDirectionalDig(terrain, deltaTime) {
    const { dx, dy } = this.digDirection;
    const targetX = this.gridX + dx;
    const targetY = this.gridY + dy;
    const targetBlock = terrain.getBlock(targetX, targetY);

    // Check if target is lava (death)
    if (targetBlock === BLOCK_TYPES.LAVA) {
      eventBus.emit('player:death', { cause: 'lava' });
      this.state = PLAYER_STATE.IDLE;
      return;
    }

    // Check if target is traversable (empty/falling)
    if (isTraversable(targetBlock)) {
      if (dy > 0) {
        // Increment coyote time when above empty space
        this.coyoteTime += deltaTime;

        // Only start falling/moving after coyote time expires
        if (this.coyoteTime >= this.coyoteTimeMax) {
          // Move into the empty space first (if we haven't already)
          if (this.gridY !== targetY) {
            this.gridX = targetX;
            this.gridY = targetY;
            this.x = this.gridX * 16 + 8;
            this.y = this.gridY * 16 + 8;
          }

          // Then start falling
          this.state = PLAYER_STATE.FALLING;
          this.velocityY += GRAVITY;
          if (this.velocityY > FALL_SPEED_MAX) this.velocityY = FALL_SPEED_MAX;

          const oldGridY = this.gridY;
          this.y += this.velocityY;
          this.gridY = Math.floor(this.y / 16);

          if (this.gridY > oldGridY + 1) {
            this.gridY = oldGridY + 1;
            this.y = this.gridY * 16 + 16 - 8;
          }

          this.currentDigTarget = null;
        }
        // During coyote time, stay in place (appear to stand on nothing briefly)
      } else {
        // Lateral: Stop at empty space
        this.state = PLAYER_STATE.IDLE;
        this.currentDigTarget = null;
        this.digDirection = { dx: 0, dy: 1 }; // Reset to down
      }
      return;
    }

    // Check if target is diggable
    if (!isDiggable(targetBlock)) {
      // Hit rock or boundary - stop and reset to down
      this.state = PLAYER_STATE.IDLE;
      this.velocityY = 0;
      this.currentDigTarget = null;
      this.digDirection = { dx: 0, dy: 1 }; // Reset to down
      return;
    }

    // Target is diggable - dig it
    this.state = dy === 0 ? PLAYER_STATE.DIGGING_LATERAL : PLAYER_STATE.DIGGING;
    this.velocityY = 0;
    this.coyoteTime = 0; // Reset coyote time when on solid ground
    this._digInDirection(terrain, dx, dy);
  }

  /**
   * Dig block in direction (respects HP, moves player on completion)
   * @param {TerrainComponent} terrain
   * @param {number} dx - Delta X
   * @param {number} dy - Delta Y
   * @private
   */
  _digInDirection(terrain, dx, dy) {
    const targetX = this.gridX + dx;
    const targetY = this.gridY + dy;

    const isNewTarget = !this.currentDigTarget
      || this.currentDigTarget.x !== targetX
      || this.currentDigTarget.y !== targetY;

    if (isNewTarget) {
      const blockType = terrain.getBlock(targetX, targetY);
      const blockData = getBlock(blockType);
      this.currentDigTarget = {
        x: targetX,
        y: targetY,
        hp: blockData.hp,
        maxHp: blockData.hp,
      };
      this.digTimer = 0;
    }

    if (this.digTimer < DIG_INTERVAL_MS) {
      // Still digging, track progress
      return;
    }

    // Dig interval complete - reduce HP
    this.digTimer = 0;
    this.currentDigTarget.hp -= 1;

    if (this.currentDigTarget.hp <= 0) {
      // Block destroyed
      terrain.setBlock(targetX, targetY, BLOCK_TYPES.EMPTY);
      this.currentDigTarget = null;

      // Emit event for falling blocks system
      eventBus.emit('block:destroyed', { x: targetX, y: targetY });

      // If digging downward, activate coyote time delay before moving
      if (dy > 0) {
        this.coyoteTime = 0; // Start coyote timer
        // Don't move yet - will move after coyote time expires
        return;
      }

      // Move player to new position (immediate for lateral movement)
      this.gridX = targetX;
      this.gridY = targetY;
      this.x = this.gridX * 16 + 8;
      this.y = this.gridY * 16 + 8; // Center of collision box

      // Continue digging in same direction (next update will check next block)
    }
  }
}
