/**
 * @file player-manager.system.js
 * @description System that manages the player entity and delegates to its components.
 *
 * This replaces the monolithic PlayerSystem with a clean ECS-based manager that:
 * - Creates and initializes the player entity
 * - Delegates update/render to player components
 * - Provides public API for other systems (ShadowSystem, GravitySystem, CameraSystem)
 */

import { System } from '../core/system.js';
import { Player } from '../entities/player.entity.js';
import { PositionComponent } from '../components/player/position.component.js';
import { SpawnComponent } from '../components/player/spawn.component.js';
import { StateComponent } from '../components/player/state.component.js';
import { TimerComponent } from '../components/player/timer.component.js';
import { InputComponent } from '../components/player/input.component.js';
import { MovementComponent } from '../components/player/movement.component.js';
import { DiggingComponent } from '../components/player/digging.component.js';
import { RenderComponent } from '../components/player/render.component.js';
import { CHUNK_SIZE, WORLD_WIDTH_CHUNKS, RESET_TIMER_ON_LEVEL } from '../utils/config.js';
import { eventBus } from '../utils/event-bus.js';

export class PlayerManagerSystem extends System {
  init() {
    // Get terrain to determine spawn position
    const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainSystem');
    const fallbackWidthTiles = WORLD_WIDTH_CHUNKS * CHUNK_SIZE;
    let worldWidthTiles = terrain?.worldWidthTiles ?? fallbackWidthTiles;
    if (!Number.isFinite(worldWidthTiles) || worldWidthTiles <= 0) {
      worldWidthTiles = fallbackWidthTiles;
    }

    // Calculate spawn position (centered horizontally, gridY = 2)
    const centeredGridX = Math.floor(worldWidthTiles / 2);
    const gridX = Math.max(0, Math.min(worldWidthTiles - 1, centeredGridX));
    const gridY = 2;

    // Create player entity with all components
    this.player = new Player([
      new PositionComponent({ gridX, gridY }),
      new SpawnComponent({
        spawnGridX: gridX,
        spawnGridY: gridY,
        spawnX: gridX * 16 + 8,
        spawnY: gridY * 16 + 8,
      }),
      new StateComponent(),
      new TimerComponent(),
      new InputComponent(),
      new MovementComponent(),
      new DiggingComponent(),
      new RenderComponent(),
    ]);

    // Initialize player entity
    const context = { game: this.game };
    this.player.init(context);

    // Subscribe to internal events (for restart and transition)
    this.unsubscribeRestart = eventBus.on(
      'player:restart:internal',
      ({ entity, preserveTimer }) => {
        if (entity === this.player) {
          this._handleRestart(preserveTimer);
        }
      },
    );

    this.unsubscribeTransition = eventBus.on(
      'player:transition:complete:internal',
      ({ entity }) => {
        if (entity === this.player) {
          this._handleTransitionComplete();
        }
      },
    );
  }

  update(deltaTime) {
    const terrain = this._getTerrain();
    const camera = this._getCamera();
    const context = {
      game: this.game,
      terrain,
      camera,
    };

    // Delegate to player entity components
    this.player.update(deltaTime, context);
  }

  render(ctx) {
    const terrain = this._getTerrain();
    const camera = this._getCamera();
    const context = {
      game: this.game,
      terrain,
      camera,
    };

    // Delegate to player entity components
    this.player.render(ctx, context);
  }

  destroy() {
    if (this.unsubscribeRestart) {
      this.unsubscribeRestart();
      this.unsubscribeRestart = null;
    }
    if (this.unsubscribeTransition) {
      this.unsubscribeTransition();
      this.unsubscribeTransition = null;
    }

    if (this.player) {
      this.player.destroy({ game: this.game });
    }
  }

  /**
   * PUBLIC API for other systems
   */

  /**
   * Backward compatibility: Direct property access for x, y, gridX, gridY
   */
  get x() {
    const position = this.player.get(PositionComponent);
    return position.x;
  }

  set x(value) {
    const position = this.player.get(PositionComponent);
    position.x = value;
  }

  get y() {
    const position = this.player.get(PositionComponent);
    return position.y;
  }

  set y(value) {
    const position = this.player.get(PositionComponent);
    position.y = value;
  }

  get gridX() {
    const position = this.player.get(PositionComponent);
    return position.gridX;
  }

  set gridX(value) {
    const position = this.player.get(PositionComponent);
    position.gridX = value;
  }

  get gridY() {
    const position = this.player.get(PositionComponent);
    return position.gridY;
  }

  set gridY(value) {
    const position = this.player.get(PositionComponent);
    position.gridY = value;
  }

  get state() {
    const state = this.player.get(StateComponent);
    return state.state;
  }

  get dead() {
    const state = this.player.get(StateComponent);
    return state.dead;
  }

  get fallable() {
    const digging = this.player.get(DiggingComponent);
    return digging.fallable;
  }

  get hasStarted() {
    const state = this.player.get(StateComponent);
    return state.hasStarted;
  }

  get currentDigTarget() {
    const digging = this.player.get(DiggingComponent);
    return digging.currentDigTarget;
  }

  get spawnGridX() {
    const spawn = this.player.get(SpawnComponent);
    return spawn.spawnGridX;
  }

  get spawnGridY() {
    const spawn = this.player.get(SpawnComponent);
    return spawn.spawnGridY;
  }

  /**
   * Get player grid position
   * @returns {{ gridX: number, gridY: number }}
   */
  getGridPosition() {
    const position = this.player.get(PositionComponent);
    return { gridX: position.gridX, gridY: position.gridY };
  }

  /**
   * Get player pixel position
   * @returns {{ x: number, y: number }}
   */
  getPixelPosition() {
    const position = this.player.get(PositionComponent);
    return { x: position.x, y: position.y };
  }

  /**
   * Get player state
   * @returns {string} Current player state
   */
  getState() {
    const state = this.player.get(StateComponent);
    return state.state;
  }

  /**
   * Check if player is dead
   * @returns {boolean}
   */
  isDead() {
    const state = this.player.get(StateComponent);
    return state.dead;
  }

  /**
   * Get player fallable component (for GravitySystem)
   * @returns {FallableComponent}
   */
  getFallable() {
    const digging = this.player.get(DiggingComponent);
    return digging.fallable;
  }

  /**
   * Handle landing after falling (called by GravitySystem)
   * @param {Object} blockLandedOn - The block the player landed on
   * @param {number} landX - X position of the block
   * @param {number} landY - Y position of the block
   */
  handleLanding(blockLandedOn, landX, landY) {
    const digging = this.player.get(DiggingComponent);
    const context = { game: this.game, terrain: this._getTerrain() };
    digging.handleLanding(this.player, blockLandedOn, landX, landY, context);
  }

  /**
   * Reset player to spawn point
   * @param {{ preserveTimer: boolean, timerMs: number }} options
   */
  resetToSpawn({ preserveTimer = false, timerMs } = {}) {
    const position = this.player.get(PositionComponent);
    const spawn = this.player.get(SpawnComponent);
    const state = this.player.get(StateComponent);
    const timer = this.player.get(TimerComponent);
    const movement = this.player.get(MovementComponent);
    const digging = this.player.get(DiggingComponent);

    // Reset position to spawn
    position.setGrid(spawn.spawnGridX, spawn.spawnGridY);
    position.setPixel(spawn.spawnX, spawn.spawnY);

    // Reset state
    state.revive();
    state.setState('idle');

    // Reset timer
    if (preserveTimer) {
      if (Number.isFinite(timerMs)) {
        timer.timerMs = Math.max(0, timerMs);
      }
      // eslint-disable-next-line no-underscore-dangle
      timer._broadcastTimerIfNeeded(true);
    } else {
      timer.reset();
    }

    // Reset movement
    movement.stopMovement();
    movement.targetGridX = position.gridX;
    movement.targetGridY = position.gridY;
    movement.startX = position.x;
    movement.startY = position.y;
    movement.targetX = position.x;
    movement.targetY = position.y;

    // Reset digging
    digging.digTimer = 0;
    digging.currentDigTarget = null;
    digging.digDirection = { dx: 0, dy: 1 };
    digging.fallable.reset();
  }

  /**
   * PRIVATE METHODS
   */

  /**
   * Handle restart event
   * @param {boolean} preserveTimer - Whether to preserve timer
   * @private
   */
  _handleRestart(preserveTimer) {
    const timer = this.player.get(TimerComponent);
    const currentTimer = timer.timerMs;
    const shouldPreserve = preserveTimer
      && Number.isFinite(currentTimer)
      && currentTimer > 0;
    this.resetToSpawn({
      preserveTimer: shouldPreserve,
      timerMs: shouldPreserve ? currentTimer : undefined,
    });
  }

  /**
   * Handle level transition complete event
   * @private
   */
  _handleTransitionComplete() {
    const state = this.player.get(StateComponent);
    const timer = this.player.get(TimerComponent);

    const shouldPreserveTimer = !RESET_TIMER_ON_LEVEL
      && Number.isFinite(timer.timerBeforeTransition)
      && timer.timerBeforeTransition > 0;

    this.resetToSpawn({
      preserveTimer: shouldPreserveTimer,
      timerMs: shouldPreserveTimer ? timer.timerBeforeTransition : undefined,
    });

    timer.timerBeforeTransition = null;
    state.hasStarted = true;
    state.setState('idle');
    state.transitioning = false;
  }

  /**
   * Get cached terrain reference
   * @returns {TerrainSystem|null}
   * @private
   */
  _getTerrain() {
    if (this.cachedTerrain && this.game.components.includes(this.cachedTerrain)) {
      return this.cachedTerrain;
    }

    this.cachedTerrain = this.game.components.find(
      (component) => component.constructor.name === 'TerrainSystem',
    ) || null;

    return this.cachedTerrain;
  }

  /**
   * Get cached camera reference
   * @returns {CameraSystem|null}
   * @private
   */
  _getCamera() {
    if (this.cachedCamera && this.game.components.includes(this.cachedCamera)) {
      return this.cachedCamera;
    }

    this.cachedCamera = this.game.components.find(
      (component) => component.constructor.name === 'CameraSystem',
    ) || null;

    return this.cachedCamera;
  }
}
