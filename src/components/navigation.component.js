/**
 * @file navigation.component.js
 * @description Navigation guidance - white triangle markers for valid movement directions
 */

import { Component } from '../core/component.base.js';
import { isDiggable } from '../terrain/block-registry.js';

const GUIDANCE_DELAY_MS = 400;

/**
 * NavigationComponent
 * Displays white triangle markers after 400ms of player inactivity
 * to indicate valid dig directions (left, right, down)
 */
export class NavigationComponent extends Component {
  init() {
    this.inactivityTimer = 0;
    this.showGuidance = false;
    this.validDirections = { left: false, right: false, down: false };
    this.fallWarning = false; // Flash triangles if falling block above
  }

  update(deltaTime) {
    const player = this.game.components.find((c) => c.constructor.name === 'PlayerComponent');
    const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainComponent');

    if (!player || !terrain) return;

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
    if (!this.showGuidance) return;

    const player = this.game.components.find((c) => c.constructor.name === 'PlayerComponent');
    const camera = this.game.components.find((c) => c.constructor.name === 'CameraComponent');

    if (!player || !camera) return;

    const transform = camera.getTransform();

    // Draw white triangles for valid directions
    ctx.fillStyle = this.fallWarning ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.7)';

    // Left triangle
    if (this.validDirections.left) {
      const x = (player.gridX - 1) * 16 + 8 + transform.x;
      const y = player.gridY * 16 + 8 + transform.y;
      this._drawTriangle(ctx, x, y, 'left');
    }

    // Right triangle
    if (this.validDirections.right) {
      const x = (player.gridX + 1) * 16 + 8 + transform.x;
      const y = player.gridY * 16 + 8 + transform.y;
      this._drawTriangle(ctx, x, y, 'right');
    }

    // Down triangle
    if (this.validDirections.down) {
      const x = player.gridX * 16 + 8 + transform.x;
      const y = (player.gridY + 1) * 16 + 8 + transform.y;
      this._drawTriangle(ctx, x, y, 'down');
    }
  }

  /**
   * Update which directions are valid for digging
   * @param {PlayerComponent} player
   * @param {TerrainComponent} terrain
   * @private
   */
  _updateValidDirections(player, terrain) {
    const leftBlock = terrain.getBlock(player.gridX - 1, player.gridY);
    const rightBlock = terrain.getBlock(player.gridX + 1, player.gridY);
    const downBlock = terrain.getBlock(player.gridX, player.gridY + 1);

    this.validDirections.left = isDiggable(leftBlock);
    this.validDirections.right = isDiggable(rightBlock);
    this.validDirections.down = isDiggable(downBlock);

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
   * Draw a directional triangle
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {string} direction - 'left', 'right', or 'down'
   * @private
   */
  _drawTriangle(ctx, x, y, direction) {
    const size = 6;

    ctx.beginPath();
    if (direction === 'left') {
      ctx.moveTo(x - size, y);
      ctx.lineTo(x + size / 2, y - size);
      ctx.lineTo(x + size / 2, y + size);
    } else if (direction === 'right') {
      ctx.moveTo(x + size, y);
      ctx.lineTo(x - size / 2, y - size);
      ctx.lineTo(x - size / 2, y + size);
    } else if (direction === 'down') {
      ctx.moveTo(x, y + size);
      ctx.lineTo(x - size, y - size / 2);
      ctx.lineTo(x + size, y - size / 2);
    }
    ctx.closePath();
    ctx.fill();
  }
}
