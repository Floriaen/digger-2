import { Component } from '../../core/component.js';
import { HealthComponent } from './health.component.js';
import { LootableComponent } from './lootable.component.js';
import { eventBus } from '../../utils/event-bus.js';

/**
 * DiggableComponent
 *
 * Handles block digging behavior including HP management, destruction, and loot.
 * Blocks without this component cannot be dug.
 */
export class DiggableComponent extends Component {
  constructor({ canDig = true } = {}) {
    super({ canDig });
  }

  /**
   * Dig this block (reduce HP, handle destruction)
   * @param {Block} block - The block entity being dug
   * @param {number} gridX - Grid X position
   * @param {number} gridY - Grid Y position
   * @param {number} damage - Damage to apply (default 1)
   * @returns {Object} {destroyed: boolean, hp: number, maxHp: number}
   */
  dig(block, gridX, gridY, damage = 1) {
    if (!this.canDig) {
      return { destroyed: false, hp: 1, maxHp: 1 };
    }

    const health = block.get(HealthComponent);

    // Get HP (default to 1 if no health component)
    let hp = health ? health.hp : 1;
    const maxHp = health ? health.maxHp : 1;

    // Apply damage
    hp -= damage;

    // Update health or mark as destroyed
    if (hp <= 0) {
      // Block destroyed - check for loot
      const lootable = block.get(LootableComponent);
      if (lootable && lootable.loot) {
        eventBus.emit('block:loot', { x: gridX, y: gridY, loot: lootable.loot });
      }

      // Emit destruction event
      eventBus.emit('block:destroyed', { x: gridX, y: gridY });

      return { destroyed: true, hp: 0, maxHp };
    }

    // Update HP in health component
    if (health) {
      health.hp = hp;
    }

    return { destroyed: false, hp, maxHp };
  }
}
