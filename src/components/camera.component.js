/**
 * @file camera.component.js
 * @description Camera component - handles viewport tracking and smooth following
 */

import { LifecycleComponent } from '../core/lifecycle-component.js';
import { CAMERA_LERP_FACTOR, CAMERA_OFFSET_Y, CANVAS_WIDTH } from '../utils/config.js';
import { lerp, easeInQuad } from '../utils/math.js';

/**
 * CameraComponent
 * Manages viewport position and smooth player tracking
 */
export class CameraComponent extends LifecycleComponent {
  init() {
    // Initialize camera position centered on player immediately
    const player = this.game.components.find((c) => c.constructor.name === 'PlayerComponent');
    if (player) {
      // Floor the initial position to ensure pixel-perfect alignment from the start
      this.x = Math.floor(CANVAS_WIDTH / 2 - player.x);
      this.y = Math.floor(CAMERA_OFFSET_Y - player.y);
    } else {
      this.x = 0;
      this.y = 0;
    }
    this.targetX = this.x;
    this.targetY = this.y;
    this.zoom = 2.0;
    this.targetZoom = 3.0; // Start with target at 3.0 for smooth zoom-in animation
    this.manualZoom = false; // Flag to disable auto-zoom when manually controlled
  }

  update(deltaTime) {
    const player = this.game.components.find((c) => c.constructor.name === 'PlayerComponent');
    if (!player) return;

    // Only auto-adjust zoom if not manually controlled
    if (!this.manualZoom) {
      // Smoothly increase zoom based on pixel depth (zoom IN as you dig deeper)
      const playerDepthPixels = player.y;
      const playerDepthTiles = playerDepthPixels / 16; // Convert pixels to tiles (smooth)
      // Gradually zoom from 2.0 at depth 0 to 3.0 at depth 12+
      const t = Math.min(playerDepthTiles / 12, 1.0); // Normalized depth (0 to 1)
      // Ease-in curve: less zoom at beginning, more zoom at end
      const eased = easeInQuad(t);
      const rawZoom = 2.0 + eased * 1.0;
      this.targetZoom = rawZoom;
    }

    // Smooth zoom lerp
    this.zoom = lerp(this.zoom, this.targetZoom, 0.1);

    // Target: center player horizontally, offset vertically
    this.targetX = CANVAS_WIDTH / 2 - player.x;
    this.targetY = CAMERA_OFFSET_Y - player.y;

    // Dynamic lerp factor based on zoom (smoother at high zoom)
    const zoomAdjustedLerp = CAMERA_LERP_FACTOR * Math.max(0.2, 1 / this.zoom);

    // Smooth lerp
    this.x = lerp(this.x, this.targetX, zoomAdjustedLerp);
    this.y = lerp(this.y, this.targetY, zoomAdjustedLerp);
  }

  render() {
    // Camera doesn't render, it transforms context
  }

  destroy() {
    // Cleanup if needed
  }

  /**
   * Get camera transform for rendering
   * @returns {{x: number, y: number, zoom: number}} Camera offset and zoom
   */
  getTransform() {
    // Floor camera position for pixel alignment
    // Snap zoom to nearest defined level to prevent flickering (only when using zoom-before strategy)
    let finalZoom = this.zoom;

    if (!this.game.zoomAfterRendering) {
      const zoomLevels = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0];
      finalZoom = zoomLevels.reduce((prev, curr) =>
        Math.abs(curr - this.zoom) < Math.abs(prev - this.zoom) ? curr : prev
      );
    }

    return {
      x: Math.floor(this.x),
      y: Math.floor(this.y),
      zoom: finalZoom
    };
  }

  /**
   * Set zoom level
   * @param {number} zoom - Target zoom level
   */
  setZoom(zoom) {
    this.targetZoom = zoom;
  }
}
