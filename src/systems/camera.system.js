/**
 * @file camera.system.js
 * @description Camera system - manages viewport transforms and smooth following
 */

import { System } from '../core/system.js';
import { lerp } from '../utils/math.js';

const DEFAULT_WORLD_SIZE = 2000;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3.0;
const FOLLOW_LERP = 0.1;

/**
 * CameraSystem
 * Smoothly follows a target and applies canvas transforms.
 */
export class CameraSystem extends System {
  constructor(game, x = 0, y = 0, zoom = 3.0, worldWidth = DEFAULT_WORLD_SIZE, worldHeight = DEFAULT_WORLD_SIZE) {
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
      const { x: targetX, y: targetY } = this._computeTargetPosition(this.followTarget);
      this.x = lerp(this.x, targetX, FOLLOW_LERP);
      this.y = lerp(this.y, targetY, FOLLOW_LERP);
    }
  }

  render() {
    // Camera does not render directly; it manipulates the context transform.
  }

  destroy() {
    this.followTarget = null;
  }

  follow(target) {
    this.followTarget = target ?? null;
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

    const minX = halfWidth;
    const maxX = Math.max(minX, this.worldWidth - halfWidth);
    const minY = halfHeight;
    const maxY = Math.max(minY, this.worldHeight - halfHeight);

    this.x = Math.min(Math.max(this.x, minX), maxX);
    this.y = Math.min(Math.max(this.y, minY), maxY);
  }

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

  zoomIn(factor = 1.1) {
    this.setZoom(this.zoom * factor);
  }

  zoomOut(factor = 1.1) {
    this.setZoom(this.zoom / factor);
  }

  _computeTargetPosition(target) {
    const targetX = Number.isFinite(target?.x) ? target.x : this.x;
    const targetY = Number.isFinite(target?.y) ? target.y : this.y;

    return { x: targetX, y: targetY };
  }

  _clampZoom(zoom) {
    if (!Number.isFinite(zoom)) {
      return this.zoom;
    }
    return Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
  }
}
