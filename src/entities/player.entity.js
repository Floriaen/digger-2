/**
 * @file player.entity.js
 * @description Player entity that manages player behavior components.
 *
 * The player is defined by its components (position, movement, digging, etc.),
 * following the ECS pattern used for NPCs and blocks.
 */

export class Player {
  constructor(components = []) {
    this.components = new Map();
    components.forEach((component) => {
      if (!component) {
        return;
      }
      this.add(component);
    });
  }

  /**
   * Add a component to the player
   * @param {Component} component - The component instance to add
   */
  add(component) {
    this.components.set(component.constructor.name, component);
    if (typeof component.attachOwner === 'function') {
      component.attachOwner(this);
    }
  }

  /**
   * Get a component instance from the player
   * @param {Function} ComponentClass - The component class to retrieve
   * @returns {Component|null}
   */
  get(ComponentClass) {
    return this.components.get(ComponentClass.name) || null;
  }

  /**
   * Check if player has a specific component type
   * @param {Function} ComponentClass - The component class to check for
   * @returns {boolean}
   */
  has(ComponentClass) {
    return this.components.has(ComponentClass.name);
  }

  /**
   * Remove a component from the player
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

  /**
   * Initialize all components
   * @param {Object} context - Game context
   */
  init(context) {
    this.components.forEach((component) => {
      if (typeof component.init === 'function') {
        component.init(this, context);
      }
    });
  }

  /**
   * Update all components
   * @param {number} deltaTime - Time elapsed since last frame
   * @param {Object} context - Game context
   */
  update(deltaTime, context) {
    this.components.forEach((component) => {
      if (typeof component.update === 'function') {
        component.update(this, deltaTime, context);
      }
    });
  }

  /**
   * Render all components
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} context - Game context
   */
  render(ctx, context) {
    this.components.forEach((component) => {
      if (typeof component.render === 'function') {
        component.render(this, ctx, context);
      }
    });
  }

  /**
   * Destroy all components
   * @param {Object} context - Game context
   */
  destroy(context) {
    this.components.forEach((component) => {
      if (typeof component.destroy === 'function') {
        component.destroy(this, context);
      }
    });
  }
}
