/**
 * @file npc.system.js
 * @description System that manages and orchestrates all NPC entities.
 */

import { System } from '../core/system.js';
import { TILE_WIDTH, TILE_HEIGHT } from '../utils/config.js';
import { PositionComponent } from '../components/npc/position.component.js';

/**
 * NPCSystem
 * Manages a collection of NPC entities and orchestrates their update/render lifecycle.
 * NPC entities are expected to expose optional `init`, `update`, `render`, `destroy` methods.
 */
export class NPCSystem extends System {
  init() {
    this.npcs = [];
  }

  /**
   * Add an NPC to the list. Calls npc.init if provided.
   * @param {object} npc
   */
  add(npc) {
    if (!npc) return;

    this.npcs.push(npc);

    if (typeof npc.init === 'function') {
      npc.init({ game: this.game, list: this });
    }
  }

  /**
   * Remove an NPC from the list. Calls npc.destroy if provided.
   * @param {object} npc
   */
  remove(npc) {
    const index = this.npcs.indexOf(npc);

    if (index === -1) return;

    const [entity] = this.npcs.splice(index, 1);

    if (entity && typeof entity.destroy === 'function') {
      entity.destroy({ game: this.game, list: this });
    }
  }

  update(deltaTime) {
    const terrain = this._getTerrain();
    const bounds = this._getVisibilityBounds();
    const context = { game: this.game, list: this, terrain };

    for (let i = this.npcs.length - 1; i >= 0; i -= 1) {
      const npc = this.npcs[i];
      if (!npc || typeof npc.update !== 'function') continue;
      if (!this._isVisible(npc, bounds)) continue;
      npc.update(deltaTime, context);
    }
  }

  render(ctx) {
    const bounds = this._getVisibilityBounds();
    const context = { game: this.game, list: this, terrain: this._getTerrain() };

    for (let i = 0; i < this.npcs.length; i += 1) {
      const npc = this.npcs[i];
      if (!npc || typeof npc.render !== 'function') continue;
      if (!this._isVisible(npc, bounds)) continue;
      npc.render(ctx, context);
    }
  }

  destroy() {
    const context = { game: this.game, list: this };

    for (let i = 0; i < this.npcs.length; i += 1) {
      const npc = this.npcs[i];
      if (npc && typeof npc.destroy === 'function') {
        npc.destroy(context);
      }
    }

    this.npcs.length = 0;
  }

  _getVisibilityBounds() {
    const camera = this.game.components.find(
      (component) => component.constructor.name === 'CameraSystem',
    );

    if (!camera) {
      return null;
    }

    const transform = camera.getTransform();
    const { width, height } = this.game.canvas;

    const minX = -transform.x;
    const maxX = -transform.x + width;
    const minY = -transform.y;
    const maxY = -transform.y + height;

    return {
      minX,
      maxX,
      minY,
      maxY,
    };
  }

  _isVisible(npc, bounds) {
    if (!bounds) {
      return true;
    }

    const position = this._getPositionComponent(npc);
    if (!position) {
      return true;
    }

    const padding = TILE_WIDTH * 2;
    const left = position.x;
    const right = left + TILE_WIDTH;
    const top = position.y;
    const bottom = top + TILE_HEIGHT;

    return !(
      right < bounds.minX - padding
      || left > bounds.maxX + padding
      || bottom < bounds.minY - padding
      || top > bounds.maxY + padding
    );
  }

  _getPositionComponent(npc) {
    if (npc && typeof npc.get === 'function') {
      const position = npc.get(PositionComponent);
      if (position) {
        return position;
      }
    }

    return null;
  }

  _getTerrain() {
    if (this.cachedTerrain && this.game.components.includes(this.cachedTerrain)) {
      return this.cachedTerrain;
    }

    this.cachedTerrain = this.game.components.find(
      (component) => component.constructor.name === 'TerrainSystem',
    ) || null;

    return this.cachedTerrain;
  }
}
