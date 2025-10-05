import { Component } from '../../core/component.js';

/**
 * DarknessComponent
 *
 * Applies a darkness overlay to the block rendering.
 * Used by protective blocks to create depth illusion.
 */
export class DarknessComponent extends Component {
  constructor({ alpha }) {
    super({ alpha });
  }
}
