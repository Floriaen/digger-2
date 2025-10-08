/**
 * @file terrain-chunk.js
 * @description TerrainChunk data structure - 32x32 block grid with ECS support
 */

import { CHUNK_SIZE } from '../utils/config.js';
import { BlockFactory } from '../factories/block.factory.js';

/**
 * TerrainChunk
 * Represents a 32x32 grid of Block entities
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
   * @returns {Block[][]} 2D array of Block entities
   * @private
   */
  _createEmptyGrid() {
    const grid = [];
    for (let y = 0; y < CHUNK_SIZE; y += 1) {
      grid[y] = [];
      for (let x = 0; x < CHUNK_SIZE; x += 1) {
        grid[y][x] = BlockFactory.createEmpty();
      }
    }
    return grid;
  }

  /**
   * Get block at local chunk coordinates
   * @param {number} localX - Local X (0-31)
   * @param {number} localY - Local Y (0-31)
   * @returns {Block} Block entity
   */
  getBlock(localX, localY) {
    if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) {
      return BlockFactory.createEmpty();
    }
    return this.blocks[localY][localX];
  }

  /**
   * Set block at local chunk coordinates
   * @param {number} localX - Local X (0-31)
   * @param {number} localY - Local Y (0-31)
   * @param {Block} block - Block entity
   */
  setBlock(localX, localY, block) {
    if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) {
      return;
    }
    this.blocks[localY][localX] = block;
  }

  /**
   * Get chunk key for map storage
   * @returns {string} Chunk key "x,y"
   */
  getKey() {
    return `${this.chunkX},${this.chunkY}`;
  }

  /**
   * Serialize chunk for save/load
   * @returns {Object} Serialized chunk data
   */
  serialize() {
    const blockData = [];
    for (let y = 0; y < CHUNK_SIZE; y += 1) {
      blockData[y] = [];
      for (let x = 0; x < CHUNK_SIZE; x += 1) {
        const block = this.blocks[y][x];
        const components = {};
        block.getAllComponents().forEach((comp) => {
          components[comp.constructor.name] = { ...comp };
        });
        blockData[y][x] = components;
      }
    }
    return {
      chunkX: this.chunkX,
      chunkY: this.chunkY,
      blocks: blockData,
      version: 'ecs-v1',
    };
  }

  /**
   * Deserialize chunk from save data
   * @param {Object} data - Serialized chunk data
   * @returns {TerrainChunk} Deserialized chunk
   */
  static deserialize(data) {
    const chunk = new TerrainChunk(data.chunkX, data.chunkY);

    // Handle legacy format (pre-ECS)
    if (!data.version) {
      // Migration from legacy format will be handled in Phase 4
      return chunk;
    }

    // ECS format
    for (let y = 0; y < CHUNK_SIZE; y += 1) {
      for (let x = 0; x < CHUNK_SIZE; x += 1) {
        // Block reconstruction from component data will be implemented in Phase 4
        // For now, just create empty blocks
        chunk.blocks[y][x] = BlockFactory.createEmpty();
      }
    }

    return chunk;
  }
}
