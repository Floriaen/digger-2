/**
 * @file terrain-generator.js
 * @description Procedural terrain generation with stratified noise and features
 */

import { CHUNK_SIZE } from '../utils/config.js';
import { BLOCK_TYPES } from './block-registry.js';
import { TerrainChunk } from './terrain-chunk.js';

/**
 * TerrainGenerator
 * Generates chunks with stratified mud, caverns, red torus, and lava
 */
export class TerrainGenerator {
  /**
   * @param {number} seed - Random seed for deterministic generation
   */
  constructor(seed = 12345) {
    this.seed = seed;
  }

  /**
   * Generate a terrain chunk
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @returns {TerrainChunk}
   */
  generateChunk(chunkX, chunkY) {
    const chunk = new TerrainChunk(chunkX, chunkY);

    // TODO: Implement in Milestone 0 (pure mud) and Milestone 2 (full generation)
    // For now, fill with light mud for testing
    for (let y = 0; y < CHUNK_SIZE; y += 1) {
      for (let x = 0; x < CHUNK_SIZE; x += 1) {
        // Calculate world Y coordinate
        const worldY = chunkY * CHUNK_SIZE + y;

        // Surface layer: empty above world Y = 4 (where green strip ends)
        if (worldY < 4) {
          chunk.setBlock(x, y, BLOCK_TYPES.EMPTY);
        } else {
          chunk.setBlock(x, y, BLOCK_TYPES.MUD_LIGHT);
        }
      }
    }

    return chunk;
  }

  /**
   * Seeded random number generator
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Pseudo-random value 0-1
   * @private
   */
  _random(x, y) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + this.seed) * 43758.5453;
    return n - Math.floor(n);
  }
}
