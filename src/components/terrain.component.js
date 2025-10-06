/**
 * @file terrain.component.js
 * @description Terrain component - manages chunks, generation, and block data
 */

import { LifecycleComponent } from '../core/lifecycle-component.js';
import {
  CHUNK_SIZE, TILE_WIDTH, TILE_HEIGHT, SPRITE_HEIGHT, TILE_CAP_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT,
} from '../utils/config.js';
import { TerrainGenerator } from '../terrain/terrain-generator.js';
import { ChunkCache } from '../terrain/chunk-cache.js';
import { drawTile, drawTileDarkening } from '../rendering/tile-renderer.js';
import { loadSpriteSheet } from '../rendering/sprite-atlas.js';
import { PhysicsComponent } from './blocks/physics.component.js';
import { RenderComponent } from './blocks/render.component.js';
import { DarknessComponent } from './blocks/darkness.component.js';
import { LethalComponent } from './blocks/lethal.component.js';
import { BlockFactory } from '../factories/block.factory.js';

/**
 * TerrainComponent
 * Manages terrain chunks, procedural generation, and block queries
 */
export class TerrainComponent extends LifecycleComponent {
  async init() {
    this.seed = 12345; // Default seed, controllable via dat.GUI
    this.generator = new TerrainGenerator(this.seed);
    this.cache = new ChunkCache(this.generator);
    this.spriteSheet = null; // Will be loaded

    // Load sprite sheet
    try {
      this.spriteSheet = await loadSpriteSheet();
      console.log('Sprite sheet loaded successfully');
    } catch (error) {
      console.error('Failed to load sprite sheet:', error);
    }
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

    // Render visible chunks (bottom to top for proper overlap)
    for (let cy = endChunkY; cy >= startChunkY; cy -= 1) {
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
    if (!chunk || !this.spriteSheet) return;

    const worldOffsetX = chunkX * CHUNK_SIZE * TILE_WIDTH;
    const worldOffsetY = chunkY * CHUNK_SIZE * TILE_HEIGHT;

    // Get player's current dig target for transparency
    const player = this.game.components.find((c) => c.constructor.name === 'PlayerComponent');
    const digTarget = player ? player.currentDigTarget : null;

    // Render tiles bottom to top for proper overlap
    for (let localY = CHUNK_SIZE - 1; localY >= 0; localY -= 1) {
      for (let localX = 0; localX < CHUNK_SIZE; localX += 1) {
        const block = chunk.getBlock(localX, localY);

        // Skip empty blocks (check PhysicsComponent for traversability)
        const physics = block.get(PhysicsComponent);
        const render = block.get(RenderComponent);

        // Skip if no render component or is empty (not collidable and not lava)
        if (!render) continue;
        const isLava = block.has(LethalComponent);
        if (physics && !physics.isCollidable() && !isLava) continue;

        const screenX = worldOffsetX + localX * TILE_WIDTH + transform.x;
        const screenY = worldOffsetY + localY * TILE_HEIGHT + transform.y;

        // Calculate dig progress darkness
        const worldX = chunkX * CHUNK_SIZE + localX;
        const worldY = chunkY * CHUNK_SIZE + localY;
        let digDarkness = 0; // Default: no dig darkness

        const isDigTarget = digTarget && digTarget.x === worldX && digTarget.y === worldY;

        if (isDigTarget) {
          // This block is being actively dug - increase darkness
          const damagePercent = 1 - (digTarget.hp / digTarget.maxHp);
          digDarkness = damagePercent * 0.5; // Max 50% darkening as block is dug
        }

        // 1. Draw block sprite (always full opacity)
        drawTile(ctx, this.spriteSheet, block, screenX, screenY, 1.0);

        // 2. Draw block type darkening overlay
        drawTileDarkening(ctx, block, screenX, screenY, 1.0);

        // 3. Draw darkness overlay (if block has DarknessComponent)
        const darkness = block.get(DarknessComponent);
        if (darkness) {
          darkness.render(ctx, screenX, screenY);
        }

        // 4. Draw dig progress darkening (on top of everything)
        if (digDarkness > 0) {
          const spriteY = screenY - TILE_CAP_HEIGHT;
          ctx.save();
          ctx.fillStyle = `rgba(0, 0, 0, ${digDarkness})`;
          ctx.fillRect(screenX, spriteY, TILE_WIDTH, SPRITE_HEIGHT);
          ctx.restore();
        }
      }
    }
  }

  /**
   * Get block at world grid coordinates
   * @param {number} gridX - World grid x coordinate
   * @param {number} gridY - World grid y coordinate
   * @returns {Block} Block entity
   */
  getBlock(gridX, gridY) {
    const chunkX = Math.floor(gridX / CHUNK_SIZE);
    const chunkY = Math.floor(gridY / CHUNK_SIZE);
    const localX = ((gridX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((gridY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    const chunk = this.cache.getChunk(chunkX, chunkY);
    return chunk ? chunk.getBlock(localX, localY) : BlockFactory.createEmpty();
  }

  /**
   * Set block at world grid coordinates
   * @param {number} gridX - World grid x coordinate
   * @param {number} gridY - World grid y coordinate
   * @param {Block} block - Block entity
   */
  setBlock(gridX, gridY, block) {
    const chunkX = Math.floor(gridX / CHUNK_SIZE);
    const chunkY = Math.floor(gridY / CHUNK_SIZE);
    const localX = ((gridX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((gridY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    const chunk = this.cache.getChunk(chunkX, chunkY);
    if (chunk) {
      chunk.setBlock(localX, localY, block);
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
