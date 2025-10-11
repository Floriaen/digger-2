/**
 * @file camera.system.js
 * @description Camera system - handles viewport transformation, zoom, smooth following, and bounds
 */

import { System } from '../core/system.js';
import { CAMERA_LERP_FACTOR, CAMERA_OFFSET_Y, CANVAS_WIDTH } from '../utils/config.js';
import { lerp } from '../utils/math.js';

/**
 * CameraSystem
 * Manages viewport position, zoom, smooth entity tracking, and world boundary constraints
 */
export class CameraSystem extends System {
  init() {
    // Position (world offset)
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;

    // Zoom
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.manualZoom = false; // Flag to disable auto-zoom when manually controlled

    // Bounds (world constraints)
    this.bounds = null; // { minX, minY, maxX, maxY } or null for no bounds

    // Follow
    this.followTarget = null; // Entity to follow (or null)
    this.followLerp = CAMERA_LERP_FACTOR; // Interpolation speed
    this.followOffsetX = CANVAS_WIDTH / 2; // Horizontal offset from world origin
    this.followOffsetY = CAMERA_OFFSET_Y; // Vertical offset from world origin

    // Auto-follow player if exists (backward compatibility)
    const player = this.game.components.find((c) => c.constructor.name === 'PlayerSystem');
    if (player) {
      this.follow(player, CAMERA_LERP_FACTOR, CANVAS_WIDTH / 2, CAMERA_OFFSET_Y);
      // Initialize position immediately to prevent jump (only if player has been initialized)
      if (typeof player.x === 'number' && typeof player.y === 'number') {
        // Convert screen-space offset to world-space by dividing by zoom
        this.x = Math.floor((this.followOffsetX / this.zoom) - player.x);
        this.y = Math.floor((this.followOffsetY / this.zoom) - player.y);
        this.targetX = this.x;
        this.targetY = this.y;
      }
    }
  }

  update(_deltaTime) {
    // 1. Smooth zoom interpolation
    this.zoom = lerp(this.zoom, this.targetZoom, 0.1);

    // 2. Calculate target position (if following an entity)
    if (this.followTarget) {
      // Validate follow target has valid position
      if (Number.isNaN(this.followTarget.x) || Number.isNaN(this.followTarget.y)) {
        const { x, y } = this.followTarget;
        throw new Error(`CameraSystem: followTarget has invalid position: x=${x}, y=${y}`);
      }

      // Target: center entity at follow offset position
      // Convert screen-space offset to world-space by dividing by zoom
      this.targetX = (this.followOffsetX / this.zoom) - this.followTarget.x;
      this.targetY = (this.followOffsetY / this.zoom) - this.followTarget.y;

      // 3. Apply bounds clamping (if bounds exist)
      if (this.bounds) {
        const viewportWidth = this.game.canvas.width / this.zoom;
        const viewportHeight = this.game.canvas.height / this.zoom;

        // Horizontal clamping
        const terrainWidth = this.bounds.maxX - this.bounds.minX;
        if (terrainWidth >= viewportWidth) {
          // Terrain wider than viewport: clamp camera to keep viewport within terrain
          // targetX is negative offset, so: -targetX = left edge of viewport
          this.targetX = this._clamp(
            this.targetX,
            -(this.bounds.maxX - viewportWidth), // Right edge limit
            -this.bounds.minX, // Left edge limit
          );
        } else {
          // Terrain narrower than viewport: center terrain in viewport (ignore follow target X)
          const terrainCenterX = (this.bounds.minX + this.bounds.maxX) / 2;
          this.targetX = (this.game.canvas.width / 2 / this.zoom) - terrainCenterX;
        }

        // Vertical clamping
        const terrainHeight = this.bounds.maxY - this.bounds.minY;
        if (terrainHeight >= viewportHeight) {
          this.targetY = this._clamp(
            this.targetY,
            -(this.bounds.maxY - viewportHeight), // Bottom edge limit
            -this.bounds.minY, // Top edge limit
          );
        } else {
          // Terrain shorter than viewport: center terrain vertically
          const terrainCenterY = (this.bounds.minY + this.bounds.maxY) / 2;
          this.targetY = (this.game.canvas.height / 2 / this.zoom) - terrainCenterY;
        }
      }
    }

    // 4. Smooth lerp to target position
    this.x = lerp(this.x, this.targetX, this.followLerp);
    this.y = lerp(this.y, this.targetY, this.followLerp);
  }

  /**
   * Clamp a value between min and max
   * @private
   */
  _clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
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
      finalZoom = zoomLevels.reduce((prev, curr) => {
        const currentDiff = Math.abs(curr - this.zoom);
        const previousDiff = Math.abs(prev - this.zoom);
        return currentDiff < previousDiff ? curr : prev;
      });
    }

    return {
      x: Math.floor(this.x),
      y: Math.floor(this.y),
      zoom: finalZoom,
    };
  }

  /**
   * Set world bounds - camera viewport cannot exceed these limits
   * @param {number} minX - Minimum world X coordinate
   * @param {number} minY - Minimum world Y coordinate
   * @param {number} maxX - Maximum world X coordinate
   * @param {number} maxY - Maximum world Y coordinate
   */
  setBounds(minX, minY, maxX, maxY) {
    this.bounds = {
      minX, minY, maxX, maxY,
    };
  }

  /**
   * Set zoom level
   * @param {number} zoom - Target zoom level
   */
  setZoom(zoom) {
    this.targetZoom = zoom;
  }

  /**
   * Follow an entity with smooth interpolation
   * @param {object|null} entity - Entity to follow (must have x, y properties), or null to stop
   * @param {number} lerpFactor - Interpolation speed (0-1, default 0.1)
   * @param {number} offsetX - Horizontal offset from world origin (default: canvas center)
   * @param {number} offsetY - Vertical offset from world origin (default: CAMERA_OFFSET_Y)
   */
  follow(entity, lerpFactor = CAMERA_LERP_FACTOR, offsetX = null, offsetY = null) {
    this.followTarget = entity;
    this.followLerp = lerpFactor;
    this.followOffsetX = offsetX !== null ? offsetX : this.game.canvas.width / 2;
    this.followOffsetY = offsetY !== null ? offsetY : CAMERA_OFFSET_Y;
  }
}
