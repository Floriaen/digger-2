/**
 * Base Component Class
 *
 * All block components extend from this base class.
 * Components are pure data containers with no behavior.
 */
export class Component {
  constructor(data = {}) {
    Object.assign(this, data);
  }

  /**
   * Attach owner entity to this component
   * Override in subclasses if needed
   * @param {Object} owner - Owner entity
   */
  attachOwner(owner) {
    this.owner = owner;
  }
}
