import { Component } from '../../core/component.js';

/**
 * CollectableComponent
 *
 * Declares score and reward payload for transient loot pickups.
 */
export class CollectableComponent extends Component {
  constructor({ score = 0 } = {}) {
    super({ score, collected: false });
  }

  /**
   * Check if the collectable reward has already been granted.
   * @returns {boolean}
   */
  isCollected() {
    return Boolean(this.collected);
  }

  /**
   * Mark the collectable as processed to avoid duplicate rewards.
   */
  markCollected() {
    this.collected = true;
  }
}
