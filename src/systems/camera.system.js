/**
 * @file camera.system.js
 * @description Camera system - manages viewport transforms and smooth following
 */

import { System } from '../core/system.js';
import { lerp } from '../utils/math.js';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3.0;
const FOLLOW_LERP = 0.1;

/**
 * CameraSystem
 * Smoothly follows a target in world space.
 * Viewport handles the actual canvas transform.
 */
export class CameraSystem extends System {
  constructor(game, x = 0, y = 0, zoom = 3.0) {
    super(game);

    this.x = x; // Camera center X in world space
    this.y = y; // Camera center Y in world space
    this.zoom = zoom;

    this.followTarget = null;
  }

  update(_deltaTime) {
    if (this.followTarget) {
      this.x = lerp(this.x, this.followTarget.x, FOLLOW_LERP);
      this.y = lerp(this.y, this.followTarget.y, FOLLOW_LERP);
    }

    // Clamp camera to world bounds
    if (this.game.viewport) {
      this.clampToWorld(
        this.game.viewport.worldWidth,
        this.game.viewport.worldHeight,
        this.game.viewport.canvasWidth,
        this.game.viewport.canvasHeight,
      );
    }
  }

  render() {
    // Camera does not render directly; it manipulates the context transform.
  }

  destroy() {
    this.followTarget = null;
  }

  follow(target) {
    this.followTarget = target;
  }

  clampToWorld(worldWidth, worldHeight, viewportWidth, viewportHeight) {
    const halfWidth = viewportWidth / (2 * this.zoom);
    const halfHeight = viewportHeight / (2 * this.zoom);

    // When world is smaller than viewport, center the world
    // When world is larger than viewport, clamp to edges
    if (worldWidth <= viewportWidth / this.zoom) {
      // World fits entirely in viewport - center it
      this.x = worldWidth / 2;
    } else {
      // World larger than viewport - clamp to edges
      this.x = Math.max(halfWidth, Math.min(this.x, worldWidth - halfWidth));
    }

    if (worldHeight <= viewportHeight / this.zoom) {
      // World fits entirely in viewport - center it
      this.y = worldHeight / 2;
    } else {
      // World larger than viewport - clamp to edges
      this.y = Math.max(halfHeight, Math.min(this.y, worldHeight - halfHeight));
    }
  }

  // external method
  getViewBounds(canvas) {
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const halfWidth = canvasWidth / (2 * this.zoom);
    const halfHeight = canvasHeight / (2 * this.zoom);

    return {
      left: this.x - halfWidth,
      right: this.x + halfWidth,
      top: this.y - halfHeight,
      bottom: this.y + halfHeight,
    };
  }

  setZoom(zoom) {
    this.zoom = this._clampZoom(zoom);
  }

  _clampZoom(zoom) {
    if (!Number.isFinite(zoom)) {
      return this.zoom;
    }
    return Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
  }
}
