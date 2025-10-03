/**
 * @file player.component.js
 * @description Player component - handles red ball movement, digging, and state machine
 */

import { Component } from '../core/component.base.js';
import {
  DIG_INTERVAL_MS, PLAYER_RADIUS, GRAVITY, FALL_SPEED_MAX,
} from '../utils/config.js';
import { BLOCK_TYPES, isDiggable, isTraversable } from '../terrain/block-registry.js';
import { eventBus } from '../utils/event-bus.js';

/**
 * Player states
 */
const PLAYER_STATE = {
  IDLE: 'idle',
  DIGGING: 'digging',
  FALLING: 'falling',
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
    this.y = this.gridY * 25 + 17; // Sitting on fake-3D cap (9px cap + 8px radius)

    // Movement
    this.velocityY = 0;
    this.state = PLAYER_STATE.IDLE;
    this.digTimer = 0;
    this.currentDigTarget = null; // { x, y, hp, maxHp }
    this.hasStarted = false; // Requires down arrow to start
    this.dead = false;

    // Input subscription
    this.unsubscribeLeft = eventBus.on('input:move-left', () => this._tryMoveLateral(-1));
    this.unsubscribeRight = eventBus.on('input:move-right', () => this._tryMoveLateral(1));
    this.unsubscribeDown = eventBus.on('input:move-down', () => {
      this.hasStarted = true;
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
      this._digBlock(terrain, this.gridX, this.gridY);
      return;
    }

    // Check block below
    const blockBelow = terrain.getBlock(this.gridX, this.gridY + 1);

    if (isTraversable(blockBelow)) {
      // Free-fall through empty space
      this.state = PLAYER_STATE.FALLING;
      this.velocityY += GRAVITY;
      if (this.velocityY > FALL_SPEED_MAX) this.velocityY = FALL_SPEED_MAX;

      // Move down by velocity, but clamp to grid to avoid skipping blocks
      const oldGridY = this.gridY;
      this.y += this.velocityY;
      this.gridY = Math.floor(this.y / 25);

      // If we moved more than 1 block, clamp it
      if (this.gridY > oldGridY + 1) {
        this.gridY = oldGridY + 1;
        this.y = this.gridY * 25 + 17;
      }

      this.currentDigTarget = null;
    } else if (isDiggable(blockBelow)) {
      // Hit a diggable block - stop and dig
      this.state = PLAYER_STATE.DIGGING;
      this.velocityY = 0;
      this._digBlock(terrain, this.gridX, this.gridY + 1);
    } else {
      // Blocked (rock or boundary)
      this.state = PLAYER_STATE.IDLE;
      this.velocityY = 0;
      this.currentDigTarget = null;
    }
  }

  render(ctx) {
    const camera = this.game.components.find((c) => c.constructor.name === 'CameraComponent');
    if (!camera) return;

    const transform = camera.getTransform();

    // Draw red ball
    ctx.fillStyle = '#E53935';
    ctx.beginPath();
    ctx.arc(this.x + transform.x, this.y + transform.y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Subtle shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(
      this.x + transform.x,
      this.y + PLAYER_RADIUS + transform.y + 2,
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
      const targetY = this.currentDigTarget.y * 25 + transform.y;

      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(targetX, targetY, 16, 25);
    }
  }

  destroy() {
    this.unsubscribeLeft();
    this.unsubscribeRight();
    this.unsubscribeDown();
    this.unsubscribeDeath();
  }

  /**
   * Dig a block
   * @param {TerrainComponent} terrain
   * @param {number} gridX
   * @param {number} gridY
   * @private
   */
  _digBlock(terrain, gridX, gridY) {
    if (this.digTimer < DIG_INTERVAL_MS) {
      // Still digging, track progress
      const isNewTarget = !this.currentDigTarget
        || this.currentDigTarget.x !== gridX
        || this.currentDigTarget.y !== gridY;

      if (isNewTarget) {
        const blockData = { hp: 1, maxHp: 1 }; // Pure mud HP=1
        this.currentDigTarget = { x: gridX, y: gridY, ...blockData };
      }
      return;
    }

    // Dig complete
    this.digTimer = 0;
    terrain.setBlock(gridX, gridY, BLOCK_TYPES.EMPTY);
    this.currentDigTarget = null;

    // Emit event for falling blocks system
    eventBus.emit('block:destroyed', { x: gridX, y: gridY });

    // Move player down
    this.gridY += 1;
    this.y = this.gridY * 25 + 17; // Sit on fake-3D cap
  }

  /**
   * Try to move laterally
   * @param {number} direction - -1 for left, 1 for right
   * @private
   */
  _tryMoveLateral(direction) {
    const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainComponent');
    if (!terrain) return;

    const targetX = this.gridX + direction;
    const block = terrain.getBlock(targetX, this.gridY);

    // Only dig lateral if block is diggable (ignore empty and indestructible)
    if (isDiggable(block)) {
      // Dig lateral block
      terrain.setBlock(targetX, this.gridY, BLOCK_TYPES.EMPTY);
      this.gridX = targetX;
      this.x = this.gridX * 16 + 8; // Center on new tile
      eventBus.emit('block:destroyed', { x: targetX, y: this.gridY });
    }
    // Ignore empty/traversable blocks - no movement into empty space
  }
}
