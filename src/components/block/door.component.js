import { Component } from '../../core/component.js';

/**
 * DoorComponent
 *
 * Marks a block as a level transition door. Carries simple state so gameplay
 * systems can avoid triggering the transition multiple times while a new level
 * is loading.
 */
export class DoorComponent extends Component {
  constructor({ active = true } = {}) {
    super();
    this.active = active;
    this.owner = null;
  }

  attachOwner(owner) {
    this.owner = owner;
  }

  isActive() {
    return Boolean(this.active);
  }

  deactivate() {
    this.active = false;
  }

  activate() {
    this.active = true;
  }
}
