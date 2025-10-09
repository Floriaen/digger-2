import { Component } from '../../core/component.js';

/**
 * PhysicsComponent
 *
 * Handles collision detection for blocks.
 * - collidable: Does the block block movement? (true = blocks movement, false = can pass through)
 */
export class PhysicsComponent extends Component {
  constructor({ collidable = true }) {
    super({ collidable });
  }

  /**
   * Check if this block blocks movement (has collision)
   * @returns {boolean}
   */
  isCollidable() {
    return this.collidable;
  }
}
