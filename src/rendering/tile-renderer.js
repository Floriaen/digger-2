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
 */
export function drawTile(ctx, spriteSheet, blockId, screenX, screenY) {
  const block = getBlock(blockId);

  if (!block || (block.traversable && blockId !== 8)) { // 8 = LAVA
    return; // Don't render empty blocks (but render lava even though traversable)
  }

  // Draw sprite offset -9px above collision box (cap extends upward)
  const spriteY = screenY - TILE_CAP_HEIGHT;

  ctx.drawImage(
    spriteSheet,
    block.spriteX, block.spriteY,  // Source position in sprite sheet
    TILE_WIDTH, SPRITE_HEIGHT,      // Source dimensions (16×25)
    screenX, spriteY,                // Destination position (offset by cap height)
    TILE_WIDTH, SPRITE_HEIGHT        // Destination dimensions
  );
}