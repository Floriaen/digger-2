import { Component } from '../../core/component.js';

/**
 * LethalComponent
 *
 * Marks a block as deadly to the player (lava, spikes, poison, etc.).
 * Blocks with this component kill the player on contact.
 */
export class LethalComponent extends Component {
  constructor() {
    super();
  }
}
