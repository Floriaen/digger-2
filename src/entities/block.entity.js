/**
 * Block Entity
 *
 * Container for block components using the Entity-Component System pattern.
 * A block is defined by the components it has, not by a fixed type.
 */
export class Block {
  constructor(components = []) {
    this.components = new Map();
    components.forEach((comp) => {
      this.components.set(comp.constructor.name, comp);
      if (typeof comp.attachOwner === 'function') {
        comp.attachOwner(this);
      }
    });
  }

  /**
   * Check if block has a specific component type
   * @param {Function} ComponentClass - The component class to check for
   * @returns {boolean}
   */
  has(ComponentClass) {
    return this.components.has(ComponentClass.name);
  }

  /**
   * Get a component instance from the block
   * @param {Function} ComponentClass - The component class to retrieve
   * @returns {Component|undefined}
   */
  get(ComponentClass) {
    return this.components.get(ComponentClass.name);
  }

  /**
   * Add a component to the block
   * @param {Component} component - The component instance to add
   */
  add(component) {
    this.components.set(component.constructor.name, component);
    if (typeof component.attachOwner === 'function') {
      component.attachOwner(this);
    }
  }

  /**
   * Remove a component from the block
   * @param {Function} ComponentClass - The component class to remove
   */
  remove(ComponentClass) {
    this.components.delete(ComponentClass.name);
  }

  /**
   * Get all components as an array
   * @returns {Array<Component>}
   */
  getAllComponents() {
    return Array.from(this.components.values());
  }
}
