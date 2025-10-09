/**
 * @file npc.entity.js
 * @description Generic NPC entity that manages behaviour components.
 */

export class NPC {
  constructor(components = []) {
    this.components = new Map();
    components.forEach((component) => {
      if (!component) {
        return;
      }
      this.add(component);
    });
  }

  add(component) {
    this.components.set(component.constructor.name, component);
  }

  get(ComponentClass) {
    return this.components.get(ComponentClass.name) || null;
  }

  has(ComponentClass) {
    return this.components.has(ComponentClass.name);
  }

  init(context) {
    this.components.forEach((component) => {
      if (typeof component.init === 'function') {
        component.init(this, context);
      }
    });
  }

  update(deltaTime, context) {
    this.components.forEach((component) => {
      if (typeof component.update === 'function') {
        component.update(this, deltaTime, context);
      }
    });
  }

  render(ctx, context) {
    this.components.forEach((component) => {
      if (typeof component.render === 'function') {
        component.render(this, ctx, context);
      }
    });
  }

  destroy(context) {
    this.components.forEach((component) => {
      if (typeof component.destroy === 'function') {
        component.destroy(this, context);
      }
    });
  }
}
