/**
 * @file camera.system.js
 * @description Camera system - manages viewport transforms and smooth following
 */

import { System } from '../core/system.js';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../utils/config.js';
import { lerp } from '../utils/math.js';

const ZOOM_LERP_FACTOR = 0.1;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3.0;
const FOLLOW_LERP = 0.1;

/**
 * CameraSystem
 * Smoothly follows a target and applies canvas transforms.
 */
export class CameraSystem extends System {
  constructor(game) {
    super(game);

    this.x = 0; // Camera center X in world space
    this.y = 0; // Camera center Y in world space
    this.zoom = 3.0;
    this.targetZoom = 3.0;

    this.followTarget = null;

    this.worldWidth = Number.POSITIVE_INFINITY;
    this.worldHeight = Number.POSITIVE_INFINITY;
  }

  init() {
    const player = this._findPlayer();
    if (player) {
      this.follow(player);
      const { x: targetX, y: targetY } = this._computeTargetPosition(player);
      this.x = targetX;
      this.y = targetY;
      this.zoom = this._clampZoom(this.targetZoom);
    } else {
      // Default to canvas center until a target becomes available
      this._snapToCanvasCenter();
    }
  }

  update(_deltaTime) {
    const target = this.followTarget ?? this._findPlayer();
    if (target && !this.followTarget) {
      this.follow(target);
      const { x: targetX, y: targetY } = this._computeTargetPosition(target);
      this.x = targetX;
      this.y = targetY;
      this.zoom = this._clampZoom(this.targetZoom);
    }

    if (target) {
      const { x: targetX, y: targetY } = this._computeTargetPosition(target);
      this.x = lerp(this.x, targetX, FOLLOW_LERP);
      this.y = lerp(this.y, targetY, FOLLOW_LERP);
    }

    this.zoom = lerp(this.zoom, this.targetZoom, ZOOM_LERP_FACTOR);

    this._clampToWorldInternal(this._getCanvas());
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
    if (!ctx) return;
    const targetCanvas = canvas ?? ctx.canvas ?? this._getCanvas();
    if (!targetCanvas) return;

    this.clampToWorld(targetCanvas);
    ctx.setTransform(
      this.zoom,
      0,
      0,
      this.zoom,
      targetCanvas.width / 2 - this.x * this.zoom,
      targetCanvas.height / 2 - this.y * this.zoom,
    );
  }

  resetTransform(ctx) {
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  clampToWorld(canvas) {
    this._clampToWorldInternal(canvas);
  }

  getViewBounds(canvas) {
    const targetCanvas = canvas ?? this._getCanvas();
    const canvasWidth = targetCanvas?.width ?? CANVAS_WIDTH;
    const canvasHeight = targetCanvas?.height ?? CANVAS_HEIGHT;

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
    this.targetZoom = this._clampZoom(zoom);
  }

  zoomIn(factor = 1.1) {
    this.setZoom(this.zoom * factor);
  }

  zoomOut(factor = 1.1) {
    this.setZoom(this.zoom / factor);
  }

  _snapToCanvasCenter() {
    const canvas = this._getCanvas();
    const width = canvas?.width ?? CANVAS_WIDTH;
    const height = canvas?.height ?? CANVAS_HEIGHT;
    this.x = width / 2;
    this.y = height / 2;
  }

  _computeTargetPosition(target) {
    const canvas = this._getCanvas();
    const fallbackX = canvas?.width ? canvas.width / 2 : CANVAS_WIDTH / 2;
    const fallbackY = canvas?.height ? canvas.height / 2 : CANVAS_HEIGHT / 2;

    const targetX = Number.isFinite(target?.x) ? target.x : fallbackX;
    const targetY = Number.isFinite(target?.y) ? target.y : fallbackY;

    return { x: targetX, y: targetY };
  }

  _clampZoom(zoom) {
    if (!Number.isFinite(zoom)) return this.zoom;
    return Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
  }

  _clampToWorldInternal(canvas) {
    if (!canvas) return;
    if (!Number.isFinite(this.worldWidth) || !Number.isFinite(this.worldHeight)) {
      return;
    }

    const halfWidth = canvas.width / (2 * this.zoom);
    const halfHeight = canvas.height / (2 * this.zoom);

    const minX = halfWidth;
    const maxX = Math.max(minX, this.worldWidth - halfWidth);
    const minY = halfHeight;
    const maxY = Math.max(minY, this.worldHeight - halfHeight);

    this.x = Math.min(Math.max(this.x, minX), maxX);
    this.y = Math.min(Math.max(this.y, minY), maxY);
  }

  _getCanvas() {
    return this.game?.canvas ?? null;
  }

  _findPlayer() {
    return this.game.components.find((c) => c.constructor.name === 'PlayerSystem') ?? null;
  }
}
