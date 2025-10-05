import { Component } from '../../core/component.js';

/**
 * PhysicsComponent
 *
 * Defines physical properties of a block.
 * - solid: Does the block have collision?
 * - traversable: Can entities pass through it?
 */
export class PhysicsComponent extends Component {
  constructor({ solid = true, traversable = false }) {
    super({ solid, traversable });
  }
}
