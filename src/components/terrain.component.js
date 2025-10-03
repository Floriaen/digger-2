/**
 * @file terrain.component.js
 * @description Terrain component - manages chunks, generation, and block data
 */

import { Component } from '../core/component.base.js';
import { CHUNK_SIZE, TILE_WIDTH, TILE_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/config.js';
import { TerrainGenerator } from '../terrain/terrain-generator.js';
import { ChunkCache } from '../terrain/chunk-cache.js';
import { drawTile } from '../rendering/tile-renderer.js';
import { BLOCK_TYPES } from '../terrain/block-registry.js';

/**
 * TerrainComponent
 * Manages terrain chunks, procedural generation, and block queries
 */
export class TerrainComponent extends Component {
  init() {
    this.seed = 12345; // Default seed, controllable via dat.GUI
    this.generator = new TerrainGenerator(this.seed);
    this.cache = new ChunkCache(this.generator);
    this.spriteSheet = null; // Will be loaded
  }

  update(deltaTime) {
    // Stream chunks based on camera/player position
    const player = this.game.components.find((c) => c.constructor.name === 'PlayerComponent');
    if (player) {
      this._ensureChunksLoaded(player.gridX, player.gridY);
    }
  }

  render(ctx) {
    const camera = this.game.components.find((c) => c.constructor.name === 'CameraComponent');
    if (!camera) return;

    const transform = camera.getTransform();

    // Calculate visible chunk range
    // World coordinates visible: from -transform to (canvasSize - transform)
    const worldStartX = -transform.x;
    const worldEndX = CANVAS_WIDTH - transform.x;
    const worldStartY = -transform.y;
    const worldEndY = CANVAS_HEIGHT - transform.y;

    const startChunkX = Math.floor(worldStartX / (CHUNK_SIZE * TILE_WIDTH));
    const endChunkX = Math.floor(worldEndX / (CHUNK_SIZE * TILE_WIDTH));
    const startChunkY = Math.floor(worldStartY / (CHUNK_SIZE * TILE_HEIGHT));
    const endChunkY = Math.floor(worldEndY / (CHUNK_SIZE * TILE_HEIGHT));

    // Render visible chunks
    for (let cy = startChunkY; cy <= endChunkY; cy += 1) {
      for (let cx = startChunkX; cx <= endChunkX; cx += 1) {
        this._renderChunk(ctx, cx, cy, transform);
      }
    }
  }

  destroy() {
    this.cache.clear();
  }

  /**
   * Ensure chunks around player position are loaded
   * @param {number} gridX - Player grid X
   * @param {number} gridY - Player grid Y
   * @private
   */
  _ensureChunksLoaded(gridX, gridY) {
    const chunkX = Math.floor(gridX / CHUNK_SIZE);
    const chunkY = Math.floor(gridY / CHUNK_SIZE);

    // Load 3x3 chunk area around player
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        this.cache.getChunk(chunkX + dx, chunkY + dy);
      }
    }
  }

  /**
   * Render a single chunk
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @param {{x: number, y: number}} transform - Camera transform
   * @private
   */
  _renderChunk(ctx, chunkX, chunkY, transform) {
    const chunk = this.cache.getChunk(chunkX, chunkY);
    if (!chunk) return;

    const worldOffsetX = chunkX * CHUNK_SIZE * TILE_WIDTH;
    const worldOffsetY = chunkY * CHUNK_SIZE * TILE_HEIGHT;

    for (let localY = 0; localY < CHUNK_SIZE; localY += 1) {
      for (let localX = 0; localX < CHUNK_SIZE; localX += 1) {
        const blockId = chunk.getBlock(localX, localY);
        if (blockId === BLOCK_TYPES.EMPTY) continue;

        const screenX = worldOffsetX + localX * TILE_WIDTH + transform.x;
        const screenY = worldOffsetY + localY * TILE_HEIGHT + transform.y;

        drawTile(ctx, this.spriteSheet, blockId, screenX, screenY);

        // Draw grass on top of surface blocks (worldY = 4)
        const worldY = chunkY * CHUNK_SIZE + localY;
        if (worldY === 4) {
          this._drawGrass(ctx, screenX, screenY);
        }
      }
    }
  }

  /**
   * Draw grass layer on top of a block
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} screenX - Screen X position
   * @param {number} screenY - Screen Y position
   * @private
   */
  _drawGrass(ctx, screenX, screenY) {
    // Light green top
    ctx.fillStyle = '#7CB342';
    ctx.fillRect(screenX, screenY, TILE_WIDTH, 3);

    // Darker mid
    ctx.fillStyle = '#558B2F';
    ctx.fillRect(screenX, screenY + 3, TILE_WIDTH, 2);

    // Shadow line
    ctx.fillStyle = '#33691E';
    ctx.fillRect(screenX, screenY + 5, TILE_WIDTH, 1);
  }

  /**
   * Get block at world grid coordinates
   * @param {number} gridX - World grid x coordinate
   * @param {number} gridY - World grid y coordinate
   * @returns {number} Block type ID
   */
  getBlock(gridX, gridY) {
    const chunkX = Math.floor(gridX / CHUNK_SIZE);
    const chunkY = Math.floor(gridY / CHUNK_SIZE);
    const localX = ((gridX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((gridY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    const chunk = this.cache.getChunk(chunkX, chunkY);
    return chunk ? chunk.getBlock(localX, localY) : BLOCK_TYPES.EMPTY;
  }

  /**
   * Set block at world grid coordinates
   * @param {number} gridX - World grid x coordinate
   * @param {number} gridY - World grid y coordinate
   * @param {number} blockId - Block type ID
   */
  setBlock(gridX, gridY, blockId) {
    const chunkX = Math.floor(gridX / CHUNK_SIZE);
    const chunkY = Math.floor(gridY / CHUNK_SIZE);
    const localX = ((gridX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((gridY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    const chunk = this.cache.getChunk(chunkX, chunkY);
    if (chunk) {
      chunk.setBlock(localX, localY, blockId);
    }
  }

  /**
   * Update seed and regenerate terrain
   * @param {number} newSeed
   */
  setSeed(newSeed) {
    this.seed = newSeed;
    this.generator = new TerrainGenerator(this.seed);
    this.cache = new ChunkCache(this.generator);
  }
}
