/**
 * @file terrain.component.js
 * @description Terrain component - manages chunks, generation, and block data
 */

import { System } from '../core/system.js';
import {
  CHUNK_SIZE,
  TILE_WIDTH,
  TILE_HEIGHT,
  SPRITE_HEIGHT,
  TILE_CAP_HEIGHT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  TERRAIN_MAX_WIDTH,
} from '../utils/config.js';
import { TerrainGenerator } from '../terrain/terrain-generator.js';
import { ChunkCache } from '../terrain/chunk-cache.js';
import { loadSpriteSheet } from '../rendering/sprite-atlas.js';
import { PhysicsComponent } from '../components/block/physics.component.js';
import { RenderComponent } from '../components/block/render.component.js';
import { DarknessComponent } from '../components/block/darkness.component.js';
import { LethalComponent } from '../components/block/lethal.component.js';
import { BlockFactory } from '../factories/block.factory.js';
import { RenderLayer } from '../rendering/render-layer.js';
import { createMaggot } from '../npc/maggot.js';

const BASE_DARKEN_EPSILON = 0.0001;
const DARKNESS_EPSILON = 0.0002;
const DIG_EPSILON = 0.0003;
const OVERLAY_DEPTH_STEP = 0.001;

const STATIC_DARKEN_FACTORS = {
  32: 0.4, // RED_FRAME (torus): 40% dark
};

/**
 * TerrainSystem
 * Manages terrain chunks, procedural generation, and block queries
 */
export class TerrainSystem extends System {
  async init() {
    this.seed = 12345; // Default seed, controllable via dat.GUI
    this.generator = new TerrainGenerator(this.seed);
    this.cache = new ChunkCache(this.generator);
    this.spriteSheet = null; // Will be loaded
    this.npcList = null;
    this.maxWidth = TERRAIN_MAX_WIDTH;

    // Calculate terrain bounds INDEPENDENTLY (not based on player position)
    this._initializeTerrainBounds();

    // Load sprite sheet
    try {
      this.spriteSheet = await loadSpriteSheet();
      console.log('Sprite sheet loaded successfully');
      this.game.renderQueue.setSpriteSheet(this.spriteSheet);
    } catch (error) {
      console.error('Failed to load sprite sheet:', error);
    }
  }

  update(_deltaTime) {
    // Stream chunks based on camera/player position
    const player = this.game.components.find((c) => c.constructor.name === 'PlayerSystem');
    if (player) {
      this._ensureChunksLoaded(player.gridX, player.gridY);
    }
  }

  render(ctx) {
    const camera = this.game.components.find((c) => c.constructor.name === 'CameraSystem');
    if (!camera) return;

    const transform = camera.getTransform();
    const { renderQueue } = this.game;

    if (!renderQueue || !this.spriteSheet) {
      return;
    }

    const player = this.game.components.find((c) => c.constructor.name === 'PlayerSystem');
    const digTarget = player ? player.currentDigTarget : null;

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

    // Queue visible chunks (bottom to top for proper overlap)
    for (let cy = endChunkY; cy >= startChunkY; cy -= 1) {
      for (let cx = startChunkX; cx <= endChunkX; cx += 1) {
        if (!this._isChunkWithinHorizontalBounds(cx)) {
          continue;
        }
        this._renderChunk(renderQueue, cx, cy, transform, digTarget);
      }
    }

    renderQueue.flush(ctx);
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
        const targetChunkX = chunkX + dx;
        if (!this._isChunkWithinHorizontalBounds(targetChunkX)) {
          continue;
        }
        const chunk = this._getChunk(targetChunkX, chunkY + dy);
        if (chunk) {
          this._spawnMaggotsForChunk(chunk);
        }
      }
    }
  }

  _spawnMaggotsForChunk(chunk) {
    if (!chunk || !Array.isArray(chunk.maggotSpawns) || chunk.maggotSpawns.length === 0) {
      return;
    }

    const npcList = this._getNPCList();
    if (!npcList) {
      return;
    }

    chunk.maggotSpawns.forEach((spawn) => {
      if (!spawn || spawn.active) {
        return;
      }

      const npc = createMaggot(spawn);
      npcList.add(npc);
    });
  }

  _getNPCList() {
    if (this.npcList && this.game.components.includes(this.npcList)) {
      return this.npcList;
    }

    this.npcList = this.game.components.find(
      (component) => component.constructor.name === 'NPCSystem',
    ) || null;

    return this.npcList;
  }

  /**
   * Initialize terrain bounds independently of player position
   * Terrain is centered at world origin (gridX = 0)
   * @private
   */
  _initializeTerrainBounds() {
    if (!this._hasWidthLimit()) {
      this.horizontalBounds = null;
      this.horizontalMaskVersion = 0;
      return;
    }

    const width = Math.max(1, Math.floor(this.maxWidth));
    const center = 0; // Terrain centered at world origin
    const leftOffset = Math.floor((width - 1) / 2);
    const rightOffset = width - 1 - leftOffset;

    this.horizontalBounds = {
      center,
      minGridX: center - leftOffset,
      maxGridX: center + rightOffset,
    };
    this.horizontalMaskVersion = 1;
  }

  /**
   * Get terrain center position for player spawn calculation
   * @returns {{gridX: number, gridY: number}}
   */
  getTerrainCenter() {
    if (!this.horizontalBounds) {
      return { gridX: 0, gridY: 2 };
    }

    return {
      gridX: this.horizontalBounds.center,
      gridY: 2, // Grass layer
    };
  }

  _hasWidthLimit() {
    return typeof this.maxWidth === 'number' && Number.isFinite(this.maxWidth) && this.maxWidth > 0;
  }

  isWithinHorizontalBounds(gridX) {
    if (!this.horizontalBounds) {
      return true;
    }
    const { minGridX, maxGridX } = this.horizontalBounds;
    return gridX >= minGridX && gridX <= maxGridX;
  }

  _isChunkWithinHorizontalBounds(chunkX) {
    if (!this.horizontalBounds) {
      return true;
    }

    const chunkStart = chunkX * CHUNK_SIZE;
    const chunkEnd = chunkStart + CHUNK_SIZE - 1;
    const { minGridX, maxGridX } = this.horizontalBounds;

    return chunkEnd >= minGridX && chunkStart <= maxGridX;
  }

  _applyHorizontalMask(chunk) {
    if (!this.horizontalBounds) {
      return;
    }

    if (chunk.horizontalMaskVersion === this.horizontalMaskVersion) {
      return;
    }

    const { minGridX, maxGridX } = this.horizontalBounds;
    const chunkStart = chunk.chunkX * CHUNK_SIZE;
    const chunkEnd = chunkStart + CHUNK_SIZE - 1;

    if (chunkStart >= minGridX && chunkEnd <= maxGridX) {
      chunk.horizontalMaskVersion = this.horizontalMaskVersion;
      return;
    }

    for (let localX = 0; localX < CHUNK_SIZE; localX += 1) {
      const worldX = chunkStart + localX;
      if (worldX < minGridX || worldX > maxGridX) {
        for (let localY = 0; localY < CHUNK_SIZE; localY += 1) {
          chunk.setBlock(localX, localY, BlockFactory.createEmpty());
        }
      }
    }

    chunk.horizontalMaskVersion = this.horizontalMaskVersion;
  }

  _getChunk(chunkX, chunkY) {
    if (!this._isChunkWithinHorizontalBounds(chunkX)) {
      return null;
    }

    const chunk = this.cache.getChunk(chunkX, chunkY);
    if (chunk && this.horizontalBounds) {
      this._applyHorizontalMask(chunk);
    }
    return chunk;
  }

  /**
   * Queue draw commands for a single chunk.
   * @param {RenderQueue} renderQueue - Shared render queue instance.
   * @param {number} chunkX - Chunk X coordinate.
   * @param {number} chunkY - Chunk Y coordinate.
   * @param {{x: number, y: number}} transform - Camera transform (position only).
   * @param {{x: number, y: number, hp: number, maxHp: number} | null} digTarget - Active dig target (world coords).
   * @private
   */
  _renderChunk(renderQueue, chunkX, chunkY, transform, digTarget) {
    if (!this.spriteSheet) return;

    const chunk = this._getChunk(chunkX, chunkY);
    if (!chunk) return;

    const worldOffsetX = chunkX * CHUNK_SIZE * TILE_WIDTH;
    const worldOffsetY = chunkY * CHUNK_SIZE * TILE_HEIGHT;

    // Render tiles bottom to top for proper overlap
    for (let localY = CHUNK_SIZE - 1; localY >= 0; localY -= 1) {
      for (let localX = 0; localX < CHUNK_SIZE; localX += 1) {
        const worldGridX = chunk.chunkX * CHUNK_SIZE + localX;
        if (!this.isWithinHorizontalBounds(worldGridX)) {
          continue;
        }
        const block = chunk.getBlock(localX, localY);

        const physics = block.get(PhysicsComponent);
        const render = block.get(RenderComponent);

        if (!render) continue;
        const isLava = block.has(LethalComponent);
        if (physics && !physics.isCollidable() && !isLava) continue;

        const baseLayer = render.getBaseLayer();
        if (!baseLayer) continue;

        const worldTileX = worldOffsetX + localX * TILE_WIDTH;
        const worldTileY = worldOffsetY + localY * TILE_HEIGHT;
        const screenBaseX = worldTileX + transform.x;
        const screenBaseY = worldTileY + transform.y;

        const baseDestX = screenBaseX + baseLayer.offsetX;
        const baseDestY = screenBaseY + TILE_HEIGHT - baseLayer.height + baseLayer.offsetY;
        const baseDepth = -(screenBaseY + TILE_HEIGHT) + (render.depthOffset ?? 0);

        renderQueue.queueDraw({
          layer: render.layer ?? RenderLayer.TERRAIN_BASE,
          depth: baseDepth,
          spriteX: baseLayer.spriteX,
          spriteY: baseLayer.spriteY,
          width: baseLayer.width,
          height: baseLayer.height,
          destX: baseDestX,
          destY: baseDestY,
          alpha: baseLayer.alpha ?? 1.0,
        });

        const overlayLayers = render.getOverlayLayers();
        for (let i = 0; i < overlayLayers.length; i += 1) {
          const overlay = overlayLayers[i];
          const overlayDestX = screenBaseX + overlay.offsetX;
          const overlayDestY = screenBaseY + TILE_HEIGHT - overlay.height + overlay.offsetY;
          const overlayDepth = baseDepth
            + (overlay.depthOffset ?? 0)
            + (i + 1) * OVERLAY_DEPTH_STEP;

          renderQueue.queueDraw({
            layer: overlay.layer ?? RenderLayer.TERRAIN_OVERLAY,
            depth: overlayDepth,
            spriteX: overlay.spriteX,
            spriteY: overlay.spriteY,
            width: overlay.width,
            height: overlay.height,
            destX: overlayDestX,
            destY: overlayDestY,
            alpha: overlay.alpha ?? 1.0,
          });
        }

        const blockDarken = STATIC_DARKEN_FACTORS[baseLayer.spriteX] ?? 0;
        if (blockDarken > 0) {
          renderQueue.queueDraw({
            layer: RenderLayer.TERRAIN_BASE,
            depth: baseDepth + BASE_DARKEN_EPSILON,
            destX: baseDestX,
            destY: baseDestY,
            width: baseLayer.width,
            height: baseLayer.height,
            alpha: 1.0,
            type: 'fill-rect',
            fillStyle: `rgba(0, 0, 0, ${blockDarken})`,
          });
        }

        const darkness = block.get(DarknessComponent);
        if (darkness && darkness.alpha > 0) {
          renderQueue.queueDraw({
            layer: RenderLayer.TERRAIN_BASE,
            depth: baseDepth + DARKNESS_EPSILON,
            destX: screenBaseX,
            destY: screenBaseY - TILE_CAP_HEIGHT,
            width: TILE_WIDTH,
            height: SPRITE_HEIGHT,
            alpha: 1.0,
            type: 'fill-rect',
            fillStyle: `rgba(0, 0, 0, ${darkness.alpha})`,
          });
        }

        let digDarkness = 0;
        const worldX = chunkX * CHUNK_SIZE + localX;
        const worldY = chunkY * CHUNK_SIZE + localY;
        const isDigTarget = digTarget && digTarget.x === worldX && digTarget.y === worldY;

        if (isDigTarget) {
          const damagePercent = 1 - (digTarget.hp / digTarget.maxHp);
          digDarkness = damagePercent * 0.5;
        }

        if (digDarkness > 0) {
          renderQueue.queueDraw({
            layer: RenderLayer.TERRAIN_BASE,
            depth: baseDepth + DIG_EPSILON,
            destX: screenBaseX,
            destY: screenBaseY - TILE_CAP_HEIGHT,
            width: TILE_WIDTH,
            height: SPRITE_HEIGHT,
            alpha: 1.0,
            type: 'fill-rect',
            fillStyle: `rgba(0, 0, 0, ${digDarkness})`,
          });
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
    if (Number.isNaN(gridX) || Number.isNaN(gridY)) {
      const error = new Error(
        `TerrainSystem.getBlock called with invalid coordinates: gridX=${gridX}, gridY=${gridY}`,
      );
      console.error(error.stack);
      throw error;
    }

    if (!this.isWithinHorizontalBounds(gridX)) {
      return BlockFactory.createEmpty();
    }

    const chunkX = Math.floor(gridX / CHUNK_SIZE);
    const chunkY = Math.floor(gridY / CHUNK_SIZE);
    const localX = ((gridX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((gridY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    const chunk = this._getChunk(chunkX, chunkY);
    return chunk ? chunk.getBlock(localX, localY) : BlockFactory.createEmpty();
  }

  /**
   * Set block at world grid coordinates
   * @param {number} gridX - World grid x coordinate
   * @param {number} gridY - World grid y coordinate
   * @param {Block} block - Block entity
   */
  setBlock(gridX, gridY, block) {
    if (!this.isWithinHorizontalBounds(gridX)) {
      return;
    }

    const chunkX = Math.floor(gridX / CHUNK_SIZE);
    const chunkY = Math.floor(gridY / CHUNK_SIZE);
    const localX = ((gridX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((gridY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    const chunk = this._getChunk(chunkX, chunkY);
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
