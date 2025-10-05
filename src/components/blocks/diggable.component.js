import { Component } from '../../core/component.js';

/**
 * DiggableComponent
 *
 * Marks a block as diggable by the player.
 * Blocks without this component cannot be dug.
 */
export class DiggableComponent extends Component {
  constructor({ canDig = true } = {}) {
    super({ canDig });
  }
}
