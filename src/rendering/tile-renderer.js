/**
 * @file tile-renderer.js
 * @description Shared tile rendering utilities for fake-3D blocks
 */

import { TILE_WIDTH, SPRITE_HEIGHT, TILE_CAP_HEIGHT } from '../utils/config.js';
import { RenderComponent } from '../components/blocks/render.component.js';
import { PhysicsComponent } from '../components/blocks/physics.component.js';
import { HealthComponent } from '../components/blocks/health.component.js';

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

  // Don't render empty blocks (but render lava even though traversable)
  const isLava = render.spriteX === 64 && render.spriteY === 0;
  if (physics && physics.traversable && !isLava) {
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
 * Draw darkening overlay on a tile based on HP
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

  // Apply darkening based on block HP
  // Map sprite coordinates to darkening factors
  const darkenFactors = {
    16: {  // Mud blocks (different HP levels)
      1: 0,      // HP=1: no darkening
      2: 0.1,    // HP=2: 10% dark
      3: 0.2,    // HP=3: 20% dark
      4: 0.3,    // HP=4: 30% dark
      5: 0.4,    // HP=5: 40% dark
    },
    32: 0.4,  // RED_FRAME (torus): 40% dark
    0: 0,     // GRASS: no darkening
  };

  let darkenFactor = 0;

  // Check if mud block (spriteX 16) - use HP-based darkening
  if (render.spriteX === 16) {
    const health = block.get(HealthComponent);
    const hp = health ? health.maxHp : 1;
    darkenFactor = darkenFactors[16][hp] || 0;
  } else {
    // Other blocks use fixed darkening
    darkenFactor = darkenFactors[render.spriteX] || 0;
  }

  if (darkenFactor > 0) {
    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = `rgba(0, 0, 0, ${darkenFactor})`;
    ctx.fillRect(screenX, spriteY, TILE_WIDTH, SPRITE_HEIGHT);

    ctx.restore();
  }
}