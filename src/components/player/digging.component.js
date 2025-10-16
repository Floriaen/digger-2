/**
 * @file digging.component.js
 * @description Player digging behavior (direction requests, HP tracking, block destruction)
 *
 * Manages all dig-related logic including direction changes, HP tracking, and block destruction.
 * Extracted from PlayerSystem lines 78-83, 199-261, 373-616.
 */

import { Component } from '../../core/component.js';
import { DIG_INTERVAL_MS } from '../../utils/config.js';
import { eventBus } from '../../utils/event-bus.js';
import { PhysicsComponent } from '../block/physics.component.js';
import { DiggableComponent } from '../block/diggable.component.js';
import { HealthComponent } from '../block/health.component.js';
import { LethalComponent } from '../block/lethal.component.js';
import { LootableComponent } from '../block/lootable.component.js';
import { PauseOnDestroyComponent } from '../block/pause-on-destroy.component.js';
import { DoorComponent } from '../block/door.component.js';
import { FallableComponent } from '../block/fallable.component.js';
import { BlockFactory } from '../../factories/block.factory.js';
import { PLAYER_STATE } from './state.component.js';

const HORIZONTAL_MOVE_DURATION_MS = 120;

export class DiggingComponent extends Component {
  constructor() {
    super();

    this.digTimer = 0;
    this.currentDigTarget = null; // { x, y, hp, maxHp }
    this.digDirection = { dx: 0, dy: 1 }; // Current dig direction (default: down)
    this.fallable = new FallableComponent(); // For gravity integration
  }

  /**
   * Attach owner entity to this component
   * @param {Object} owner - Owner entity
   */
  attachOwner(owner) {
    super.attachOwner(owner);
    if (this.fallable && typeof this.fallable.attachOwner === 'function') {
      this.fallable.attachOwner(owner);
    }
  }

  /**
   * Update digging logic - called each frame
   * @param {Object} entity - Player entity
   * @param {number} deltaTime - Time elapsed since last frame
   * @param {Object} context - Game context with terrain reference
   */
  update(entity, deltaTime, context) {
    // Store context for use in helper methods
    this._context = context;

    const { game, terrain } = context;
    const terrainRef = terrain
      || game?.components?.find((c) => c.constructor.name === 'TerrainSystem');
    if (!terrainRef) return;

    const StateComponent = this._getStateComponent(entity);
    const PositionComponent = this._getPositionComponent(entity);
    const InputComponent = this._getInputComponent(entity);

    if (!StateComponent || !PositionComponent) return;

    const state = entity.get(StateComponent);
    const position = entity.get(PositionComponent);
    const input = InputComponent ? entity.get(InputComponent) : null;

    if (!state || !position) return;

    // Skip if transitioning, dead, not started, or currently moving
    if (state.transitioning || state.dead || !state.hasStarted) {
      return;
    }

    if (state.is(PLAYER_STATE.MOVING)) {
      return;
    }

    // Auto-dig timer
    this.digTimer += deltaTime;

    // Falling is handled by GravitySystem
    if (state.is(PLAYER_STATE.FALLING)) {
      return;
    }

    // Check block at current position (in case we fell into it)
    const blockAtPosition = terrainRef.getBlock(position.gridX, position.gridY);
    if (this.enterDoor(entity, blockAtPosition, position.gridX, position.gridY, 'player:update')) {
      return;
    }

    const physics = blockAtPosition.get(PhysicsComponent);
    const stuckInBlock = physics
      && physics.isCollidable()
      && blockAtPosition.has(DiggableComponent);

    if (stuckInBlock) {
      // We're inside a block, dig it while also allowing movement
      this.digInDirection(entity, terrainRef, 0, 0);
      // Don't return - allow player to still process input and movement
    }

    // Handle direction change requests (unless stuck and digging in place)
    if (input && input.requestedDirection && !stuckInBlock) {
      const { dx: rdx, dy: rdy } = input.requestedDirection;
      let canChange = false;

      // While actively digging, only allow changing direction if the requested target is diggable
      if (state.is(PLAYER_STATE.DIGGING) || state.is(PLAYER_STATE.DIGGING_LATERAL)) {
        canChange = this.canDigDirection(entity, terrainRef, rdx, rdy);
      } else {
        // Otherwise, use broader rule (diggable, door, or traversable) to allow aiming
        canChange = this.tryChangeDirection(entity, terrainRef, rdx, rdy);
      }

      if (canChange) {
        this.digDirection = input.requestedDirection;
        // Normalize state for new dig axis (skip MOVING/FALLING which are handled elsewhere)
        if (!state.is(PLAYER_STATE.MOVING) && !state.is(PLAYER_STATE.FALLING)) {
          state.setState(rdy === 0 ? PLAYER_STATE.DIGGING_LATERAL : PLAYER_STATE.DIGGING);
        }
      }
      input.requestedDirection = null; // Clear request after attempting
    }

    // Unified directional digging (unless stuck and digging in place)
    if (!stuckInBlock) {
      // Directional hook: keep eating in current digDirection while next tile is diggable (keyless)
      const dir = this.digDirection || { dx: 0, dy: 1 };
      const canHook = this.canDigDirection(entity, terrainRef, dir.dx, dir.dy);

      if (canHook) {
        this.updateDirectionalDig(entity, terrainRef);
        return;
      }

      if (!this.beginFallIfUnsupported(entity, terrainRef)) {
        this.updateDirectionalDig(entity, terrainRef);
      }
    }
  }

  /**
   * Try to change direction - succeeds if target block is diggable, door, or traversable
   * @param {Object} entity - Player entity
   * @param {Object} terrain - Terrain system
   * @param {number} dx - Delta X
   * @param {number} dy - Delta Y
   * @returns {boolean} True if direction change allowed
   */
  tryChangeDirection(entity, terrain, dx, dy) {
    const PositionComponent = this._getPositionComponent(entity);
    const position = entity.get(PositionComponent);
    if (!position) return false;

    const targetX = position.gridX + dx;
    const targetY = position.gridY + dy;
    const targetBlock = terrain.getBlock(targetX, targetY);

    // Check if target block should pause game on contact
    if (targetBlock.has(PauseOnDestroyComponent)) {
      console.log('[DiggingComponent.tryChangeDirection] Pause crystal detected!');
      console.log('[DiggingComponent.tryChangeDirection] Triggering pause...');

      // Reset player state to prevent re-triggering after unpause
      const StateComponent = this._getStateComponent(entity);
      const state = entity.get(StateComponent);
      if (state) {
        state.setState(PLAYER_STATE.IDLE);
      }
      this.digDirection = { dx: 0, dy: 1 }; // Reset to default down
      this.currentDigTarget = null;
      this.digTimer = 0;

      // Clear pending input direction
      const InputComponent = this._getInputComponent(entity);
      const input = entity.get(InputComponent);
      if (input) {
        input.requestedDirection = null;
      }

      const context = this._getGameContext(entity);
      if (context?.game) {
        console.log('[DiggingComponent.tryChangeDirection] Calling game.pause()');
        context.game.pause();
      } else {
        console.warn('[DiggingComponent.tryChangeDirection] No game context available!');
      }
      return false; // Don't allow direction change, just pause
    }

    // Can change direction if target is diggable, a door, or traversable (empty/falling)
    const targetPhysics = targetBlock.get(PhysicsComponent);
    const isTraversable = targetPhysics && !targetPhysics.isCollidable();
    const canChange = targetBlock.has(DiggableComponent)
      || targetBlock.has(DoorComponent)
      || isTraversable;
    return canChange;
  }

  /**
   * Check if can dig in a direction
   * @param {Object} entity - Player entity
   * @param {Object} terrain - Terrain system
   * @param {number} dx - Delta X
   * @param {number} dy - Delta Y
   * @returns {boolean} True if can dig
   */
  canDigDirection(entity, terrain, dx, dy) {
    const PositionComponent = this._getPositionComponent(entity);
    const position = entity.get(PositionComponent);
    if (!position) return false;

    const tx = position.gridX + dx;
    const ty = position.gridY + dy;
    const block = terrain.getBlock(tx, ty);

    // Check if block should pause game on contact (before allowing dig)
    if (block?.has?.(PauseOnDestroyComponent)) {
      console.log('[DiggingComponent.canDigDirection] Pause crystal detected!');
      console.log('[DiggingComponent.canDigDirection] Triggering pause...');

      // Reset player state to prevent re-triggering after unpause
      const StateComponent = this._getStateComponent(entity);
      const state = entity.get(StateComponent);
      if (state) {
        state.setState(PLAYER_STATE.IDLE);
      }
      this.digDirection = { dx: 0, dy: 1 }; // Reset to default down
      this.currentDigTarget = null;
      this.digTimer = 0;

      // Clear pending input direction
      const InputComponent = this._getInputComponent(entity);
      const input = entity.get(InputComponent);
      if (input) {
        input.requestedDirection = null;
      }

      const context = this._getGameContext(entity);
      if (context?.game) {
        console.log('[DiggingComponent.canDigDirection] Calling game.pause()');
        context.game.pause();
      } else {
        console.warn('[DiggingComponent.canDigDirection] No game context available!');
      }
      return false; // Don't allow digging, just pause
    }

    return !!block?.has?.(DiggableComponent);
  }

  /**
   * Update directional digging (unified for all directions)
   * @param {Object} entity - Player entity
   * @param {Object} terrain - Terrain system
   */
  updateDirectionalDig(entity, terrain) {
    const PositionComponent = this._getPositionComponent(entity);
    const StateComponent = this._getStateComponent(entity);
    const position = entity.get(PositionComponent);
    const state = entity.get(StateComponent);

    if (!position || !state) return;

    const { dx, dy } = this.digDirection;
    const targetX = position.gridX + dx;
    const targetY = position.gridY + dy;
    const targetBlock = terrain.getBlock(targetX, targetY);

    // Check if target is lava (death)
    if (targetBlock.has(LethalComponent)) {
      const lethal = targetBlock.get(LethalComponent);
      eventBus.emit('player:death', {
        cause: 'lava',
        shouldRegenerate: lethal.shouldRegenerate,
      });
      state.setState(PLAYER_STATE.IDLE);
      return;
    }

    // Check if target is a door (level transition)
    if (targetBlock.has(DoorComponent)) {
      this.enterDoor(entity, targetBlock, targetX, targetY, 'player:movement');
      return;
    }

    // Check if target is traversable (empty/falling)
    const targetPhysics = targetBlock.get(PhysicsComponent);
    if (targetPhysics && !targetPhysics.isCollidable()) {
      if (dy > 0) {
        // Move into the empty space first
        if (position.gridY !== targetY) {
          position.setGrid(targetX, targetY);
        }

        // Transition to falling state immediately
        state.setState(PLAYER_STATE.FALLING);
        this.fallable.reset(); // Reset fallable component for new fall
        this.currentDigTarget = null;
      } else if (dy < 0) {
        // Upward: do not auto-climb pre-existing empty. Let gravity/input decide.
        state.setState(PLAYER_STATE.IDLE);
        this.currentDigTarget = null;
        this.digDirection = { dx: 0, dy: 1 }; // Reset to down
        this.beginFallIfUnsupported(entity, terrain);
      } else {
        // Lateral: Stop at empty space
        state.setState(PLAYER_STATE.IDLE);
        this.currentDigTarget = null;
        this.digDirection = { dx: 0, dy: 1 }; // Reset to down
      }
      return;
    }

    // Check if target is diggable
    if (!targetBlock.has(DiggableComponent)) {
      // Hit rock or boundary - stop and reset to down
      state.setState(PLAYER_STATE.IDLE);
      this.fallable.reset();
      this.currentDigTarget = null;
      this.digDirection = { dx: 0, dy: 1 }; // Reset to down
      return;
    }

    // Target is diggable - dig it
    state.setState(dy === 0 ? PLAYER_STATE.DIGGING_LATERAL : PLAYER_STATE.DIGGING);
    this.fallable.reset();
    this.digInDirection(entity, terrain, dx, dy);
  }

  /**
   * Dig block in direction (respects HP, moves player on completion)
   * @param {Object} entity - Player entity
   * @param {Object} terrain - Terrain system
   * @param {number} dx - Delta X
   * @param {number} dy - Delta Y
   */
  digInDirection(entity, terrain, dx, dy) {
    const PositionComponent = this._getPositionComponent(entity);
    const StateComponent = this._getStateComponent(entity);
    const MovementComponent = this._getMovementComponent(entity);

    const position = entity.get(PositionComponent);
    const state = entity.get(StateComponent);
    const movement = MovementComponent ? entity.get(MovementComponent) : null;

    if (!position || !state) return;

    const targetX = position.gridX + dx;
    const targetY = position.gridY + dy;

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

      // Check if block should pause on contact (before digging starts)
      if (block.has(PauseOnDestroyComponent)) {
        console.log('[DiggingComponent] Pause crystal detected! Triggering pause...');

        // Reset player state to prevent re-triggering after unpause
        if (state) {
          state.setState(PLAYER_STATE.IDLE);
        }
        this.digDirection = { dx: 0, dy: 1 }; // Reset to default down
        this.currentDigTarget = null;
        this.digTimer = 0;

        // Clear pending input direction
        const InputComponent = this._getInputComponent(entity);
        const input = entity.get(InputComponent);
        if (input) {
          input.requestedDirection = null;
        }

        const context = this._getGameContext(entity);
        console.log('[DiggingComponent] Context:', context);
        if (context?.game) {
          console.log('[DiggingComponent] Calling game.pause()');
          context.game.pause();
        } else {
          console.warn('[DiggingComponent] No game context available!');
        }
        return; // Don't start digging, just pause
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
        const context = this._getGameContext(entity);
        if (block.has(PauseOnDestroyComponent) && context?.game) {
          context.game.pause();
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
            state.setState(PLAYER_STATE.FALLING);
            this.fallable.reset(); // Reset for new fall
          } else if (replacementBlock?.has(DiggableComponent)) {
            state.setState(PLAYER_STATE.DIGGING);
            this.digDirection = { dx, dy };
            this.currentDigTarget = null;
            this.digInDirection(entity, terrain, dx, dy);
          } else {
            state.setState(PLAYER_STATE.IDLE);
            this.digDirection = { dx: 0, dy: 1 };
            this.beginFallIfUnsupported(entity, terrain);
          }
        } else if (dx !== 0) {
          // Lateral digging - move horizontally only
          if (canEnterReplacement && movement) {
            movement.beginMovement(entity, targetX, targetY, HORIZONTAL_MOVE_DURATION_MS);
          } else if (replacementBlock?.has(DiggableComponent)) {
            state.setState(PLAYER_STATE.DIGGING_LATERAL);
            this.digDirection = { dx, dy };
            this.currentDigTarget = null;
            this.digInDirection(entity, terrain, dx, dy);
          } else {
            state.setState(PLAYER_STATE.IDLE);
            this.digDirection = { dx: 0, dy: 1 }; // Reset to down
            this.beginFallIfUnsupported(entity, terrain);
          }
        } else if (dy < 0) {
          // Digging upward - move vertically only
          if (canEnterReplacement && movement) {
            // Move up into empty space regardless of key hold; next action depends on input
            movement.beginMovement(entity, targetX, targetY, HORIZONTAL_MOVE_DURATION_MS);
          } else if (replacementBlock?.has(DiggableComponent)) {
            // Continue upward regardless of key hold while the next tile is diggable
            state.setState(PLAYER_STATE.DIGGING);
            this.digDirection = { dx, dy };
            this.currentDigTarget = null;
            this.digInDirection(entity, terrain, dx, dy);
          } else {
            state.setState(PLAYER_STATE.IDLE);
            this.digDirection = { dx: 0, dy: 1 }; // Reset to down
            this.beginFallIfUnsupported(entity, terrain);
          }
        } else if (dx === 0 && dy === 0) {
          // Dug block at our position - just go idle, gravity will take over
          state.setState(PLAYER_STATE.IDLE);
          this.digDirection = { dx: 0, dy: 1 }; // Reset to down
          this.beginFallIfUnsupported(entity, terrain);
        }
      }
    }
  }

  /**
   * Handle landing after falling - called by GravitySystem
   * @param {Object} entity - Player entity
   * @param {Object} blockLandedOn - The block the player landed on
   * @param {number} landX - X position of the block
   * @param {number} landY - Y position of the block
   * @param {Object} context - Game context
   */
  handleLanding(entity, blockLandedOn, _landX, _landY, context) {
    const { terrain, game } = context;
    const terrainRef = terrain
      || game?.components?.find((c) => c.constructor.name === 'TerrainSystem');
    if (!terrainRef) return;

    const StateComponent = this._getStateComponent(entity);
    const state = entity.get(StateComponent);
    if (!state) return;

    if (blockLandedOn.has(DiggableComponent)) {
      // Start digging the block below us
      state.setState(PLAYER_STATE.DIGGING);
      this.digDirection = { dx: 0, dy: 1 };
      this.digInDirection(entity, terrainRef, 0, 1); // Dig block below (dy = 1)
    } else {
      // Hit undiggable block (rock) - stop
      state.setState(PLAYER_STATE.IDLE);
      this.digDirection = { dx: 0, dy: 1 };
    }
  }

  /**
   * Force the player into falling state if there is no support below
   * @param {Object} entity - Player entity
   * @param {Object} terrain - Terrain system
   * @returns {boolean} True if falling was triggered
   */
  beginFallIfUnsupported(entity, terrain) {
    const StateComponent = this._getStateComponent(entity);
    const PositionComponent = this._getPositionComponent(entity);

    const state = entity.get(StateComponent);
    const position = entity.get(PositionComponent);

    if (!state || !position) return false;

    if (state.is(PLAYER_STATE.FALLING)) {
      return true;
    }

    const belowBlock = terrain.getBlock(position.gridX, position.gridY + 1);
    const belowPhysics = belowBlock.get(PhysicsComponent);
    const hasSupport = belowPhysics && belowPhysics.isCollidable();

    if (hasSupport) {
      return false;
    }

    state.setState(PLAYER_STATE.FALLING);
    this.fallable.reset();
    this.currentDigTarget = null;
    this.digTimer = 0;
    state.hasStarted = true;
    return true;
  }

  /**
   * Enter door (level transition)
   * @param {Object} entity - Player entity
   * @param {Object} block - Door block
   * @param {number} gridX - Grid X position
   * @param {number} gridY - Grid Y position
   * @param {string} source - Source of door entry
   * @returns {boolean} True if entered door
   */
  enterDoor(entity, block, gridX, gridY, source = 'player') {
    const StateComponent = this._getStateComponent(entity);
    const state = entity.get(StateComponent);

    if (!block || !state || state.transitioning) {
      return false;
    }

    if (!block.has(DoorComponent)) {
      return false;
    }

    const door = block.get(DoorComponent);
    if (door && typeof door.isActive === 'function' && !door.isActive()) {
      return false;
    }

    const started = this.beginLevelTransition(entity);
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

  /**
   * Begin level transition
   * @param {Object} entity - Player entity
   * @returns {boolean} True if transition started
   */
  beginLevelTransition(entity) {
    const StateComponent = this._getStateComponent(entity);
    const TimerComponent = this._getTimerComponent(entity);
    const MovementComponent = this._getMovementComponent(entity);

    const state = entity.get(StateComponent);
    const timer = TimerComponent ? entity.get(TimerComponent) : null;
    const movement = MovementComponent ? entity.get(MovementComponent) : null;

    if (!state || state.transitioning) {
      return false;
    }

    state.beginTransition();
    if (timer) {
      timer.storeBeforeTransition();
    }
    this.currentDigTarget = null;
    this.digTimer = 0;
    this.digDirection = { dx: 0, dy: 1 };

    if (movement) {
      movement.stopMovement();
    }

    if (this.fallable) {
      if (typeof this.fallable.land === 'function') {
        this.fallable.land();
      }
      this.fallable.reset();
    }

    return true;
  }

  /**
   * Get game context from entity
   * @param {Object} _entity - Player entity
   * @returns {Object|null} Game context
   * @private
   */
  _getGameContext(_entity) {
    // Return the context stored during update()
    return this._context || null;
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

  /**
   * Get MovementComponent class
   * @param {Object} entity - Player entity
   * @returns {Function|null} MovementComponent class
   * @private
   */
  _getMovementComponent(entity) {
    if (!entity || !entity.components) return null;
    for (const component of entity.components.values()) {
      if (component.constructor.name === 'MovementComponent') {
        return component.constructor;
      }
    }
    return null;
  }

  /**
   * Get TimerComponent class
   * @param {Object} entity - Player entity
   * @returns {Function|null} TimerComponent class
   * @private
   */
  _getTimerComponent(entity) {
    if (!entity || !entity.components) return null;
    for (const component of entity.components.values()) {
      if (component.constructor.name === 'TimerComponent') {
        return component.constructor;
      }
    }
    return null;
  }
}
