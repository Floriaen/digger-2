/**
 * @file background.component.js
 * @description Background component - renders sky, mountains, sun, and lava
 */

import { Component } from '../core/component.base.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/config.js';

/**
 * BackgroundComponent
 * Renders orange sky, black mountains, parallax, and lava lake
 */
export class BackgroundComponent extends Component {
  init() {
    this.parallaxOffset = 0;
    this.mountainWorldY = 80; // Mountain bottom in world coordinates (gridY=3, which is 3*16=48)
    this.sunX = null; // Sun X position (set from player's initial position)
    this.sunY = null; // Sun Y position (set from player's initial position)
  }

  update() {
    // Update parallax based on camera position
    const camera = this.game.components.find((c) => c.constructor.name === 'CameraComponent');
    if (camera) {
      // Subtle horizontal parallax
      this.parallaxOffset = -camera.x * 0.2;
    }
  }

  render(ctx) {
    const camera = this.game.components.find((c) => c.constructor.name === 'CameraComponent');
    if (!camera) return;

    const transform = camera.getTransform();

    // Calculate mountain bottom position in screen coordinates (world Y + camera offset)
    const mountainBottomY = this.mountainWorldY + transform.y;

    // Sky - solid orange (Chess Pursuit palette)
    ctx.fillStyle = '#FF8601';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Sun (fixed at player's initial position)
    const player = this.game.components.find((c) => c.constructor.name === 'PlayerComponent');
    if (player) {
      // Set sun position once from player's initial position
      if (this.sunX === null || this.sunY === null) {
        this.sunX = player.x;
        this.sunY = player.y;
      }

      // Sun circle, fixed position in world (Chess Pursuit palette)
      const sunScreenX = this.sunX + transform.x;
      const sunScreenY = this.sunY + transform.y;
      ctx.fillStyle = '#FFE7CA';
      ctx.beginPath();
      ctx.arc(sunScreenX, sunScreenY, 80, 0, Math.PI * 2);
      ctx.fill();
    }

    // Black mountain silhouettes (with parallax)
    this._drawMountains(ctx, transform);

    // Draw black underground below the mountains
    if (mountainBottomY < CANVAS_HEIGHT) {
      ctx.fillStyle = '#202020';
      ctx.fillRect(0, mountainBottomY - 1, CANVAS_WIDTH, CANVAS_HEIGHT - mountainBottomY);
    }
  }

  /**
   * Draw mountain silhouettes
   * Code adapted from @saturnyn's Chess Pursuit (js13kGames 2015)
   * https://js13kgames.com/2015/games/chesspursuit
   * @param {CanvasRenderingContext2D} ctx
   * @param {{x: number, y: number}} transform - Camera transform
   * @private
   */
  _drawMountains(ctx, transform) {
    const horizonY = this.mountainWorldY + transform.y;

    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = '#202020';

    const mountainMaxHeight = 40;
    const points = [
      0, 0.7,
      0.1, 0.3,
      0.2, 1,
      0.3, 0.5,
      0.35, 0.8,
      0.42, 0.5,
      0.55, 0.9,
      0.7, 0.45,
      0.8, 1.1,
      0.88, 0.4,
      1, 0.8
    ];

    for (let i = 0; i < points.length; i += 2) {
      const x = points[i] * CANVAS_WIDTH;
      const y = (transform.y * 0.2 - 78) + horizonY - (mountainMaxHeight * points[i + 1]);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.lineTo(CANVAS_WIDTH, horizonY);
    ctx.lineTo(0, horizonY);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Draw green surface strip
   * @param {CanvasRenderingContext2D} ctx
   * @param {{x: number, y: number}} transform - Camera transform
   * @private
   */
  _drawSurface(ctx, transform) {
    const screenY = this.surfaceY + transform.y;

    // Light green top
    ctx.fillStyle = '#7CB342';
    ctx.fillRect(0, screenY, CANVAS_WIDTH, 8);

    // Darker mid
    ctx.fillStyle = '#558B2F';
    ctx.fillRect(0, screenY + 8, CANVAS_WIDTH, 6);

    // Shadow line
    ctx.fillStyle = '#33691E';
    ctx.fillRect(0, screenY + 14, CANVAS_WIDTH, 2);
  }

  destroy() {
    // Cleanup if needed
  }
}
