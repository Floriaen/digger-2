import { Component } from '../../core/component.js';

/**
 * LavaComponent
 *
 * Marks a block as lava (deadly to player).
 * Blocks with this component kill the player on contact.
 */
export class LavaComponent extends Component {
  constructor() {
    super();
  }
}
