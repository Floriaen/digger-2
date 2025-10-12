/**
 * @file background.system.js
 * @description Background system - renders sky, mountains, sun, and lava
 */

import { System } from '../core/system.js';
import {
  WORLD_WIDTH_PX,
  BACKGROUND_MOUNTAIN_Y,
  SUN_VERTICAL_OFFSET,
} from '../utils/config.js';

/**
 * BackgroundComponent
 * Renders orange sky, black mountains, parallax, and lava lake
 */
export class BackgroundSystem extends System {
  init() {
    this.x = WORLD_WIDTH_PX / 2;
    this.y = BACKGROUND_MOUNTAIN_Y;
    this.sunRadius = 80;
    this.sunOffsetY = SUN_VERTICAL_OFFSET;
  }

  update() {
    // No updates needed - sun and mountains are in fixed world positions
  }

  render(ctx) {
    const camera = this.game.components.find((c) => c.constructor.name === 'CameraSystem');
    if (!camera) return;

    const viewBounds = camera.getViewBounds(ctx.canvas);
    const viewWidth = viewBounds.right - viewBounds.left;
    const viewHeight = viewBounds.bottom - viewBounds.top;

    // Sky - solid orange (Chess Pursuit palette)
    ctx.fillStyle = '#FF8601';
    ctx.fillRect(viewBounds.left, viewBounds.top, viewWidth, viewHeight);

    // Sun circle, fixed position in world
    const sunX = this.x;
    const sunY = this.y + this.sunOffsetY;

    ctx.fillStyle = '#FFE7CA';
    ctx.beginPath();
    ctx.arc(sunX, sunY, this.sunRadius, 0, Math.PI * 2);
    ctx.fill();

    // Mountains: fixed world Y (like sun), rendered same way
    this._drawMountains(ctx, viewBounds);

    // Dark underground below mountains
    const mountainScreenY = this.y;
    if (mountainScreenY < viewBounds.bottom) {
      ctx.fillStyle = '#202020';
      ctx.fillRect(
        viewBounds.left,
        mountainScreenY - 1,
        viewWidth,
        viewBounds.bottom - mountainScreenY,
      ); // -1 to avoid any light gap
    }
  }

  /**
   * Draw mountain silhouettes (fixed world Y, just like sun)
   * Code adapted from @saturnyn's Chess Pursuit (js13kGames 2015)
   * https://js13kgames.com/2015/games/chesspursuit
   * @param {CanvasRenderingContext2D} ctx
   * @param {{left: number, right: number, top: number, bottom: number}} viewBounds - Visible region
   * @private
   */
  _drawMountains(ctx, viewBounds) {
    // Mountain horizon in world space (fixed relative to terrain)
    const horizonWorldY = this.y;
    const viewWidth = viewBounds.right - viewBounds.left;

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
      1, 0.8,
    ];

    // Draw mountain silhouette spanning screen width
    for (let i = 0; i < points.length; i += 2) {
      const x = viewBounds.left + points[i] * viewWidth;
      const y = horizonWorldY - (mountainMaxHeight * points[i + 1]) - 78;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.lineTo(viewBounds.right, horizonWorldY);
    ctx.lineTo(viewBounds.left, horizonWorldY);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Draw green surface strip
   * @param {CanvasRenderingContext2D} ctx
   * @param {{left: number, right: number, top: number, bottom: number}} viewBounds - Visible region
   * @private
   */
  _drawSurface(ctx, viewBounds) {
    const screenY = this.surfaceY;
    const width = viewBounds.right - viewBounds.left;

    // Light green top
    ctx.fillStyle = '#7CB342';
    ctx.fillRect(viewBounds.left, screenY, width, 8);

    // Darker mid
    ctx.fillStyle = '#558B2F';
    ctx.fillRect(viewBounds.left, screenY + 8, width, 6);

    // Shadow line
    ctx.fillStyle = '#33691E';
    ctx.fillRect(viewBounds.left, screenY + 14, width, 2);
  }

  destroy() {
    // Cleanup if needed
  }
}
