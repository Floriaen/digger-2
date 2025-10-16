/**
 * @file input.component.js
 * @description Player input handling (arrow keys → direction requests)
 *
 * Manages input event subscriptions and direction change requests.
 * Extracted from PlayerSystem lines 101-159, 373-381.
 */

import { Component } from '../../core/component.js';
import { eventBus } from '../../utils/event-bus.js';

export class InputComponent extends Component {
  constructor() {
    super();

    this.requestedDirection = null; // Pending direction change request
    this.unsubscribers = [];
  }

  /**
   * Initialize input subscriptions
   * @param {Object} entity - Player entity
   * @param {Object} _context - Game context (unused)
   */
  init(entity, _context) {
    // Subscribe to input events
    this.unsubscribers.push(
      eventBus.on('input:move-left', () => this._requestDirection(-1, 0, entity)),
      eventBus.on('input:move-right', () => this._requestDirection(1, 0, entity)),
      eventBus.on('input:move-up', () => this._requestDirection(0, -1, entity)),
      eventBus.on('input:move-down', () => this._handleDownInput(entity)),
      eventBus.on('player:death', () => this._handleDeath(entity)),
      eventBus.on('block:crushed-player', ({ cause }) => {
        this._handleCrushed(entity, cause);
      }),
      eventBus.on('player:restart', ({ preserveTimer = false } = {}) => {
        this._handleRestart(entity, preserveTimer);
      }),
      eventBus.on('block:loot', ({ loot, timerIncrementSeconds } = {}) => {
        this._handleLoot(entity, loot, timerIncrementSeconds);
      }),
      eventBus.on('level:transition:complete', () => {
        this._handleTransitionComplete(entity);
      }),
    );
  }

  /**
   * Destroy input subscriptions
   */
  destroy() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }

  /**
   * Request a direction change
   * @param {number} dx - Delta X (-1 left, 0 none, 1 right)
   * @param {number} dy - Delta Y (-1 up, 0 none, 1 down)
   * @param {Object} entity - Player entity
   * @private
   */
  _requestDirection(dx, dy, entity) {
    const state = this._getState(entity);
    if (!state || !state.hasStarted || state.dead) {
      return;
    }
    this.requestedDirection = { dx, dy };
  }

  /**
   * Handle down arrow input (start game or request down movement)
   * @param {Object} entity - Player entity
   * @private
   */
  _handleDownInput(entity) {
    const state = this._getState(entity);
    if (!state) return;

    if (!state.hasStarted) {
      state.start();
    } else {
      this._requestDirection(0, 1, entity);
    }
  }

  /**
   * Handle player death event
   * @param {Object} entity - Player entity
   * @private
   */
  _handleDeath(entity) {
    const state = this._getState(entity);
    if (state) {
      state.die();
    }

    // Stop any active movement
    const MovementComponent = this._getMovementComponentClass(entity);
    if (MovementComponent) {
      const movement = entity.get(MovementComponent);
      if (movement) {
        movement.stopMovement();
      }
    }
  }

  /**
   * Handle block crushed player event
   * @param {Object} entity - Player entity
   * @param {string} cause - Cause of death
   * @private
   */
  _handleCrushed(entity, cause) {
    const state = this._getState(entity);
    if (state && !state.dead) {
      eventBus.emit('player:death', { cause, shouldRegenerate: false });
    }
  }

  /**
   * Handle player restart event
   * @param {Object} entity - Player entity
   * @param {boolean} preserveTimer - Whether to preserve timer
   * @private
   */
  _handleRestart(entity, preserveTimer) {
    // Delegate to other components to handle restart
    // This is a coordination event
    eventBus.emit('player:restart:internal', { entity, preserveTimer });
  }

  /**
   * Handle block loot event (coin rewards)
   * @param {Object} entity - Player entity
   * @param {Array} loot - Loot items
   * @param {number} timerIncrementSeconds - Timer reward
   * @private
   */
  _handleLoot(entity, loot, timerIncrementSeconds) {
    const state = this._getState(entity);
    if (state && state.dead) {
      return;
    }

    const rewardSeconds = Number(timerIncrementSeconds);
    if (!Number.isFinite(rewardSeconds) || rewardSeconds <= 0) {
      return;
    }

    const hasCoinLoot = Array.isArray(loot) && loot.some((item) => item && item.type === 'coin');
    if (!hasCoinLoot) {
      return;
    }

    const TimerComponent = this._getTimerComponentClass(entity);
    if (TimerComponent) {
      const timer = entity.get(TimerComponent);
      if (timer) {
        timer.addSeconds(rewardSeconds);
      }
    }
  }

  /**
   * Handle level transition complete event
   * @param {Object} entity - Player entity
   * @private
   */
  _handleTransitionComplete(entity) {
    // Delegate to other components to handle transition
    eventBus.emit('player:transition:complete:internal', { entity });
  }

  /**
   * Get StateComponent from entity
   * @param {Object} entity - Player entity
   * @returns {Object|null} StateComponent instance
   * @private
   */
  _getState(entity) {
    if (!entity || !entity.components) return null;
    for (const component of entity.components.values()) {
      if (component.constructor.name === 'StateComponent') {
        return component;
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
  _getMovementComponentClass(entity) {
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
  _getTimerComponentClass(entity) {
    if (!entity || !entity.components) return null;
    for (const component of entity.components.values()) {
      if (component.constructor.name === 'TimerComponent') {
        return component.constructor;
      }
    }
    return null;
  }
}
