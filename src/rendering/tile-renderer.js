/**
 * @file tile-renderer.js
 * @description Shared tile rendering utilities for fake-3D blocks
 */

import { TILE_WIDTH, SPRITE_HEIGHT, TILE_CAP_HEIGHT } from '../utils/config.js';
import { RenderComponent } from '../components/blocks/render.component.js';
import { PhysicsComponent } from '../components/blocks/physics.component.js';
import { HealthComponent } from '../components/blocks/health.component.js';
import { LethalComponent } from '../components/blocks/lethal.component.js';

/**
 * Draw a tile at grid coordinates
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLImageElement} spriteSheet - Sprite sheet image
 * @param {Block} block - Block entity
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @param {number} alpha - Transparency (0.0 = fully transparent, 1.0 = fully opaque)
 */
export function drawTile(ctx, spriteSheet, block, screenX, screenY, alpha = 1.0) {
  const render = block.get(RenderComponent);
  const physics = block.get(PhysicsComponent);

  if (!render) {
    return; // Can't render without RenderComponent
  }

  // Don't render empty blocks (but render lava even though not collidable)
  const isLava = block.has(LethalComponent);
  if (physics && !physics.isCollidable() && !isLava) {
    return;
  }

  // Draw sprite offset -9px above collision box (cap extends upward)
  const spriteY = screenY - TILE_CAP_HEIGHT;

  // Apply transparency for dig progress
  ctx.save();
  ctx.globalAlpha = alpha;

  // Draw the sprite
  ctx.drawImage(
    spriteSheet,
    render.spriteX, render.spriteY,  // Source position in sprite sheet
    TILE_WIDTH, SPRITE_HEIGHT,        // Source dimensions (16×25)
    screenX, spriteY,                 // Destination position (offset by cap height)
    TILE_WIDTH, SPRITE_HEIGHT,        // Destination dimensions
  );

  ctx.restore();
}

/**
 * Draw darkening overlay on a tile for specific block types (RED_FRAME only)
 * Most darkening is now handled by DarknessComponent
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Block} block - Block entity
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @param {number} alpha - Transparency for the darkening overlay
 */
export function drawTileDarkening(ctx, block, screenX, screenY, alpha = 1.0) {
  const render = block.get(RenderComponent);
  if (!render) return;

  const spriteY = screenY - TILE_CAP_HEIGHT;

  // Fixed darkening for specific block types (most use DarknessComponent now)
  const darkenFactors = {
    32: 0.4,  // RED_FRAME (torus): 40% dark
  };

  const darkenFactor = darkenFactors[render.spriteX] || 0;

  if (darkenFactor > 0) {
    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = `rgba(0, 0, 0, ${darkenFactor})`;
    ctx.fillRect(screenX, spriteY, TILE_WIDTH, SPRITE_HEIGHT);

    ctx.restore();
  }
}