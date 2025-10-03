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
    this.chunkCache = new Map(); // Cache generated chunks
    this.lavaDepth = 200; // Configurable lava start depth
  }

  /**
   * Generate a terrain chunk (with caching)
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @returns {TerrainChunk}
   */
  generateChunk(chunkX, chunkY) {
    const key = `${chunkX},${chunkY}`;

    // Return cached chunk if exists
    if (this.chunkCache.has(key)) {
      return this.chunkCache.get(key);
    }

    const chunk = new TerrainChunk(chunkX, chunkY);

    // Generate terrain based on depth
    for (let y = 0; y < CHUNK_SIZE; y += 1) {
      for (let x = 0; x < CHUNK_SIZE; x += 1) {
        const worldX = chunkX * CHUNK_SIZE + x;
        const worldY = chunkY * CHUNK_SIZE + y;

        let blockType = BLOCK_TYPES.EMPTY;

        // Surface layer: empty above world Y = 4 (where green strip ends)
        if (worldY < 4) {
          blockType = BLOCK_TYPES.EMPTY;
        } else if (this._isLavaZone(worldY)) {
          // Lava termination zone (deep underground)
          blockType = BLOCK_TYPES.LAVA;
        } else {
          // Check for red torus formation
          const torusBlock = this._getTorusBlock(worldX, worldY);
          if (torusBlock !== null) {
            blockType = torusBlock;
          } else if (this._isCavern(worldX, worldY)) {
            // Cavern (procedural holes)
            blockType = BLOCK_TYPES.EMPTY;
          } else if (this._isRock(worldX, worldY)) {
            // Rare falling rock
            blockType = BLOCK_TYPES.ROCK;
          } else {
            // Stratified mud based on depth
            blockType = this._getMudTypeByDepth(worldY);
          }
        }

        chunk.setBlock(x, y, blockType);
      }
    }

    // Apply escape heuristics to prevent player trapping
    this._ensureEscapability(chunk, chunkX, chunkY);

    // Ensure torus rings are surrounded by solid blocks
    this._ensureTorusSurroundings(chunk, chunkX, chunkY);

    // Cache the chunk
    this.chunkCache.set(key, chunk);

    return chunk;
  }

  /**
   * Get mud type based on depth (HP progression)
   * @param {number} worldY - World Y coordinate
   * @returns {number} Block type
   * @private
   */
  _getMudTypeByDepth(worldY) {
    // Progressive HP tiers based on depth
    // 4-50: MUD_LIGHT (HP=1)
    // 50-150: MUD_MEDIUM (HP=2)
    // 150-300: MUD_DARK (HP=3)
    // 300-500: MUD_DENSE (HP=4)
    // 500+: MUD_CORE (HP=5)

    if (worldY < 50) return BLOCK_TYPES.MUD_LIGHT;
    if (worldY < 150) return BLOCK_TYPES.MUD_MEDIUM;
    if (worldY < 300) return BLOCK_TYPES.MUD_DARK;
    if (worldY < 500) return BLOCK_TYPES.MUD_DENSE;
    return BLOCK_TYPES.MUD_CORE;
  }

  /**
   * Check if position is in lava termination zone
   * @param {number} worldY - World Y coordinate
   * @returns {boolean}
   * @private
   */
  _isLavaZone(worldY) {
    return worldY >= this.lavaDepth;
  }

  /**
   * Get red torus block at position (8x6 rings)
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {number|null} RED_FRAME, EMPTY (for inside), or null (for outside)
   * @private
   */
  _getTorusBlock(worldX, worldY) {
    // Red torus formations appear periodically in depth
    // 8 blocks wide, 6 blocks tall, hollow ring with empty inside
    const torusSpacing = 100; // Vertical spacing between torus formations
    const torusStartDepth = 50; // First torus appears at depth 50

    // Check if we're at a torus depth layer
    const depthFromStart = worldY - torusStartDepth;
    if (depthFromStart < 0 || worldY >= this.lavaDepth) return null;

    const torusIndex = Math.floor(depthFromStart / torusSpacing);
    const localY = depthFromStart % torusSpacing;

    // Torus is 6 blocks tall, centered in the spacing
    const torusOffset = Math.floor((torusSpacing - 6) / 2);
    if (localY < torusOffset || localY >= torusOffset + 6) return null;

    const torusY = localY - torusOffset;

    // Torus horizontal positioning (centered, with some variation)
    const torusCenterX = Math.floor(this._random(torusIndex, 0) * 40) - 20; // Random X offset
    const localX = worldX - torusCenterX;

    // 8 blocks wide
    if (localX < 0 || localX >= 8) return null;

    // Hollow ring: outer edges only
    if (torusY === 0 || torusY === 5) {
      // Top and bottom rows: full width
      return BLOCK_TYPES.RED_FRAME;
    }
    if (localX === 0 || localX === 7) {
      // Left and right edges
      return BLOCK_TYPES.RED_FRAME;
    }

    // Inside is empty - force empty (prevents caverns/rocks inside)
    return BLOCK_TYPES.EMPTY;
  }

  /**
   * Check if position is a cavern (procedural hole)
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {boolean}
   * @private
   */
  _isCavern(worldX, worldY) {
    // Use Perlin-like noise for organic caverns
    const scale = 0.1;
    const noise = this._noise(worldX * scale, worldY * scale);

    // Caverns more likely at deeper depths
    const depthFactor = Math.min(worldY / 500, 1.0);
    const threshold = 0.6 - depthFactor * 0.2; // Lower threshold = more caverns at depth

    return noise > threshold;
  }

  /**
   * Check if position should be a rare falling rock
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {boolean}
   * @private
   */
  _isRock(worldX, worldY) {
    // Rare rocks (1-2% chance)
    const rand = this._random(worldX, worldY);
    return rand > 0.98;
  }

  /**
   * Ensure chunk has escape routes (prevent player trapping)
   * @param {TerrainChunk} chunk - Chunk to modify
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @private
   */
  _ensureEscapability(chunk, chunkX, chunkY) {
    // Ensure vertical paths exist
    // For each column, check if there's at least one diggable path downward
    for (let x = 0; x < CHUNK_SIZE; x += 1) {
      let hasPath = false;

      for (let y = 0; y < CHUNK_SIZE; y += 1) {
        const worldY = chunkY * CHUNK_SIZE + y;
        if (worldY >= 4) {
          const blockType = chunk.getBlock(x, y);
          if (blockType === BLOCK_TYPES.EMPTY || blockType !== BLOCK_TYPES.ROCK) {
            hasPath = true;
            break;
          }
        }
      }

      // If column is completely blocked, make at least one block diggable
      if (!hasPath) {
        const midY = Math.floor(CHUNK_SIZE / 2);
        const worldY = chunkY * CHUNK_SIZE + midY;
        const mudType = this._getMudTypeByDepth(worldY);
        chunk.setBlock(x, midY, mudType);
      }
    }
  }

  /**
   * Ensure torus rings are surrounded by solid blocks (not floating in void)
   * @param {TerrainChunk} chunk - Chunk to modify
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @private
   */
  _ensureTorusSurroundings(chunk, chunkX, chunkY) {
    // Check all blocks in chunk for torus blocks
    for (let y = 0; y < CHUNK_SIZE; y += 1) {
      for (let x = 0; x < CHUNK_SIZE; x += 1) {
        const blockType = chunk.getBlock(x, y);
        if (blockType === BLOCK_TYPES.RED_FRAME) {
          // Found torus block - ensure surrounding blocks are solid
          const worldX = chunkX * CHUNK_SIZE + x;
          const worldY = chunkY * CHUNK_SIZE + y;

          // Check 8 neighbors (including diagonals)
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              if (dx === 0 && dy === 0) {
                // Skip center (the torus block itself)
                // eslint-disable-next-line no-continue
                continue;
              }

              const localX = x + dx;
              const localY = y + dy;
              const neighborWorldX = worldX + dx;
              const neighborWorldY = worldY + dy;

              // Skip if out of chunk bounds
              if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) {
                // eslint-disable-next-line no-continue
                continue;
              }

              const neighborBlock = chunk.getBlock(localX, localY);

              // If neighbor is empty and not part of torus interior, fill with mud
              const neighborTorusBlock = this._getTorusBlock(neighborWorldX, neighborWorldY);
              if (neighborBlock === BLOCK_TYPES.EMPTY && neighborTorusBlock !== BLOCK_TYPES.EMPTY) {
                // Fill with appropriate mud based on depth
                const mudType = this._getMudTypeByDepth(neighborWorldY);
                chunk.setBlock(localX, localY, mudType);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Perlin-like noise function
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Noise value 0-1
   * @private
   */
  _noise(x, y) {
    // Simple interpolated noise
    const x0 = Math.floor(x);
    const x1 = x0 + 1;
    const y0 = Math.floor(y);
    const y1 = y0 + 1;

    // Fractional parts
    const sx = x - x0;
    const sy = y - y0;

    // Interpolate between grid points
    const n00 = this._random(x0, y0);
    const n10 = this._random(x1, y0);
    const n01 = this._random(x0, y1);
    const n11 = this._random(x1, y1);

    // Smooth interpolation (cosine)
    const ix0 = this._interpolate(n00, n10, sx);
    const ix1 = this._interpolate(n01, n11, sx);

    return this._interpolate(ix0, ix1, sy);
  }

  /**
   * Smooth interpolation (cosine)
   * @param {number} a - Start value
   * @param {number} b - End value
   * @param {number} t - Interpolation factor (0-1)
   * @returns {number} Interpolated value
   * @private
   */
  _interpolate(a, b, t) {
    const ft = t * Math.PI;
    const f = (1 - Math.cos(ft)) * 0.5;
    return a * (1 - f) + b * f;
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

  /**
   * Clear chunk cache (for memory management)
   */
  clearCache() {
    this.chunkCache.clear();
  }

  /**
   * Get cache size
   * @returns {number}
   */
  getCacheSize() {
    return this.chunkCache.size;
  }
}
