/**
 * @file terrain-generator.js
 * @description Procedural terrain generation with stratified noise and features
 */

import { CHUNK_SIZE } from '../utils/config.js';
import { BlockFactory } from '../factories/block.factory.js';
import { TerrainChunk } from './terrain-chunk.js';
import { PhysicsComponent } from '../components/blocks/physics.component.js';
import { FallableComponent } from '../components/blocks/fallable.component.js';
import { RenderComponent } from '../components/blocks/render.component.js';
import { HealthComponent } from '../components/blocks/health.component.js';

// Helper constants for block type identification
const BLOCK_TYPE = {
  EMPTY: 'empty',
  MUD_LIGHT: 'mud_light',
  MUD_MEDIUM: 'mud_medium',
  MUD_DARK: 'mud_dark',
  MUD_DENSE: 'mud_dense',
  MUD_CORE: 'mud_core',
  ROCK: 'rock',
  RED_FRAME: 'red_frame',
  LAVA: 'lava',
  GRASS: 'grass',
};

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

        let blockType = BLOCK_TYPE.EMPTY;

        // Surface layer handling
        if (worldY < 3) {
          // Empty air above surface (Y = 0, 1, 2)
          blockType = BLOCK_TYPE.EMPTY;
        } else if (worldY === 3) {
          // Surface row: grass blocks (Y = 3)
          blockType = BLOCK_TYPE.GRASS;
        } else if (worldY < 33) {
          // First 30 rows below surface: no caverns/holes, but rocks allowed (Y = 4 to 32)
          if (this._isRock(worldX, worldY)) {
            blockType = BLOCK_TYPE.ROCK;
          } else {
            blockType = this._getMudTypeByDepth(worldY);
          }
        } else if (this._isLavaZone(worldY)) {
          // Lava termination zone (deep underground)
          blockType = BLOCK_TYPE.LAVA;
        } else {
          // Below 30 rows: normal terrain generation with caverns and rocks
          const torusBlock = this._getTorusBlock(worldX, worldY);
          if (torusBlock !== null) {
            blockType = torusBlock;
          } else if (this._isCavern(worldX, worldY)) {
            // Cavern (procedural holes)
            blockType = BLOCK_TYPE.EMPTY;
          } else if (this._isRock(worldX, worldY)) {
            // Rare falling rock
            blockType = BLOCK_TYPE.ROCK;
          } else {
            // Stratified mud based on depth
            blockType = this._getMudTypeByDepth(worldY);
          }
        }

        // Create block entity from type identifier
        const block = this._createBlock(blockType, worldY);
        chunk.setBlock(x, y, block);
      }
    }

    // Apply escape heuristics to prevent player trapping
    this._ensureEscapability(chunk, chunkX, chunkY);

    // Ensure torus rings are surrounded by solid blocks
    this._ensureTorusSurroundings(chunk, chunkX, chunkY);

    // Apply organic HP distribution based on proximity to empty tiles
    this._applyOrganicHP(chunk, chunkX, chunkY);

    // Cache the chunk
    this.chunkCache.set(key, chunk);

    return chunk;
  }

  /**
   * Get mud type based on depth (HP progression)
   * @param {number} worldY - World Y coordinate
   * @returns {string} Block type identifier
   * @private
   */
  _getMudTypeByDepth(worldY) {
    // Progressive HP tiers based on depth
    // 4-50: MUD_LIGHT (HP=1)
    // 50-150: MUD_MEDIUM (HP=2)
    // 150-300: MUD_DARK (HP=3)
    // 300-500: MUD_DENSE (HP=4)
    // 500+: MUD_CORE (HP=5)

    if (worldY < 50) return BLOCK_TYPE.MUD_LIGHT;
    if (worldY < 150) return BLOCK_TYPE.MUD_MEDIUM;
    if (worldY < 300) return BLOCK_TYPE.MUD_DARK;
    if (worldY < 500) return BLOCK_TYPE.MUD_DENSE;
    return BLOCK_TYPE.MUD_CORE;
  }

  /**
   * Create a block entity from type identifier
   * @param {string} blockType - Block type identifier
   * @param {number} worldY - World Y coordinate (for HP calculation)
   * @returns {Block} Block entity
   * @private
   */
  _createBlock(blockType, worldY) {
    switch (blockType) {
      case BLOCK_TYPE.EMPTY:
        return BlockFactory.createEmpty();
      case BLOCK_TYPE.MUD_LIGHT:
        return BlockFactory.createMud(1);
      case BLOCK_TYPE.MUD_MEDIUM:
        return BlockFactory.createMud(2);
      case BLOCK_TYPE.MUD_DARK:
        return BlockFactory.createMud(3);
      case BLOCK_TYPE.MUD_DENSE:
        return BlockFactory.createMud(4);
      case BLOCK_TYPE.MUD_CORE:
        return BlockFactory.createMud(5);
      case BLOCK_TYPE.ROCK:
        return BlockFactory.createRock();
      case BLOCK_TYPE.RED_FRAME:
        return BlockFactory.createRedFrame();
      case BLOCK_TYPE.LAVA:
        return BlockFactory.createLava();
      case BLOCK_TYPE.GRASS:
        return BlockFactory.createGrass();
      default:
        return BlockFactory.createEmpty();
    }
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
   * @returns {string|null} RED_FRAME, EMPTY (for inside), or null (for outside)
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
      return BLOCK_TYPE.RED_FRAME;
    }
    if (localX === 0 || localX === 7) {
      // Left and right edges
      return BLOCK_TYPE.RED_FRAME;
    }

    // Inside is empty - force empty (prevents caverns/rocks inside)
    return BLOCK_TYPE.EMPTY;
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
          const block = chunk.getBlock(x, y);
          const physics = block.get(PhysicsComponent);

          // Check if traversable (empty) or not a falling rock
          if ((physics && physics.traversable) || !block.has(FallableComponent)) {
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
        const mudBlock = this._createBlock(mudType, worldY);
        chunk.setBlock(x, midY, mudBlock);
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
        const block = chunk.getBlock(x, y);
        const render = block.get(RenderComponent);

        // Check if it's a red frame block (spriteX: 32)
        if (render && render.spriteX === 32) {
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
              const neighborPhysics = neighborBlock.get(PhysicsComponent);

              // If neighbor is empty and not part of torus interior, fill with mud
              const neighborTorusBlock = this._getTorusBlock(neighborWorldX, neighborWorldY);
              if (neighborPhysics && neighborPhysics.traversable && neighborTorusBlock !== BLOCK_TYPE.EMPTY) {
                // Fill with appropriate mud based on depth
                const mudType = this._getMudTypeByDepth(neighborWorldY);
                const mudBlock = this._createBlock(mudType, neighborWorldY);
                chunk.setBlock(localX, localY, mudBlock);
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
   * Apply organic HP distribution based on proximity to empty tiles
   * Blocks closer to empty tiles get lower HP
   * @param {TerrainChunk} chunk - Chunk to modify
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @private
   */
  _applyOrganicHP(chunk, chunkX, chunkY) {
    // Skip top chunks (surface and first filled rows stay as-is)
    const worldYStart = chunkY * CHUNK_SIZE;
    if (worldYStart < 6) return;

    // For each block in chunk
    for (let y = 0; y < CHUNK_SIZE; y += 1) {
      for (let x = 0; x < CHUNK_SIZE; x += 1) {
        const block = chunk.getBlock(x, y);
        const worldX = chunkX * CHUNK_SIZE + x;
        const worldY = worldYStart + y;
        const health = block.get(HealthComponent);
        const render = block.get(RenderComponent);

        // Only process mud blocks (sprite X position 16)
        if (!health || !render || render.spriteX !== 16) {
          // eslint-disable-next-line no-continue
          continue;
        }

        // Calculate distance to nearest empty tile
        const distanceToEmpty = this._getDistanceToEmpty(chunk, x, y, chunkX, chunkY);

        // Add noise-based variation to create organic patterns
        const noiseValue = this._noise(worldX * 0.15, worldY * 0.15);
        // Noise adjustment: -1 to +1 HP variation
        const noiseAdjustment = Math.floor((noiseValue - 0.5) * 2);

        // Map distance to HP (1-5) with noise
        let targetHP = Math.min(5, Math.max(1, distanceToEmpty + noiseAdjustment));

        // Apply depth influence (deeper = slightly higher HP)
        const depthBonus = Math.floor(worldY / 150); // +1 HP per 150 depth
        targetHP = Math.min(5, targetHP + depthBonus);

        // Add random variation (20% chance to vary by ±1)
        const randomValue = this._random(worldX, worldY);
        if (randomValue > 0.9) {
          targetHP = Math.min(5, targetHP + 1); // 10% chance to increase
        } else if (randomValue < 0.1) {
          targetHP = Math.max(1, targetHP - 1); // 10% chance to decrease
        }

        // Create new mud block with calculated HP
        const newMudBlock = BlockFactory.createMud(targetHP);
        chunk.setBlock(x, y, newMudBlock);
      }
    }
  }

  /**
   * Get distance to nearest empty tile (flood fill up to 6 blocks)
   * @param {TerrainChunk} chunk - Chunk to check
   * @param {number} x - Local X in chunk
   * @param {number} y - Local Y in chunk
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @returns {number} Distance to nearest empty tile (1-6)
   * @private
   */
  _getDistanceToEmpty(chunk, x, y, chunkX, chunkY) {
    const maxDistance = 6;

    // Check in expanding squares
    for (let dist = 1; dist <= maxDistance; dist += 1) {
      // Check all positions at this distance
      for (let dy = -dist; dy <= dist; dy += 1) {
        for (let dx = -dist; dx <= dist; dx += 1) {
          // Only check perimeter of square (not interior)
          if (Math.abs(dx) !== dist && Math.abs(dy) !== dist) {
            // eslint-disable-next-line no-continue
            continue;
          }

          const checkX = x + dx;
          const checkY = y + dy;

          // Check if within chunk bounds
          if (checkX >= 0 && checkX < CHUNK_SIZE && checkY >= 0 && checkY < CHUNK_SIZE) {
            const block = chunk.getBlock(checkX, checkY);
            const physics = block.get(PhysicsComponent);
            if (physics && physics.traversable) {
              return dist;
            }
          }
        }
      }
    }

    return maxDistance;
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
