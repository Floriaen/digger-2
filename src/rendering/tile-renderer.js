/**
 * @file tile-renderer.js
 * @description Shared tile rendering utilities for fake-3D blocks
 */

import { TILE_WIDTH, TILE_HEIGHT } from '../utils/config.js';
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

  if (!block || block.traversable) {
    return; // Don't render empty blocks
  }

  // TODO: Implement sprite sheet rendering in Milestone 0
  // For now, use placeholder rectangles with block colors
  ctx.fillStyle = block.color;
  ctx.fillRect(screenX, screenY, TILE_WIDTH, TILE_HEIGHT);

  // Draw darker top cap for fake-3D effect (9px height)
  ctx.fillStyle = darkenColor(block.color, 0.3);
  ctx.fillRect(screenX, screenY, TILE_WIDTH, 9);

  // Inner border for definition
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(screenX + 0.5, screenY + 0.5, TILE_WIDTH - 1, TILE_HEIGHT - 1);
}

/**
 * Darken a hex color
 * @param {string} color - Hex color string
 * @param {number} factor - Darken factor (0-1)
 * @returns {string} Darkened color
 */
function darkenColor(color, factor) {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  const newR = Math.floor(r * (1 - factor));
  const newG = Math.floor(g * (1 - factor));
  const newB = Math.floor(b * (1 - factor));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}
