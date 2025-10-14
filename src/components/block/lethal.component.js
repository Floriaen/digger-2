import { Component } from '../../core/component.js';

/**
 * LethalComponent
 *
 * Marks a block as deadly to the player (lava, spikes, poison, etc.).
 * Blocks with this component kill the player on contact.
 *
 * @param {boolean} shouldRegenerate - If true, death triggers terrain regeneration (default: true)
 */
export class LethalComponent extends Component {
  constructor({ shouldRegenerate = true } = {}) {
    super();
    this.shouldRegenerate = shouldRegenerate;
  }
}
