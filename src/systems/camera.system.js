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
 * Smoothly follows a target and applies canvas transforms.
 */
export class CameraSystem extends System {
  constructor(game, x = 0, y = 0, zoom = 3.0, worldWidth, worldHeight) {
    super(game);

    this.x = x; // Camera center X in world space
    this.y = y; // Camera center Y in world space
    this.zoom = zoom;

    this.followTarget = null;

    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  update(_deltaTime) {
    if (this.followTarget) {
      this.x = lerp(this.x, this.followTarget.x, FOLLOW_LERP);
      this.y = lerp(this.y, this.followTarget.y, FOLLOW_LERP);
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

  applyTransform(ctx, canvas) {
    this.clampToWorld(canvas);
    ctx.setTransform(
      this.zoom,
      0,
      0,
      this.zoom,
      canvas.width / 2 - this.x * this.zoom,
      canvas.height / 2 - this.y * this.zoom,
    );
  }

  resetTransform(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  clampToWorld(canvas) {
    const halfWidth = canvas.width / (2 * this.zoom);
    const halfHeight = canvas.height / (2 * this.zoom);

    this.x = Math.max(halfWidth, Math.min(this.x, this.worldWidth - halfWidth));
    this.y = Math.max(halfHeight, Math.min(this.y, this.worldHeight - halfHeight));
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
