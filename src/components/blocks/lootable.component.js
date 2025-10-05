import { Component } from '../../core/component.js';

/**
 * LootableComponent
 *
 * Defines loot that drops when the block is destroyed.
 * Used by chests and other special blocks.
 */
export class LootableComponent extends Component {
  constructor({ loot = [] }) {
    super({ loot });
  }
}
