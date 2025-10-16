/**
 * @file state.component.js
 * @description Player state machine and flags
 *
 * Manages player state (idle, digging, falling, moving) and gameplay flags.
 * Extracted from PlayerSystem lines 30-36, 77-99.
 */

import { Component } from '../../core/component.js';

/**
 * Player states
 */
export const PLAYER_STATE = {
  IDLE: 'idle',
  DIGGING: 'digging',
  FALLING: 'falling',
  DIGGING_LATERAL: 'digging_lateral',
  MOVING: 'moving',
};

export class StateComponent extends Component {
  constructor({
    state = PLAYER_STATE.IDLE,
    hasStarted = false,
    dead = false,
    transitioning = false,
  } = {}) {
    super();

    this.state = state;
    this.hasStarted = hasStarted;
    this.dead = dead;
    this.transitioning = transitioning;
  }

  /**
   * Check if player is in a specific state
   * @param {string} stateName - State to check
   * @returns {boolean}
   */
  is(stateName) {
    return this.state === stateName;
  }

  /**
   * Set player state
   * @param {string} stateName - New state
   */
  setState(stateName) {
    this.state = stateName;
  }

  /**
   * Mark player as dead
   */
  die() {
    this.dead = true;
    this.state = PLAYER_STATE.IDLE;
  }

  /**
   * Revive player
   */
  revive() {
    this.dead = false;
    this.hasStarted = false;
  }

  /**
   * Start the game (player pressed down)
   */
  start() {
    this.hasStarted = true;
  }

  /**
   * Begin level transition
   */
  beginTransition() {
    this.transitioning = true;
    this.state = PLAYER_STATE.IDLE;
  }

  /**
   * Complete level transition
   */
  completeTransition() {
    this.transitioning = false;
    this.hasStarted = true;
    this.state = PLAYER_STATE.IDLE;
  }
}
