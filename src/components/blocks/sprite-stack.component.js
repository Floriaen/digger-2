import { Component } from '../../core/component.js';

/**
 * SpriteStackComponent
 *
 * Renders multiple sprites stacked on top of each other.
 * Used for visual composition (e.g., showing a chest under a cover block).
 * Each layer is rendered bottom-to-top.
 */
export class SpriteStackComponent extends Component {
  constructor({ layers = [] }) {
    super({ layers });
  }

  /**
   * Get all sprite layers (bottom to top)
   * @returns {Array<{spriteX: number, spriteY: number}>}
   */
  getLayers() {
    return this.layers || [];
  }

  /**
   * Get number of layers
   * @returns {number}
   */
  getLayerCount() {
    return this.layers.length;
  }
}
