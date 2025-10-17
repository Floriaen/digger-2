/**
 * @file position.component.js
 * @description Shared grid/pixel position component with configurable alignment.
 */

import { Component } from '../../core/component.js';
import { TILE_WIDTH, TILE_HEIGHT } from '../../utils/config.js';

const ALIGNMENT = {
  origin: () => ({ offsetX: 0, offsetY: 0 }),
  center: () => ({ offsetX: TILE_WIDTH / 2, offsetY: TILE_HEIGHT / 2 }),
};

export class PositionComponent extends Component {
  constructor({
    gridX = 0,
    gridY = 0,
    x = null,
    y = null,
    align = 'origin',
    offsetX = null,
    offsetY = null,
    autoUpdateGridOnTranslate = false,
    spawn = null,
  } = {}) {
    super();

    const alignmentFn = ALIGNMENT[align] || ALIGNMENT.origin;
    const { offsetX: defaultOffsetX, offsetY: defaultOffsetY } = alignmentFn();

    this.gridX = gridX;
    this.gridY = gridY;
    this.align = align;
    this.offsetX = offsetX === null ? defaultOffsetX : offsetX;
    this.offsetY = offsetY === null ? defaultOffsetY : offsetY;
    this.autoUpdateGridOnTranslate = autoUpdateGridOnTranslate;
    this.spawn = spawn || null;

    const { x: defaultX, y: defaultY } = this._gridToPixel(gridX, gridY);
    this.x = x !== null ? x : defaultX;
    this.y = y !== null ? y : defaultY;

    this.onPositionChanged();
  }

  setGrid(gridX, gridY) {
    this.gridX = gridX;
    this.gridY = gridY;

    const { x, y } = this._gridToPixel(gridX, gridY);
    this.x = x;
    this.y = y;

    this.onPositionChanged();
  }

  setPixel(x, y) {
    this.x = x;
    this.y = y;

    if (this.autoUpdateGridOnTranslate) {
      this._updateGridFromPixel();
    }

    this.onPositionChanged();
  }

  translate(dx, dy) {
    this.x += dx;
    this.y += dy;

    if (this.autoUpdateGridOnTranslate) {
      this._updateGridFromPixel();
    }

    this.onPositionChanged();
  }

  attachSpawn(spawn) {
    this.spawn = spawn || null;
    this.syncSpawn();
  }

  onPositionChanged() {
    this.syncSpawn();
  }

  syncSpawn() {
    if (!this.spawn) {
      return;
    }

    this.spawn.worldX = this.gridX;
    this.spawn.worldY = this.gridY;
  }

  _gridToPixel(gridX, gridY) {
    return {
      x: gridX * TILE_WIDTH + this.offsetX,
      y: gridY * TILE_HEIGHT + this.offsetY,
    };
  }

  _updateGridFromPixel() {
    this.gridX = Math.floor((this.x - this.offsetX) / TILE_WIDTH);
    this.gridY = Math.floor((this.y - this.offsetY) / TILE_HEIGHT);
  }
}
