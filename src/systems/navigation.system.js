/**
 * @file navigation.component.js
 * @description Navigation guidance - white triangle markers for valid movement directions
 */

import { System } from "../core/system.js';
import { SPRITE_ATLAS, loadSpriteSheet } from '../rendering/sprite-atlas.js';
import { DiggableComponent } from './blocks/diggable.component.js';

const GUIDANCE_DELAY_MS = 400;

/**
 * NavigationComponent
 * Displays white triangle markers after 400ms of player inactivity
 * to indicate valid dig directions (left, right, down)
 */
export class NavigationSystem extends System {
  init() {
    this.inactivityTimer = 0;
    this.showGuidance = false;
    this.validDirections = { left: false, right: false, down: false };
    this.fallWarning = false; // Flash triangles if falling block above
    this.spriteSheet = null;

    // Load sprite sheet
    loadSpriteSheet().then((img) => {
      this.spriteSheet = img;
    }).catch((err) => {
      console.error('Failed to load sprite sheet:', err);
    });
  }

  update(deltaTime) {
    const player = this.game.components.find((c) => c.constructor.name === 'PlayerSystem');
    const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainSystem');

    if (!player || !terrain) return;

    // Hide guidance if player is dead
    if (player.dead) {
      this.inactivityTimer = 0;
      this.showGuidance = false;
      return;
    }

    // Check if player is stationary (idle or blocked)
    const isStationary = player.state === 'idle' || !player.hasStarted;

    if (isStationary) {
      this.inactivityTimer += deltaTime;

      if (this.inactivityTimer >= GUIDANCE_DELAY_MS) {
        this.showGuidance = true;
        this._updateValidDirections(player, terrain);
      }
    } else {
      // Player moved - instantly hide guidance
      this.inactivityTimer = 0;
      this.showGuidance = false;
    }
  }

  render(ctx) {
    if (!this.showGuidance || !this.spriteSheet) return;

    const player = this.game.components.find((c) => c.constructor.name === 'PlayerSystem');
    const camera = this.game.components.find((c) => c.constructor.name === 'CameraSystem');

    if (!player || !camera) return;

    const transform = camera.getTransform();

    // Save context state
    ctx.save();

    // Set opacity for arrows
    const alpha = this.fallWarning ? 0.9 : 0.7;
    ctx.globalAlpha = alpha;

    // Left arrow - align with front face of block (9px down for cap)
    if (this.validDirections.left) {
      const x = (player.gridX - 1) * 16 + transform.x;
      const y = player.gridY * 16 - 7 + transform.y; // +9 for cap offset
      this._drawArrow(ctx, x, y, 'left');
    }

    // Right arrow - align with front face of block (9px down for cap)
    if (this.validDirections.right) {
      const x = (player.gridX + 1) * 16 + transform.x;
      const y = player.gridY * 16 - 7 + transform.y; // +9 for cap offset
      this._drawArrow(ctx, x, y, 'right');
    }

    // Down arrow - align with front face of block (9px down for cap)
    if (this.validDirections.down) {
      const x = player.gridX * 16 + transform.x;
      const y = (player.gridY + 1) * 16 + transform.y; // +9 for cap offset
      this._drawArrow(ctx, x, y, 'down');
    }

    // Restore context state
    ctx.restore();
  }

  /**
   * Update which directions are valid for digging
   * @param {PlayerSystem} player
   * @param {TerrainSystem} terrain
   * @private
   */
  _updateValidDirections(player, terrain) {
    const leftBlock = terrain.getBlock(player.gridX - 1, player.gridY);
    const rightBlock = terrain.getBlock(player.gridX + 1, player.gridY);
    const downBlock = terrain.getBlock(player.gridX, player.gridY + 1);

    this.validDirections.left = leftBlock.has(DiggableComponent);
    this.validDirections.right = rightBlock.has(DiggableComponent);
    this.validDirections.down = downBlock.has(DiggableComponent);

    // Check for falling blocks component
    const fallingBlocks = this.game.components.find(
      (c) => c.constructor.name === 'FallingBlocksComponent',
    );

    if (fallingBlocks) {
      // Check if any falling block is above player
      const hasBlockAbove = fallingBlocks.fallingBlocks.some(
        (fb) => fb.gridX === player.gridX && fb.gridY < player.gridY,
      );
      this.fallWarning = hasBlockAbove;
    } else {
      this.fallWarning = false;
    }
  }

  /**
   * Draw an arrow from sprite sheet
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - Grid X position (world coords)
   * @param {number} y - Grid Y position (world coords)
   * @param {string} direction - 'left', 'right', or 'down'
   * @private
   */
  _drawArrow(ctx, x, y, direction) {
    let sprite;
    if (direction === 'left') {
      sprite = SPRITE_ATLAS.triangle_left;
    } else if (direction === 'right') {
      sprite = SPRITE_ATLAS.triangle_right;
    } else if (direction === 'down') {
      sprite = SPRITE_ATLAS.triangle_down;
    }

    if (!sprite) return;

    ctx.drawImage(
      this.spriteSheet,
      sprite.x,
      sprite.y,
      sprite.width,
      sprite.height,
      x,
      y,
      sprite.width,
      sprite.height,
    );
  }
}
