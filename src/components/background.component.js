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
    this.surfaceY = 100; // Surface level in screen coordinates
  }

  update(deltaTime) {
    // Update parallax based on camera position
    const camera = this.game.components.find((c) => c.constructor.name === 'CameraComponent');
    if (camera) {
      // Subtle horizontal parallax
      this.parallaxOffset = -camera.x * 0.2;
    }
  }

  render(ctx) {
    const camera = this.game.components.find((c) => c.constructor.name === 'CameraComponent');
    const player = this.game.components.find((c) => c.constructor.name === 'PlayerComponent');

    if (!camera || !player) return;

    const transform = camera.getTransform();

    // Calculate fade based on depth
    const surfaceWorldY = this.surfaceY;
    const fadeStartY = surfaceWorldY + 100; // Start fading at this depth
    const fadeEndY = surfaceWorldY + 300; // Fully black at this depth
    const depthRatio = (player.y - fadeStartY) / (fadeEndY - fadeStartY);
    const fade = Math.max(0, Math.min(1, depthRatio)); // Clamp 0-1

    // Always draw sky (even when underground for smooth transition)
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#FF8C42');
    gradient.addColorStop(0.6, '#FF6B35');
    gradient.addColorStop(1, '#FF5733');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Beige sun disc (top right) - scrolls with camera, fades out
    const sunY = 80 + transform.y;
    if (sunY > -50 && fade < 1) {
      ctx.globalAlpha = 1 - fade;
      ctx.fillStyle = '#F4E4C1';
      ctx.beginPath();
      ctx.arc(CANVAS_WIDTH - 100, sunY, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Black mountain silhouettes (with parallax) - fade out
    if (fade < 1) {
      ctx.globalAlpha = 1 - fade;
      this._drawMountains(ctx, transform);
      ctx.globalAlpha = 1;
    }

    // Note: Green surface is now rendered per-block in terrain component

    // Overlay black fade for underground transition
    if (fade > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }

  /**
   * Draw mountain silhouettes with parallax
   * @param {CanvasRenderingContext2D} ctx
   * @param {{x: number, y: number}} transform - Camera transform
   * @private
   */
  _drawMountains(ctx, transform) {
    const screenY = this.surfaceY + transform.y;
    ctx.fillStyle = '#000000';

    // Mountain range 1 (background) - slight parallax
    const parallax1 = transform.y * 0.3;
    ctx.beginPath();
    ctx.moveTo(0 + this.parallaxOffset * 0.5, screenY + parallax1);
    ctx.lineTo(150 + this.parallaxOffset * 0.5, screenY - 80 + parallax1);
    ctx.lineTo(300 + this.parallaxOffset * 0.5, screenY - 40 + parallax1);
    ctx.lineTo(450 + this.parallaxOffset * 0.5, screenY - 100 + parallax1);
    ctx.lineTo(CANVAS_WIDTH, screenY - 60 + parallax1);
    ctx.lineTo(CANVAS_WIDTH, screenY + parallax1);
    ctx.closePath();
    ctx.fill();

    // Mountain range 2 (foreground) - more parallax
    const parallax2 = transform.y * 0.5;
    ctx.beginPath();
    ctx.moveTo(0 + this.parallaxOffset, screenY + parallax2);
    ctx.lineTo(100 + this.parallaxOffset, screenY - 60 + parallax2);
    ctx.lineTo(250 + this.parallaxOffset, screenY - 30 + parallax2);
    ctx.lineTo(400 + this.parallaxOffset, screenY - 90 + parallax2);
    ctx.lineTo(600 + this.parallaxOffset, screenY - 50 + parallax2);
    ctx.lineTo(CANVAS_WIDTH, screenY - 40 + parallax2);
    ctx.lineTo(CANVAS_WIDTH, screenY + parallax2);
    ctx.closePath();
    ctx.fill();
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
