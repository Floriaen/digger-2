/**
 * @file player.component.js
 * @description Player component - handles red ball movement, digging, and state machine
 */

import { Component } from '../core/component.base.js';

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
    this.x = 0;
    this.y = 0;
    this.state = PLAYER_STATE.IDLE;
    this.digTimer = 0;
  }

  update(deltaTime) {
    // TODO: Implement in Milestone 0
  }

  render(ctx) {
    // TODO: Implement in Milestone 0
  }

  destroy() {
    // Cleanup if needed
  }
}
