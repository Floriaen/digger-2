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
import { DiggableComponent } from '../components/blocks/diggable.component.js';
import { LootableComponent } from '../components/blocks/lootable.component.js';
import { LethalComponent } from '../components/blocks/lethal.component.js';
import { DarknessComponent } from '../components/blocks/darkness.component.js';
import { generateHalo } from '../systems/halo-generator.js';

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

    // Apply organic visual variant distribution based on proximity to empty tiles
    this._applyOrganicVariant(chunk, chunkX, chunkY);

    // Generate chests with protective halos
    this._generateChests(chunk, chunkX, chunkY);

    // Generate halos around rocks
    this._generateRockHalos(chunk, chunkX, chunkY);

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
   * @param {number} worldY - World Y coordinate (for variant calculation)
   * @returns {Block} Block entity
   * @private
   */
  _createBlock(blockType, worldY) {
    switch (blockType) {
      case BLOCK_TYPE.EMPTY:
        return BlockFactory.createEmpty();
      case BLOCK_TYPE.MUD_LIGHT:
        return BlockFactory.createMud(5, 1); // HP=5, variant=1 (lightest)
      case BLOCK_TYPE.MUD_MEDIUM:
        return BlockFactory.createMud(5, 2); // HP=5, variant=2
      case BLOCK_TYPE.MUD_DARK:
        return BlockFactory.createMud(5, 3); // HP=5, variant=3
      case BLOCK_TYPE.MUD_DENSE:
        return BlockFactory.createMud(5, 4); // HP=5, variant=4
      case BLOCK_TYPE.MUD_CORE:
        return BlockFactory.createMud(5, 5); // HP=5, variant=5 (darkest)
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
          if ((physics && !physics.isCollidable()) || !block.has(FallableComponent)) {
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
   * Apply organic visual variant distribution based on proximity to empty tiles
   * Creates visual variety using distance-to-empty and noise
   * All mud keeps HP=5 (uniform digging time), but variant varies for visual diversity
   * @param {TerrainChunk} chunk - Chunk to modify
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @private
   */
  _applyOrganicVariant(chunk, chunkX, chunkY) {
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
        // Noise adjustment: -1 to +1 variant variation
        const noiseAdjustment = Math.floor((noiseValue - 0.5) * 2);

        // Map distance to variant (1-5) with noise
        let targetVariant = Math.min(5, Math.max(1, distanceToEmpty + noiseAdjustment));

        // Apply depth influence (deeper = slightly higher variant/darker)
        const depthBonus = Math.floor(worldY / 150); // +1 variant per 150 depth
        targetVariant = Math.min(5, targetVariant + depthBonus);

        // Add random variation (20% chance to vary by ±1)
        const randomValue = this._random(worldX, worldY);
        if (randomValue > 0.9) {
          targetVariant = Math.min(5, targetVariant + 1); // 10% chance to increase
        } else if (randomValue < 0.1) {
          targetVariant = Math.max(1, targetVariant - 1); // 10% chance to decrease
        }

        // Create new mud block with HP=5 (uniform digging) but organic variant (visual)
        const newMudBlock = BlockFactory.createMud(5, targetVariant);
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
            if (physics && !physics.isCollidable()) {
              return dist;
            }
          }
        }
      }
    }

    return maxDistance;
  }

  /**
   * Generate chests with protective halos in a chunk
   * Max 2 chests per chunk, high spawn probability for testing
   * @param {TerrainChunk} chunk - Chunk to modify
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @private
   */
  _generateChests(chunk, chunkX, chunkY) {
    const worldYStart = chunkY * CHUNK_SIZE;

    // Don't spawn chests in very top chunks or lava zone
    if (worldYStart < 4 || worldYStart >= this.lavaDepth) return;

    // TESTING: High spawn rate to verify functionality
    const baseProbability = 0.8; // 80% chance for testing

    // Determine number of chests to spawn (0-2)
    const rand1 = this._random(chunkX * 1000, chunkY * 1000);
    const rand2 = this._random(chunkX * 1000 + 1, chunkY * 1000 + 1);

    const chestsToSpawn = [];
    if (rand1 < baseProbability) chestsToSpawn.push(0);
    if (rand2 < baseProbability) chestsToSpawn.push(1);

    // Spawn up to 2 chests
    chestsToSpawn.forEach((chestIndex) => {
      // Find a valid position for the chest
      const position = this._findChestPosition(chunk, chunkX, chunkY, chestIndex);
      if (!position) return;

      const { x, y } = position;
      const worldX = chunkX * CHUNK_SIZE + x;
      const worldY = chunkY * CHUNK_SIZE + y;

      // Place covered chest (50% of the time, otherwise normal chest)
      const useCover = this._random(worldX, worldY) > 0.5;
      const chestBlock = useCover ? BlockFactory.createCoveredChest() : BlockFactory.createChest();
      chunk.setBlock(x, y, chestBlock);

      // Generate protective halo
      const haloRadius = Math.floor(this._random(worldX, worldY) * 2) + 2; // 2-3
      const seed = this._random(worldX + 100, worldY + 100) * 10000;
      const halo = generateHalo(worldX, worldY, 1, haloRadius, seed);

      // Place halo blocks in chunk (if within bounds)
      halo.forEach((haloBlock) => {
        const haloLocalX = haloBlock.x - chunkX * CHUNK_SIZE;
        const haloLocalY = haloBlock.y - chunkY * CHUNK_SIZE;

        // Only place if within chunk bounds
        if (haloLocalX >= 0 && haloLocalX < CHUNK_SIZE && haloLocalY >= 0 && haloLocalY < CHUNK_SIZE) {
          // Don't overwrite the chest itself or special blocks
          const existingBlock = chunk.getBlock(haloLocalX, haloLocalY);

          // Skip if it's a chest, rock, torus, or lava (check components)
          const hasLoot = existingBlock.get(LootableComponent);
          const hasFallable = existingBlock.has(FallableComponent);
          const render = existingBlock.get(RenderComponent);
          const isRedFrame = render && render.spriteX === 32;
          const isLava = existingBlock.has(LethalComponent);

          if (hasLoot || hasFallable || isRedFrame || isLava) {
            return;
          }

          // Place protective block (already an ECS Block with progressive darkness)
          chunk.setBlock(haloLocalX, haloLocalY, haloBlock.blockData);
        }
      });
    });
  }

  /**
   * Find a valid position for a chest in the chunk
   * @param {TerrainChunk} chunk - Chunk to search
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @param {number} chestIndex - Chest index for randomization
   * @returns {Object|null} {x, y} position or null if no valid position
   * @private
   */
  _findChestPosition(chunk, chunkX, chunkY, chestIndex) {
    const maxAttempts = 20;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const x = Math.floor(this._random(chunkX * 100 + chestIndex, chunkY * 100 + attempt) * CHUNK_SIZE);
      const y = Math.floor(this._random(chunkX * 100 + chestIndex + 1, chunkY * 100 + attempt + 1) * CHUNK_SIZE);

      const block = chunk.getBlock(x, y);
      const render = block.get(RenderComponent);
      const diggable = block.has(DiggableComponent);

      // Must be a diggable mud block (spriteX === 16)
      if (!render || !diggable || render.spriteX !== 16) {
        continue; // eslint-disable-line no-continue
      }

      // Check that there's some solid ground around it (not in a large cavern)
      let solidNeighbors = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue; // eslint-disable-line no-continue

          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < CHUNK_SIZE && ny >= 0 && ny < CHUNK_SIZE) {
            const neighborBlock = chunk.getBlock(nx, ny);
            const neighborRender = neighborBlock.get(RenderComponent);
            const neighborDiggable = neighborBlock.has(DiggableComponent);

            if (neighborRender && neighborDiggable && neighborRender.spriteX === 16) {
              solidNeighbors += 1;
            }
          }
        }
      }

      // Need at least 4 solid neighbors to be a good spot
      if (solidNeighbors >= 4) {
        return { x, y };
      }
    }

    return null;
  }

  /**
   * Sample darkness values from neighboring blocks
   * @param {TerrainChunk} chunk - Chunk to check
   * @param {number} localX - Local X in chunk
   * @param {number} localY - Local Y in chunk
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @returns {number} Average darkness of valid neighbors (0-0.4 typically)
   * @private
   */
  _sampleNeighborDarkness(chunk, localX, localY, chunkX, chunkY) {
    const neighbors = [
      { dx: -1, dy: 0 },  // left
      { dx: 1, dy: 0 },   // right
      { dx: 0, dy: -1 },  // up
      { dx: 0, dy: 1 },   // down
      { dx: -1, dy: -1 }, // top-left
      { dx: 1, dy: -1 },  // top-right
      { dx: -1, dy: 1 },  // bottom-left
      { dx: 1, dy: 1 },   // bottom-right
    ];

    let totalDarkness = 0;
    let validSamples = 0;

    neighbors.forEach(({ dx, dy }) => {
      const checkX = localX + dx;
      const checkY = localY + dy;

      // Check if within chunk bounds
      if (checkX >= 0 && checkX < CHUNK_SIZE && checkY >= 0 && checkY < CHUNK_SIZE) {
        const neighborBlock = chunk.getBlock(checkX, checkY);
        const render = neighborBlock.get(RenderComponent);
        const darkness = neighborBlock.get(DarknessComponent);

        // Only sample normal mud blocks (spriteX === 16)
        // Ignore protective blocks (spriteX === 80) and other special blocks
        if (render && render.spriteX === 16) {
          const alpha = darkness ? darkness.alpha : 0;
          totalDarkness += alpha;
          validSamples += 1;
        }
      }
    });

    // Return average, or default to 0.2 if no valid samples
    return validSamples > 0 ? totalDarkness / validSamples : 0.2;
  }

  /**
   * Generate organic halos around rocks in a chunk
   * Uses protective mud blocks with progressive darkness overlay
   * @param {TerrainChunk} chunk - Chunk to modify
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @private
   */
  _generateRockHalos(chunk, chunkX, chunkY) {
    // Find all rocks in chunk
    for (let y = 0; y < CHUNK_SIZE; y += 1) {
      for (let x = 0; x < CHUNK_SIZE; x += 1) {
        const block = chunk.getBlock(x, y);
        const hasFallable = block.has(FallableComponent);
        const render = block.get(RenderComponent);

        // Check if it's a rock (has FallableComponent and spriteX === 48)
        if (hasFallable && render && render.spriteX === 48) {
          const worldX = chunkX * CHUNK_SIZE + x;
          const worldY = chunkY * CHUNK_SIZE + y;

          // Generate halo positions with radius 2-3 blocks
          const haloRadius = Math.floor(this._random(worldX + 500, worldY + 500) * 2) + 2; // 2-3
          const seed = this._random(worldX + 200, worldY + 200) * 10000;
          const haloPositions = generateHalo(worldX, worldY, 1, haloRadius, seed);

          // Place halo blocks in chunk (if within bounds)
          haloPositions.forEach((haloPos) => {
            const haloLocalX = haloPos.x - chunkX * CHUNK_SIZE;
            const haloLocalY = haloPos.y - chunkY * CHUNK_SIZE;

            // Only place if within chunk bounds
            if (haloLocalX >= 0 && haloLocalX < CHUNK_SIZE && haloLocalY >= 0 && haloLocalY < CHUNK_SIZE) {
              // Don't overwrite the rock itself or special blocks
              const existingBlock = chunk.getBlock(haloLocalX, haloLocalY);

              // Skip if it's a chest, rock, torus, or lava (check components)
              const hasLoot = existingBlock.get(LootableComponent);
              const hasFallableExisting = existingBlock.has(FallableComponent);
              const renderExisting = existingBlock.get(RenderComponent);
              const isRedFrame = renderExisting && renderExisting.spriteX === 32;
              const isLava = existingBlock.has(LethalComponent);

              if (hasLoot || hasFallableExisting || isRedFrame || isLava) {
                return;
              }

              // Calculate distance from rock for progressive darkening
              const dx = haloPos.x - worldX;
              const dy = haloPos.y - worldY;
              const distance = Math.sqrt(dx * dx + dy * dy);

              // Sample neighboring blocks to get local terrain brightness
              const neighborDarkness = this._sampleNeighborDarkness(
                chunk,
                haloLocalX,
                haloLocalY,
                chunkX,
                chunkY,
              );

              // Calculate darkness boost based on distance from rock
              // Closer = stronger boost, farther = weaker boost
              const darknessBoost = 0.2 - (distance / haloRadius) * 0.1; // 0.2 -> 0.1

              // Apply darkness as neighbor average + boost
              const darknessAlpha = Math.min(0.8, neighborDarkness + darknessBoost);

              // Create protective mud block with progressive darkness
              const protectiveMud = BlockFactory.createProtectiveMud(darknessAlpha);
              chunk.setBlock(haloLocalX, haloLocalY, protectiveMud);
            }
          });
        }
      }
    }
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
