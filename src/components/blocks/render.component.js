import { Component } from '../../core/component.js';

/**
 * RenderComponent
 *
 * Defines visual representation of a block.
 * Stores sprite atlas coordinates.
 */
export class RenderComponent extends Component {
  constructor({ spriteX, spriteY }) {
    super({ spriteX, spriteY });
  }
}
