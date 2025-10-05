import { Component } from '../../core/component.js';

/**
 * HealthComponent
 *
 * Defines destructibility and hit points.
 * Blocks with this component take multiple hits to break.
 */
export class HealthComponent extends Component {
  constructor({ hp, maxHp = hp }) {
    super({ hp, maxHp });
  }
}
