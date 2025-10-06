import { Component } from '../../core/component.js';

/**
 * RenderComponent
 *
 * Defines visual representation of a block.
 * Can render a single sprite or multiple sprites stacked vertically.
 * - Single sprite: { spriteX, spriteY }
 * - Multiple sprites: { layers: [{ spriteX, spriteY }, ...] }
 */
export class RenderComponent extends Component {
  constructor({ spriteX, spriteY, layers }) {
    // If layers provided, use sprite stack mode
    // Otherwise, use single sprite mode
    if (layers) {
      super({ layers });
    } else {
      super({ spriteX, spriteY });
    }
  }

  /**
   * Check if this is a sprite stack (multiple layers)
   * @returns {boolean}
   */
  isSpriteStack() {
    return Array.isArray(this.layers) && this.layers.length > 1;
  }

  /**
   * Get all sprite layers (bottom to top)
   * For single sprite, returns array with one item
   * @returns {Array<{spriteX: number, spriteY: number}>}
   */
  getLayers() {
    if (this.layers) {
      return this.layers;
    }
    // Single sprite mode - return as single-item array
    return [{ spriteX: this.spriteX, spriteY: this.spriteY }];
  }

  /**
   * Get number of layers
   * @returns {number}
   */
  getLayerCount() {
    return this.getLayers().length;
  }
}
