/**
 * @file camera.system.js
 * @description Camera system - manages viewport transforms and smooth following
 */

import { System } from '../core/system.js';
import {
  CAMERA_LERP_FACTOR,
  CAMERA_OFFSET_Y,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
} from '../utils/config.js';
import { lerp } from '../utils/math.js';

const ZOOM_LERP_FACTOR = 0.1;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3.0;

/**
 * CameraSystem
 * Smoothly follows a target and applies canvas transforms.
 *
 * NOTE: `getTransform()` remains temporarily for legacy callers.
 */
export class CameraSystem extends System {
  constructor(game) {
    super(game);

    this.x = 0; // Camera center X in world space
    this.y = 0; // Camera center Y in world space
    this.zoom = 3.0;
    this.targetZoom = 3.0;
    this.manualZoom = false;

    this.followTarget = null;
    this.smoothing = CAMERA_LERP_FACTOR;

    this.worldWidth = Number.POSITIVE_INFINITY;
    this.worldHeight = Number.POSITIVE_INFINITY;

    this.legacyTransform = {
      x: 0,
      y: 0,
      zoom: this.zoom,
    };
  }

  init() {
    const player = this._findPlayer();
    if (player) {
      this.follow(player, this.smoothing);
      this._snapToTarget(player);
    } else {
      // Default to canvas center until a target becomes available
      this._snapToCanvasCenter();
    }
  }

  update(_deltaTime) {
    const target = this.followTarget ?? this._findPlayer();
    if (target && !this.followTarget) {
      this.follow(target, this.smoothing);
      this._snapToTarget(target);
    }

    if (target) {
      const { x: targetX, y: targetY } = this._computeTargetPosition(target);
      this.x = lerp(this.x, targetX, this._resolvedSmoothing());
      this.y = lerp(this.y, targetY, this._resolvedSmoothing());
    }

    this.zoom = lerp(this.zoom, this.targetZoom, ZOOM_LERP_FACTOR);

    this._clampToWorldInternal(this._getCanvas());
    this._updateLegacyTransform();
  }

  render() {
    // Camera does not render directly; it manipulates the context transform.
  }

  destroy() {
    this.followTarget = null;
  }

  follow(target, smoothing = CAMERA_LERP_FACTOR) {
    this.followTarget = target ?? null;
    if (Number.isFinite(smoothing)) {
      this.smoothing = Math.min(Math.max(smoothing, 0), 1);
    }
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

  /**
   * Temporary legacy accessor for systems still using manual transforms.
   * @returns {{x: number, y: number, zoom: number}}
   */
  getTransform() {
    return { ...this.legacyTransform };
  }

  setZoom(zoom) {
    this.manualZoom = true;
    this.targetZoom = this._clampZoom(zoom);
  }

  zoomIn(factor = 1.1) {
    this.setZoom(this.zoom * factor);
  }

  zoomOut(factor = 1.1) {
    this.setZoom(this.zoom / factor);
  }

  _resolvedSmoothing() {
    return Math.min(Math.max(this.smoothing, 0), 1);
  }

  _snapToTarget(target) {
    const { x: targetX, y: targetY } = this._computeTargetPosition(target);
    this.x = targetX;
    this.y = targetY;
    this.zoom = this._clampZoom(this.targetZoom);
    this._updateLegacyTransform();
  }

  _snapToCanvasCenter() {
    const canvas = this._getCanvas();
    const width = canvas?.width ?? CANVAS_WIDTH;
    const height = canvas?.height ?? CANVAS_HEIGHT;
    this.x = width / 2;
    this.y = height / 2;
    this._updateLegacyTransform();
  }

  _computeTargetPosition(target) {
    const canvas = this._getCanvas();
    const canvasWidth = canvas?.width ?? CANVAS_WIDTH;
    const canvasHeight = canvas?.height ?? CANVAS_HEIGHT;
    const verticalOffsetFromCenter = canvasHeight / 2 - CAMERA_OFFSET_Y;

    const targetX = Number.isFinite(target?.x) ? target.x : canvasWidth / 2;
    const targetY = Number.isFinite(target?.y)
      ? target.y + verticalOffsetFromCenter
      : canvasHeight / 2;

    return { x: targetX, y: targetY };
  }

  _updateLegacyTransform() {
    const canvas = this._getCanvas();
    const canvasWidth = canvas?.width ?? CANVAS_WIDTH;
    const canvasHeight = canvas?.height ?? CANVAS_HEIGHT;

    this.legacyTransform = {
      x: Math.floor(-this.x + canvasWidth / 2),
      y: Math.floor(-this.y + canvasHeight / 2),
      zoom: this._quantizeZoom(this.zoom),
    };
  }

  _clampZoom(zoom) {
    if (!Number.isFinite(zoom)) return this.zoom;
    return Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
  }

  _quantizeZoom(value) {
    const zoomLevels = [
      1.0,
      1.5,
      2.0,
      2.5,
      3.0,
      3.5,
      4.0,
      4.5,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
    ];
    return zoomLevels.reduce((prev, curr) => {
      const currentDiff = Math.abs(curr - value);
      const previousDiff = Math.abs(prev - value);
      return currentDiff < previousDiff ? curr : prev;
    }, zoomLevels[0]);
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
