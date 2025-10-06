/**
 * @file background.component.js
 * @description Background component - renders sky, mountains, sun, and lava
 */

import { LifecycleComponent } from '../core/lifecycle-component.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/config.js';

/**
 * BackgroundComponent
 * Renders orange sky, black mountains, parallax, and lava lake
 */
export class BackgroundComponent extends LifecycleComponent {
  init() {
    this.sunX = null; // Sun X position (set from player's initial position)
    this.sunY = null; // Sun Y position (set from player's initial position)
    this.mountainWorldY = null; // Mountain Y position in world space (set once, like sun)
  }

  update() {
    // No updates needed - sun and mountains are in fixed world positions
  }

  render(ctx) {
    const camera = this.game.components.find((c) => c.constructor.name === 'CameraComponent');
    if (!camera) return;

    const transform = camera.getTransform();

    // Sky - solid orange (Chess Pursuit palette)
    ctx.fillStyle = '#FF8601';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Sun and mountains: both fixed at initial world position (like sun)
    const player = this.game.components.find((c) => c.constructor.name === 'PlayerComponent');
    if (player) {
      // Set sun and mountain positions once from player's initial position
      if (this.sunX === null || this.sunY === null) {
        this.sunX = player.x;
        this.sunY = player.y;
        this.mountainWorldY = 120; // Mountain horizon at fixed world Y
      }

      // Sun circle, fixed position in world
      const sunScreenX = this.sunX + transform.x;
      const sunScreenY = this.sunY + transform.y;
      ctx.fillStyle = '#FFE7CA';
      ctx.beginPath();
      ctx.arc(sunScreenX, sunScreenY, 80, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mountains: fixed world Y (like sun), rendered same way
    this._drawMountains(ctx, transform);

    // Dark underground below mountains
    const mountainScreenY = this.mountainWorldY + transform.y;
    if (mountainScreenY < CANVAS_HEIGHT) {
      ctx.fillStyle = '#202020';
      ctx.fillRect(0, mountainScreenY - 1, CANVAS_WIDTH, CANVAS_HEIGHT - mountainScreenY); // -1 to avoid any light gap
    }
  }

  /**
   * Draw mountain silhouettes (fixed world Y, just like sun)
   * Code adapted from @saturnyn's Chess Pursuit (js13kGames 2015)
   * https://js13kgames.com/2015/games/chesspursuit
   * @param {CanvasRenderingContext2D} ctx
   * @param {{x: number, y: number}} transform - Camera transform
   * @private
   */
  _drawMountains(ctx, transform) {
    if (this.mountainWorldY === null) return;

    // Mountain horizon in screen space (world Y + camera transform, just like sun)
    const horizonScreenY = this.mountainWorldY + transform.y;

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

    // Draw mountain silhouette spanning screen width
    for (let i = 0; i < points.length; i += 2) {
      const x = points[i] * CANVAS_WIDTH + transform.x; // Full screen width (0 to CANVAS_WIDTH)
      const y = horizonScreenY - (mountainMaxHeight * points[i + 1]) - 78;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.lineTo(CANVAS_WIDTH, horizonScreenY);
    ctx.lineTo(0, horizonScreenY);
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
