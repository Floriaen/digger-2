/**
 * @file player.component.js
 * @description Player component - handles red ball movement, digging, and state machine
 */

import { System } from '../core/system.js';
import {
  DIG_INTERVAL_MS,
  PLAYER_RADIUS,
  CHUNK_SIZE,
  WORLD_WIDTH_CHUNKS,
  TILE_WIDTH,
  TILE_HEIGHT,
  RESET_TIMER_ON_LEVEL,
} from '../utils/config.js';
import { eventBus } from '../utils/event-bus.js';
import { PhysicsComponent } from '../components/block/physics.component.js';
import { DiggableComponent } from '../components/block/diggable.component.js';
import { HealthComponent } from '../components/block/health.component.js';
import { LethalComponent } from '../components/block/lethal.component.js';
import { FallableComponent } from '../components/block/fallable.component.js';
import { LootableComponent } from '../components/block/lootable.component.js';
import { PauseOnDestroyComponent } from '../components/block/pause-on-destroy.component.js';
import { DoorComponent } from '../components/block/door.component.js';
import { BlockFactory } from '../factories/block.factory.js';

/**
 * Player states
 */
const PLAYER_STATE = {
  IDLE: 'idle',
  DIGGING: 'digging',
  FALLING: 'falling',
  DIGGING_LATERAL: 'digging_lateral',
  MOVING: 'moving',
};
const TIMER_UPDATE_EVENT = 'timer:update';
const MS_PER_SECOND = 1000;
const HORIZONTAL_MOVE_DURATION_MS = 120;

/**
 * PlayerSystem
 * Manages player position, state, and digging behavior
 */
export class PlayerSystem extends System {
  static INITIAL_TIMER_SECONDS = 60;

  init() {
    // Determine world width (tiles) to center player horizontally
    const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainSystem');
    const fallbackWidthTiles = WORLD_WIDTH_CHUNKS * CHUNK_SIZE;
    let worldWidthTiles = terrain?.worldWidthTiles ?? fallbackWidthTiles;
    if (!Number.isFinite(worldWidthTiles) || worldWidthTiles <= 0) {
      worldWidthTiles = fallbackWidthTiles;
    }

    // Grid position (tiles) - start position (centered in grass layer)
    const centeredGridX = Math.floor(worldWidthTiles / 2);
    this.gridX = Math.max(0, Math.min(worldWidthTiles - 1, centeredGridX));
    this.gridY = 2;

    // World position (pixels) - centered on tile
    this.x = this.gridX * 16 + 8; // Center horizontally (16/2)
    this.y = this.gridY * 16 + 8; // Center vertically on 16x16 collision box

    // Spawn reference for restart logic
    this.spawnGridX = this.gridX;
    this.spawnGridY = this.gridY;
    this.spawnX = this.x;
    this.spawnY = this.y;

    // Gravity/falling via FallableComponent (ECS pattern)
    this.fallable = new FallableComponent();
    this.fallable.attachOwner(this);

    // Movement
    this.state = PLAYER_STATE.IDLE;
    this.digTimer = 0;
    this.currentDigTarget = null; // { x, y, hp, maxHp }
    this.digDirection = { dx: 0, dy: 1 }; // Current dig direction (default: down)
    this.requestedDirection = null; // Pending direction change request
    this.hasStarted = false; // Requires down arrow to start
    this.dead = false;
    this.timerMs = 0;
    this.lastTimerBroadcastSeconds = null;
    this._resetTimer();
    this.movement = {
      active: false,
      duration: HORIZONTAL_MOVE_DURATION_MS,
      elapsed: 0,
      startX: this.x,
      startY: this.y,
      targetX: this.x,
      targetY: this.y,
      targetGridX: this.gridX,
      targetGridY: this.gridY,
    };
    this.transitioning = false;
    this.timerBeforeTransition = null;

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
      if (this.movement) {
        this.movement.active = false;
      }
    });
    this.unsubscribeCrushed = eventBus.on('block:crushed-player', ({ cause }) => {
      if (!this.dead) {
        eventBus.emit('player:death', { cause, shouldRegenerate: false });
      }
    });
    this.unsubscribeRestart = eventBus.on(
      'player:restart',
      ({ preserveTimer = false } = {}) => {
        const currentTimer = this.timerMs;
        const shouldPreserve = preserveTimer
          && Number.isFinite(currentTimer)
          && currentTimer > 0;
        this.resetToSpawn({
          preserveTimer: shouldPreserve,
          timerMs: shouldPreserve ? currentTimer : undefined,
        });
      },
    );
    this.unsubscribeBlockLoot = eventBus.on(
      'block:loot',
      ({ loot, timerIncrementSeconds } = {}) => {
        if (this.dead) {
          return;
        }
        const rewardSeconds = Number(timerIncrementSeconds);
        if (!Number.isFinite(rewardSeconds) || rewardSeconds <= 0) {
          return;
        }
        const hasCoinLoot = Array.isArray(loot)
          && loot.some((item) => item && item.type === 'coin');
        if (!hasCoinLoot) {
          return;
        }
        this._addTimerSeconds(rewardSeconds);
      },
    );
    this.unsubscribeTransitionComplete = eventBus.on(
      'level:transition:complete',
      () => {
        this._handleLevelTransitionComplete();
      },
    );
  }

  update(deltaTime) {
    const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainSystem');
    if (!terrain) return;

    if (this.transitioning) {
      this.state = PLAYER_STATE.IDLE;
      return;
    }

    // Stop updating if dead
    if (this.dead) {
      this.state = PLAYER_STATE.IDLE;
      return;
    }

    // Wait for down arrow to start, but still allow gravity to pull us down
    if (!this.hasStarted) {
      if (this._beginFallIfUnsupported(terrain)) {
        return;
      }
      this.state = PLAYER_STATE.IDLE;
      return;
    }

    this._tickTimer(deltaTime);
    if (this.dead) {
      this.state = PLAYER_STATE.IDLE;
      return;
    }

    if (this.state === PLAYER_STATE.MOVING) {
      const stillMoving = this._updateMovement(deltaTime);
      if (stillMoving) {
        return;
      }
    }

    // Auto-dig timer
    this.digTimer += deltaTime;

    // Falling is now handled by GravitySystem
    if (this.state === PLAYER_STATE.FALLING) {
      // GravitySystem will handle the physics
      return;
    }

    // Check block at current position (in case we fell into it)
    const blockAtPosition = terrain.getBlock(this.gridX, this.gridY);
    if (this.enterDoor(blockAtPosition, this.gridX, this.gridY, 'player:update')) {
      return;
    }
    const physics = blockAtPosition.get(PhysicsComponent);
    const stuckInBlock = physics
      && physics.isCollidable()
      && blockAtPosition.has(DiggableComponent);

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
      if (!this._beginFallIfUnsupported(terrain)) {
        this._updateDirectionalDig(terrain);
      }
    }
  }

  render(ctx) {
    const camera = this.game.components.find((c) => c.constructor.name === 'CameraSystem');
    const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainSystem');
    if (!camera) return;

    const viewBounds = camera.getViewBounds(ctx.canvas);

    // Check if there's a block above that should occlude the player
    const blockAbove = terrain ? terrain.getBlock(this.gridX, this.gridY - 1) : null;
    const physicsAbove = blockAbove?.get(PhysicsComponent);
    const shouldClip = physicsAbove && physicsAbove.isCollidable();

    ctx.save();

    if (shouldClip) {
      // Clip the player to only render below the block above
      // Block above starts at (gridY - 1) * 16, cap extends 9px up, so block bottom is at gridY * 16
      const clipTop = this.gridY * 16;
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
    const centerX = this.x;
    const centerY = this.y - 5; // -5 for 3D Fake

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
    this.unsubscribeCrushed();
    this.unsubscribeRestart();
    if (this.unsubscribeBlockLoot) {
      this.unsubscribeBlockLoot();
      this.unsubscribeBlockLoot = null;
    }
    if (this.unsubscribeTransitionComplete) {
      this.unsubscribeTransitionComplete();
      this.unsubscribeTransitionComplete = null;
    }
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
   * Try to change direction - succeeds if target block is diggable or is a door
   * @param {TerrainSystem} terrain
   * @returns {boolean} True if direction change allowed
   * @private
   */
  _tryChangeDirection(terrain) {
    const { dx, dy } = this.requestedDirection;
    const targetX = this.gridX + dx;
    const targetY = this.gridY + dy;
    const targetBlock = terrain.getBlock(targetX, targetY);

    // Can change direction if target is diggable or is a door
    const canChange = targetBlock.has(DiggableComponent) || targetBlock.has(DoorComponent);
    return canChange;
  }

  /**
   * Update directional digging (unified for all directions)
   * @param {TerrainSystem} terrain
   * @private
   */
  _updateDirectionalDig(terrain) {
    const { dx, dy } = this.digDirection;
    const targetX = this.gridX + dx;
    const targetY = this.gridY + dy;
    const targetBlock = terrain.getBlock(targetX, targetY);

    // Check if target is lava (death)
    if (targetBlock.has(LethalComponent)) {
      const lethal = targetBlock.get(LethalComponent);
      eventBus.emit('player:death', {
        cause: 'lava',
        shouldRegenerate: lethal.shouldRegenerate,
      });
      this.state = PLAYER_STATE.IDLE;
      return;
    }

    // Check if target is a door (level transition)
    if (targetBlock.has(DoorComponent)) {
      this.enterDoor(targetBlock, targetX, targetY, 'player:movement');
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
        this.fallable.reset(); // Reset fallable component for new fall
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
      this.fallable.reset();
      this.currentDigTarget = null;
      this.digDirection = { dx: 0, dy: 1 }; // Reset to down
      return;
    }

    // Target is diggable - dig it
    this.state = dy === 0 ? PLAYER_STATE.DIGGING_LATERAL : PLAYER_STATE.DIGGING;
    this.fallable.reset();
    this._digInDirection(terrain, dx, dy);
  }

  /**
   * Dig block in direction (respects HP, moves player on completion)
   * @param {TerrainSystem} terrain
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
        if (block.has(PauseOnDestroyComponent)) {
          this.game.pause();
        }
        // Check if block has lootable component to spawn entity
        const lootable = block.get(LootableComponent);
        if (lootable && lootable.hasSpawnEntity()) {
          // Spawn replacement entity instead of empty
          const spawnConfig = lootable.getSpawnEntity();
          const newBlock = BlockFactory[spawnConfig.factoryMethod](...(spawnConfig.args || []));
          terrain.setBlock(targetX, targetY, newBlock);
        } else {
          // Regular block - replace with empty
          terrain.setBlock(targetX, targetY, BlockFactory.createEmpty());
        }
        this.currentDigTarget = null;

        performance.mark('dig-end');
        try {
          performance.measure('dig', 'dig-start', 'dig-end');
        } catch (e) {
          // Ignore if marks don't exist
        }

        // Don't teleport the player - let gravity handle movement
        const replacementBlock = terrain.getBlock(targetX, targetY);
        const replacementPhysics = replacementBlock?.get(PhysicsComponent);
        const canEnterReplacement = replacementPhysics ? !replacementPhysics.isCollidable() : true;

        if (dy > 0) {
          // Digging down - transition to falling state, let gravity move us
          if (canEnterReplacement) {
            this.state = PLAYER_STATE.FALLING;
            this.fallable.reset(); // Reset for new fall
          } else if (replacementBlock?.has(DiggableComponent)) {
            this.state = PLAYER_STATE.DIGGING;
            this.digDirection = { dx, dy };
            this.currentDigTarget = null;
            this._digInDirection(terrain, dx, dy);
          } else {
            this.state = PLAYER_STATE.IDLE;
            this.digDirection = { dx: 0, dy: 1 };
            this._beginFallIfUnsupported(terrain);
          }
        } else if (dx !== 0) {
          // Lateral digging - move horizontally only
          if (canEnterReplacement) {
            this._beginMovement(targetX, targetY, HORIZONTAL_MOVE_DURATION_MS);
          } else if (replacementBlock?.has(DiggableComponent)) {
            this.state = PLAYER_STATE.DIGGING_LATERAL;
            this.digDirection = { dx, dy };
            this.currentDigTarget = null;
            this._digInDirection(terrain, dx, dy);
          } else {
            this.state = PLAYER_STATE.IDLE;
            this.digDirection = { dx: 0, dy: 1 }; // Reset to down
            this._beginFallIfUnsupported(terrain);
          }
        } else if (dx === 0 && dy === 0) {
          // Dug block at our position - just go idle, gravity will take over
          this.state = PLAYER_STATE.IDLE;
          this.digDirection = { dx: 0, dy: 1 }; // Reset to down
          this._beginFallIfUnsupported(terrain);
        }
      }
    }
  }

  /**
   * Restore player to spawn point without affecting terrain state
   */
  resetToSpawn({ preserveTimer = false, timerMs } = {}) {
    this.gridX = this.spawnGridX;
    this.gridY = this.spawnGridY;
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.state = PLAYER_STATE.IDLE;
    this.digTimer = 0;
    this.currentDigTarget = null;
    this.digDirection = { dx: 0, dy: 1 };
    this.requestedDirection = null;
    this.hasStarted = false;
    this.dead = false;
    this.fallable.reset();
    if (preserveTimer) {
      if (Number.isFinite(timerMs)) {
        this.timerMs = Math.max(0, timerMs);
      }
      this._broadcastTimerIfNeeded(true);
    } else {
      this._resetTimer();
    }
    this.movement.active = false;
    this.movement.elapsed = 0;
    this.movement.targetGridX = this.gridX;
    this.movement.targetGridY = this.gridY;
    this.movement.startX = this.x;
    this.movement.startY = this.y;
    this.movement.targetX = this.x;
    this.movement.targetY = this.y;
    this.movement.duration = HORIZONTAL_MOVE_DURATION_MS;
  }

  /**
   * Handle landing after falling - called by GravitySystem
   * @param {Block} blockLandedOn - The block the player landed on
   * @param {number} landX - X position of the block
   * @param {number} landY - Y position of the block
   */
  handleLanding(blockLandedOn, _landX, _landY) {
    const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainSystem');

    if (blockLandedOn.has(DiggableComponent)) {
      // Start digging the block below us
      this.state = PLAYER_STATE.DIGGING;
      this.digDirection = { dx: 0, dy: 1 };
      this._digInDirection(terrain, 0, 1); // Dig block below (dy = 1)
    } else {
      // Hit undiggable block (rock) - stop
      this.state = PLAYER_STATE.IDLE;
      this.digDirection = { dx: 0, dy: 1 };
    }
  }

  /**
   * Force the player into falling state if there is no support below.
   * @param {TerrainSystem} terrain
   * @returns {boolean} True if falling was triggered
   * @private
   */
  _beginFallIfUnsupported(terrain) {
    if (this.state === PLAYER_STATE.FALLING) {
      return true;
    }

    const belowBlock = terrain.getBlock(this.gridX, this.gridY + 1);
    const belowPhysics = belowBlock.get(PhysicsComponent);
    const hasSupport = belowPhysics && belowPhysics.isCollidable();

    if (hasSupport) {
      return false;
    }

    this.state = PLAYER_STATE.FALLING;
    this.fallable.reset();
    this.currentDigTarget = null;
    this.digTimer = 0;
    this.hasStarted = true;
    return true;
  }

  _resetTimer() {
    this.timerMs = PlayerSystem.INITIAL_TIMER_SECONDS * MS_PER_SECOND;
    this._broadcastTimerIfNeeded(true);
  }

  _tickTimer(deltaTime) {
    if (this.timerMs <= 0) {
      return;
    }

    this.timerMs = Math.max(0, this.timerMs - deltaTime);
    this._broadcastTimerIfNeeded();

    if (this.timerMs === 0 && !this.dead) {
      eventBus.emit('player:death', { cause: 'time_expired', shouldRegenerate: false });
    }
  }

  _addTimerSeconds(seconds) {
    if (seconds <= 0 || this.dead) {
      return;
    }

    const maxTimerMs = PlayerSystem.INITIAL_TIMER_SECONDS * MS_PER_SECOND;
    this.timerMs = Math.min(maxTimerMs, this.timerMs + seconds * MS_PER_SECOND);
    this._broadcastTimerIfNeeded();
  }

  _beginMovement(targetGridX, targetGridY, durationMs) {
    this.movement = {
      active: true,
      duration: Math.max(1, durationMs),
      elapsed: 0,
      startX: this.x,
      startY: this.y,
      targetX: targetGridX * TILE_WIDTH + TILE_WIDTH / 2,
      targetY: targetGridY * TILE_HEIGHT + TILE_HEIGHT / 2,
      targetGridX,
      targetGridY,
    };
    this.state = PLAYER_STATE.MOVING;
  }

  _updateMovement(deltaTime) {
    if (!this.movement?.active) {
      this.state = PLAYER_STATE.IDLE;
      return false;
    }

    const { movement } = this;
    movement.elapsed += deltaTime;
    const { duration } = movement;
    const progress = Math.min(1, movement.elapsed / duration);

    this.x = this._lerp(movement.startX, movement.targetX, progress);
    this.y = this._lerp(movement.startY, movement.targetY, progress);

    if (progress >= 1) {
      this.gridX = movement.targetGridX;
      this.gridY = movement.targetGridY;
      this.x = movement.targetX;
      this.y = movement.targetY;
      this.state = PLAYER_STATE.IDLE;
      movement.active = false;

      const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainSystem');
      if (terrain) {
        const block = terrain.getBlock(this.gridX, this.gridY);
        if (this.enterDoor(block, this.gridX, this.gridY, 'player:movement')) {
          return false;
        }
        this._beginFallIfUnsupported(terrain);
      }
      return false;
    }

    return true;
  }

  enterDoor(block, gridX, gridY, source = 'player') {
    if (!block || this.transitioning) {
      return false;
    }

    if (!block.has(DoorComponent)) {
      return false;
    }

    const door = block.get(DoorComponent);
    if (door && typeof door.isActive === 'function' && !door.isActive()) {
      return false;
    }

    const started = this._beginLevelTransition();
    if (!started) {
      return false;
    }

    if (door && typeof door.deactivate === 'function') {
      door.deactivate();
    }

    const triggerId = performance.now?.() ?? Date.now();
    eventBus.emit('level:transition', {
      door: { gridX, gridY },
      source,
      triggerId,
    });
    return true;
  }

  _beginLevelTransition() {
    if (this.transitioning) {
      return false;
    }

    this.transitioning = true;
    this.timerBeforeTransition = this.timerMs;
    this.state = PLAYER_STATE.IDLE;
    this.currentDigTarget = null;
    this.digTimer = 0;
    this.digDirection = { dx: 0, dy: 1 };
    this.requestedDirection = null;
    this.hasStarted = false;
    if (this.movement) {
      this.movement.active = false;
      this.movement.elapsed = 0;
    }
    if (this.fallable) {
      this.fallable.land();
      this.fallable.reset();
    }
    return true;
  }

  _handleLevelTransitionComplete() {
    const shouldPreserveTimer = !RESET_TIMER_ON_LEVEL
      && Number.isFinite(this.timerBeforeTransition)
      && this.timerBeforeTransition > 0;
    this.resetToSpawn({
      preserveTimer: shouldPreserveTimer,
      timerMs: shouldPreserveTimer ? this.timerBeforeTransition : undefined,
    });
    this.timerBeforeTransition = null;
    this.hasStarted = true;
    this.state = PLAYER_STATE.IDLE;
    this.transitioning = false;
  }

  _lerp(start, end, t) {
    return start + (end - start) * t;
  }

  _broadcastTimerIfNeeded(force = false) {
    const seconds = Math.max(0, Math.floor(this.timerMs / MS_PER_SECOND));
    if (!force && seconds === this.lastTimerBroadcastSeconds) {
      return;
    }

    this.lastTimerBroadcastSeconds = seconds;
    eventBus.emit(TIMER_UPDATE_EVENT, { seconds });
  }
}
