import { Component } from '../../core/component.js';

/**
 * LootableComponent
 *
 * Defines what happens when a block is destroyed.
 * Can drop loot items OR spawn a replacement entity.
 * Used by chests, covered blocks, and other special blocks.
 */
export class LootableComponent extends Component {
  constructor({ loot = [], spawnEntity = null }) {
    super({ loot, spawnEntity });
  }

  /**
   * Check if this block spawns an entity when destroyed
   * @returns {boolean}
   */
  hasSpawnEntity() {
    return this.spawnEntity !== null;
  }

  /**
   * Get the entity spawn configuration
   * @returns {Object|null} Spawn config with { type, ...options }
   */
  getSpawnEntity() {
    return this.spawnEntity;
  }

  /**
   * Get loot drops
   * @returns {Array}
   */
  getLoot() {
    return this.loot || [];
  }
}
