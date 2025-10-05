/**
 * @file tile-renderer.js
 * @description Shared tile rendering utilities for fake-3D blocks
 */

import { TILE_WIDTH, SPRITE_HEIGHT, TILE_CAP_HEIGHT } from '../utils/config.js';
import { getBlock } from '../terrain/block-registry.js';

/**
 * Draw a tile at grid coordinates
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLImageElement} spriteSheet - Sprite sheet image
 * @param {number} blockId - Block type ID
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @param {number} alpha - Transparency (0.0 = fully transparent, 1.0 = fully opaque)
 */
export function drawTile(ctx, spriteSheet, blockId, screenX, screenY, alpha = 1.0) {
  const block = getBlock(blockId);

  if (!block || (block.traversable && blockId !== 8)) { // 8 = LAVA
    return; // Don't render empty blocks (but render lava even though traversable)
  }

  // Draw sprite offset -9px above collision box (cap extends upward)
  const spriteY = screenY - TILE_CAP_HEIGHT;

  // Apply transparency for dig progress
  ctx.save();
  ctx.globalAlpha = alpha;

  // Draw the sprite
  ctx.drawImage(
    spriteSheet,
    block.spriteX, block.spriteY,  // Source position in sprite sheet
    TILE_WIDTH, SPRITE_HEIGHT,      // Source dimensions (16×25)
    screenX, spriteY,                // Destination position (offset by cap height)
    TILE_WIDTH, SPRITE_HEIGHT,       // Destination dimensions
  );

  ctx.restore();
}

/**
 * Draw darkening overlay on a tile based on HP
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} blockId - Block type ID
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @param {number} alpha - Transparency for the darkening overlay
 */
export function drawTileDarkening(ctx, blockId, screenX, screenY, alpha = 1.0) {
  const block = getBlock(blockId);
  if (!block) return;

  const spriteY = screenY - TILE_CAP_HEIGHT;

  // Apply darkening based on block type (independent of HP)
  // Create visual diversity for different mud types
  const darkenFactors = {
    1: 0,      // MUD_LIGHT: no darkening
    2: 0.1,    // MUD_MEDIUM: 10% dark
    3: 0.2,    // MUD_DARK: 20% dark
    4: 0.3,    // MUD_DENSE: 30% dark
    5: 0.4,    // MUD_CORE: 40% dark
    7: 0.4,    // RED_FRAME: 40% dark (same as core)
    9: 0,      // GRASS: no darkening
  };

  const darkenFactor = darkenFactors[blockId];

  if (darkenFactor !== undefined && darkenFactor > 0) {
    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = `rgba(0, 0, 0, ${darkenFactor})`;
    ctx.fillRect(screenX, spriteY, TILE_WIDTH, SPRITE_HEIGHT);

    ctx.restore();
  }
}