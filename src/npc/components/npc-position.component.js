/**
 * @file npc-position.component.js
 * @description Tracks NPC world/grid position.
 */

import { Component } from '../../core/component.js';
import { TILE_WIDTH, TILE_HEIGHT } from '../../utils/config.js';

export class NpcPositionComponent extends Component {
  constructor({ gridX, gridY, spawn }) {
    super({
      gridX,
      gridY,
      x: gridX * TILE_WIDTH,
      y: gridY * TILE_HEIGHT,
      spawn,
    });
  }

  syncSpawn() {
    if (!this.spawn) {
      return;
    }
    this.spawn.worldX = this.gridX;
    this.spawn.worldY = this.gridY;
  }

  translate(dxPixels, dyPixels) {
    this.x += dxPixels;
    this.y += dyPixels;
    this.gridX = Math.floor(this.x / TILE_WIDTH);
    this.gridY = Math.floor(this.y / TILE_HEIGHT);
    this.syncSpawn();
  }

  setGrid(gridX, gridY) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.x = gridX * TILE_WIDTH;
    this.y = gridY * TILE_HEIGHT;
    this.syncSpawn();
  }
}
