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
    // Grid position (tiles) - start position
    this.gridX = 12;
    this.gridY = 3;

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
    this._updateDirectionalDig(terrain);
  }

  render(ctx) {
    const camera = this.game.components.find((c) => c.constructor.name === 'CameraComponent');
    if (!camera) return;

    const transform = camera.getTransform();

    // Draw red ball
    ctx.fillStyle = '#E53935';
    ctx.beginPath();
    ctx.arc(this.x + transform.x, this.y - 5 + transform.y, PLAYER_RADIUS, 0, Math.PI * 2); // -5 for 3D Fake
    ctx.fill();

    // Subtle shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(
      this.x + transform.x,
      this.y + PLAYER_RADIUS + transform.y - 4, // -4 for 3D Fake
      PLAYER_RADIUS * 0.8,
      PLAYER_RADIUS * 0.3,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Render dig progress (white outline fade)
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
   * @private
   */
  _updateDirectionalDig(terrain) {
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
        // Vertical: Free-fall through empty space
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

      // Move player to new position
      this.gridX = targetX;
      this.gridY = targetY;
      this.x = this.gridX * 16 + 8;
      this.y = this.gridY * 16 + 8; // Center of collision box

      // Continue digging in same direction (next update will check next block)
    }
  }
}
