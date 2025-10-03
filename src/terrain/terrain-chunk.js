/**
 * @file terrain-chunk.js
 * @description TerrainChunk data structure - 32x32 block grid
 */

import { CHUNK_SIZE } from '../utils/config.js';
import { BLOCK_TYPES } from './block-registry.js';

/**
 * TerrainChunk
 * Represents a 32x32 grid of blocks
 */
export class TerrainChunk {
  /**
   * @param {number} chunkX - Chunk X coordinate (in chunk units)
   * @param {number} chunkY - Chunk Y coordinate (in chunk units)
   */
  constructor(chunkX, chunkY) {
    this.chunkX = chunkX;
    this.chunkY = chunkY;
    this.blocks = this._createEmptyGrid();
  }

  /**
   * Create empty block grid
   * @returns {number[][]} 2D array of block IDs
   * @private
   */
  _createEmptyGrid() {
    const grid = [];
    for (let y = 0; y < CHUNK_SIZE; y += 1) {
      grid[y] = [];
      for (let x = 0; x < CHUNK_SIZE; x += 1) {
        grid[y][x] = BLOCK_TYPES.EMPTY;
      }
    }
    return grid;
  }

  /**
   * Get block at local chunk coordinates
   * @param {number} localX - Local X (0-31)
   * @param {number} localY - Local Y (0-31)
   * @returns {number} Block type ID
   */
  getBlock(localX, localY) {
    if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) {
      return BLOCK_TYPES.EMPTY;
    }
    return this.blocks[localY][localX];
  }

  /**
   * Set block at local chunk coordinates
   * @param {number} localX - Local X (0-31)
   * @param {number} localY - Local Y (0-31)
   * @param {number} blockId - Block type ID
   */
  setBlock(localX, localY, blockId) {
    if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) {
      return;
    }
    this.blocks[localY][localX] = blockId;
  }

  /**
   * Get chunk key for map storage
   * @returns {string} Chunk key "x,y"
   */
  getKey() {
    return `${this.chunkX},${this.chunkY}`;
  }
}
