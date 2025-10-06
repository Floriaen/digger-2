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
import { PhysicsComponent } from './blocks/physics.component.js';
import { DiggableComponent } from './blocks/diggable.component.js';
import { HealthComponent } from './blocks/health.component.js';
import { RenderComponent } from './blocks/render.component.js';
import { LootableComponent } from './blocks/lootable.component.js';
import { LavaComponent } from './blocks/lava.component.js';
import { BlockFactory } from '../factories/block.factory.js';

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

    // Handle falling state - apply gravity every frame
    if (this.state === PLAYER_STATE.FALLING) {
      this._updateFalling(terrain, deltaTime);
      return;
    }

    // Check block at current position (in case we fell into it)
    const blockAtPosition = terrain.getBlock(this.gridX, this.gridY);
    const physics = blockAtPosition.get(PhysicsComponent);
    const stuckInBlock = physics && physics.isCollidable() && blockAtPosition.has(DiggableComponent);

    if (stuckInBlock) {
      // We're inside a block, dig it while also allowing movement
      this._digInDirection(terrain, 0, 0);
      // Don't return - allow player to still process input and movement
    }

    // Handle direction change requests (unless stuck and digging in place)
    if (this.requestedDirection && !stuckInBlock) {
      const canChange = this._tryChangeDirection(terrain);
      if (canChange) {
        this.digDirection = this.requestedDirection;
      }
      this.requestedDirection = null; // Clear request after attempting
    }

    // Unified directional digging (unless stuck and digging in place)
    if (!stuckInBlock) {
      this._updateDirectionalDig(terrain, deltaTime);
    }
  }

  render(ctx) {
    const camera = this.game.components.find((c) => c.constructor.name === 'CameraComponent');
    const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainComponent');
    if (!camera) return;

    const transform = camera.getTransform();

    // Check if there's a block above that should occlude the player
    const blockAbove = terrain ? terrain.getBlock(this.gridX, this.gridY - 1) : null;
    const physicsAbove = blockAbove?.get(PhysicsComponent);
    const shouldClip = physicsAbove && physicsAbove.isCollidable();

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

    // Show mouth only while actively digging (not during coyote time or falling)
    const isEating = this.currentDigTarget && this.state !== PLAYER_STATE.FALLING;

    if (isEating) {
      // 3-frame animation like original Pac-Man: open -> half -> closed -> half -> open
      const frameTime = 70; // Time per frame in ms
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
    return targetBlock.has(DiggableComponent);
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
    if (targetBlock.has(LavaComponent)) {
      eventBus.emit('player:death', { cause: 'lava' });
      this.state = PLAYER_STATE.IDLE;
      return;
    }

    // Check if target is traversable (empty/falling)
    const targetPhysics = targetBlock.get(PhysicsComponent);
    if (targetPhysics && !targetPhysics.isCollidable()) {
      if (dy > 0) {
        // Move into the empty space first
        if (this.gridY !== targetY) {
          this.gridX = targetX;
          this.gridY = targetY;
          this.x = this.gridX * 16 + 8;
          this.y = this.gridY * 16 + 8;
        }

        // Transition to falling state immediately
        this.state = PLAYER_STATE.FALLING;
        this.velocityY = 0; // Start from zero velocity
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
    if (!targetBlock.has(DiggableComponent)) {
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
      const block = terrain.getBlock(targetX, targetY);
      const diggable = block.get(DiggableComponent);

      if (!diggable) {
        // Not diggable, shouldn't reach here
        return;
      }

      // Initialize dig target with current HP
      const health = block.get(HealthComponent);
      const hp = health ? health.hp : 1;
      const maxHp = health ? health.maxHp : 1;

      this.currentDigTarget = {
        x: targetX,
        y: targetY,
        hp,
        maxHp,
      };
      this.digTimer = 0;
    }

    if (this.digTimer < DIG_INTERVAL_MS) {
      // Still digging, track progress
      return;
    }

    // Dig interval complete - apply damage via DiggableComponent
    performance.mark('dig-start');
    this.digTimer = 0;

    const block = terrain.getBlock(targetX, targetY);
    const diggable = block.get(DiggableComponent);

    if (diggable) {
      const result = diggable.dig(block, targetX, targetY, 1);

      // Update dig target HP for visual feedback
      this.currentDigTarget.hp = result.hp;

      if (result.destroyed) {
        // Block destroyed - replace with empty
        terrain.setBlock(targetX, targetY, BlockFactory.createEmpty());
        this.currentDigTarget = null;

        performance.mark('dig-end');
        try {
          performance.measure('dig', 'dig-start', 'dig-end');
        } catch (e) {
          // Ignore if marks don't exist
        }

        // Move player into the empty space
        this.gridX = targetX;
        this.gridY = targetY;
        this.x = this.gridX * 16 + 8;
        this.y = this.gridY * 16 + 8;

        // If we dug block at our position (offset 0,0), reset to idle so gravity takes over
        if (dx === 0 && dy === 0) {
          this.state = PLAYER_STATE.IDLE;
          this.digDirection = { dx: 0, dy: 1 }; // Reset to down
        }

        // After moving, gravity system will handle falling if needed (checked in next update)
      }
    }
  }

  /**
   * Handle falling physics - called every frame when in FALLING state
   * @param {TerrainComponent} terrain
   * @param {number} deltaTime
   * @private
   */
  _updateFalling(terrain, deltaTime) {
    // Apply gravity
    this.velocityY += GRAVITY;
    if (this.velocityY > FALL_SPEED_MAX) {
      this.velocityY = FALL_SPEED_MAX;
    }

    // Update position
    this.y += this.velocityY;
    const newGridY = Math.floor(this.y / 16);

    // Check if we've entered a new grid cell
    if (newGridY !== this.gridY) {
      const newGridX = Math.floor(this.x / 16);

      // Check what's at the new position BEFORE moving into it
      const blockAtNewPos = terrain.getBlock(newGridX, newGridY);

      // Check if we fell into lava
      if (blockAtNewPos.has(LavaComponent)) {
        eventBus.emit('player:death', { cause: 'lava' });
        this.state = PLAYER_STATE.IDLE;
        this.velocityY = 0;
        return;
      }

      // Check if we hit a solid block
      const physicsAtNewPos = blockAtNewPos.get(PhysicsComponent);
      if (physicsAtNewPos && physicsAtNewPos.isCollidable()) {
        // Stop at the previous grid position (don't enter the solid block)
        this.y = this.gridY * 16 + 8; // Snap to center of current grid cell
        this.velocityY = 0;

        if (blockAtNewPos.has(DiggableComponent)) {
          // Start digging the block below us
          this.state = PLAYER_STATE.DIGGING;
          this.digDirection = { dx: 0, dy: 1 };
          this._digInDirection(terrain, 0, 1); // Dig block below (dy = 1)
        } else {
          // Hit undiggable block (rock) - stop
          this.state = PLAYER_STATE.IDLE;
          this.digDirection = { dx: 0, dy: 1 };
        }
      } else {
        // Block is traversable, move into it and keep falling
        this.gridY = newGridY;
        this.gridX = newGridX;
      }
    }
  }

}
