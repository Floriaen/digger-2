/**
 * @file position.component.js
 * @description Player position (grid + pixel coordinates)
 *
 * Manages player location in both grid (tile) and pixel (world) coordinates.
 * Extracted from PlayerSystem lines 48-70.
 */

import { Component } from '../../core/component.js';
import { TILE_WIDTH, TILE_HEIGHT } from '../../utils/config.js';

export class PositionComponent extends Component {
  constructor({
    gridX = 0,
    gridY = 0,
    x = null,
    y = null,
  } = {}) {
    super();

    this.gridX = gridX;
    this.gridY = gridY;

    // Calculate pixel position centered on tile
    this.x = x !== null ? x : gridX * TILE_WIDTH + TILE_WIDTH / 2;
    this.y = y !== null ? y : gridY * TILE_HEIGHT + TILE_HEIGHT / 2;
  }

  /**
   * Set grid position and sync pixel position
   * @param {number} gridX - Grid X coordinate
   * @param {number} gridY - Grid Y coordinate
   */
  setGrid(gridX, gridY) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.x = gridX * TILE_WIDTH + TILE_WIDTH / 2;
    this.y = gridY * TILE_HEIGHT + TILE_HEIGHT / 2;
  }

  /**
   * Set pixel position
   * @param {number} x - Pixel X coordinate
   * @param {number} y - Pixel Y coordinate
   */
  setPixel(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * Translate pixel position by delta
   * @param {number} dx - Delta X in pixels
   * @param {number} dy - Delta Y in pixels
   */
  translate(dx, dy) {
    this.x += dx;
    this.y += dy;
  }
}
