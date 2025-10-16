/**
 * @file spawn.component.js
 * @description Player spawn point tracking
 *
 * Stores the spawn location for respawn logic.
 * Extracted from PlayerSystem lines 66-70.
 */

import { Component } from '../../core/component.js';

export class SpawnComponent extends Component {
  constructor({
    spawnGridX = 0,
    spawnGridY = 0,
    spawnX = 0,
    spawnY = 0,
  } = {}) {
    super();

    this.spawnGridX = spawnGridX;
    this.spawnGridY = spawnGridY;
    this.spawnX = spawnX;
    this.spawnY = spawnY;
  }

  /**
   * Set spawn point from current position
   * @param {number} gridX - Current grid X
   * @param {number} gridY - Current grid Y
   * @param {number} x - Current pixel X
   * @param {number} y - Current pixel Y
   */
  setSpawn(gridX, gridY, x, y) {
    this.spawnGridX = gridX;
    this.spawnGridY = gridY;
    this.spawnX = x;
    this.spawnY = y;
  }
}
