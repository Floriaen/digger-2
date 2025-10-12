/**
 * @file viewport.js
 * @description Viewport system - handles coordinate transformations between world and screen space
 */

/**
 * Viewport
 * Manages the transformation from world coordinates to screen coordinates.
 * Separates concerns: Camera tracks position in world, Viewport handles screen positioning.
 */
export class Viewport {
  /**
   * @param {number} canvasWidth - Canvas width in pixels
   * @param {number} canvasHeight - Canvas height in pixels
   * @param {number} worldWidth - World width in pixels
   * @param {number} worldHeight - World height in pixels
   */
  constructor(canvasWidth, canvasHeight, worldWidth, worldHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;

    // Positioning strategy: no offset (terrain centered by camera)
    // Offset is in screen space, not world space
    this.offsetX = 0;
    this.offsetY = 0;
  }

  /**
   * Update viewport dimensions (call on canvas resize)
   * @param {number} canvasWidth - New canvas width
   * @param {number} canvasHeight - New canvas height
   */
  updateDimensions(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  /**
   * Apply viewport transform to canvas context
   * Transforms world coordinates to screen coordinates with camera offset
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {CameraSystem} camera - Camera with position and zoom
  */
  applyTransform(ctx, camera) {
    // Transform matrix:
    // 1. Scale by zoom
    // 2. Translate to center camera in viewport
    // 3. Apply viewport offset for terrain positioning (in screen space, not scaled by zoom)
    const transform = this._getTransform(camera);
    ctx.setTransform(
      transform.scaleX,
      0,
      0,
      transform.scaleY,
      transform.translateX,
      transform.translateY,
    );
  }

  /**
   * Convert screen coordinates to world coordinates
   * Useful for mouse/touch input handling
   * @param {number} screenX - Screen X coordinate (canvas pixels)
   * @param {number} screenY - Screen Y coordinate (canvas pixels)
   * @param {CameraSystem} camera - Camera with position and zoom
   * @returns {{x: number, y: number}} World coordinates
   */
  screenToWorld(screenX, screenY, camera) {
    const transform = this._getTransform(camera);
    const worldX = (screenX - transform.translateX) / transform.scaleX;
    const worldY = (screenY - transform.translateY) / transform.scaleY;

    return { x: worldX, y: worldY };
  }

  /**
   * Convert world coordinates to screen coordinates
   * Useful for debugging and UI positioning
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @param {CameraSystem} camera - Camera with position and zoom
   * @returns {{x: number, y: number}} Screen coordinates
   */
  worldToScreen(worldX, worldY, camera) {
    const transform = this._getTransform(camera);
    const screenX = worldX * transform.scaleX + transform.translateX;
    const screenY = worldY * transform.scaleY + transform.translateY;

    return { x: screenX, y: screenY };
  }

  /**
   * Set terrain positioning offsets (in screen space, not affected by zoom)
   * @param {number} offsetX - Horizontal offset in screen pixels (positive = right)
   * @param {number} offsetY - Vertical offset in screen pixels (positive = down)
   */
  setTerrainOffset(offsetX, offsetY) {
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  /**
   * Center terrain horizontally in viewport (deprecated - player already centered by camera)
   * This method is kept for backwards compatibility but has no effect with zoom-independent offsets
   */
  centerTerrainHorizontally() {
    // With zoom-independent offsets and camera following player,
    // terrain is already centered. This method is a no-op.
    this.offsetX = 0;
  }

  /**
   * Position terrain at specific Y coordinate (in screen space)
   * @param {number} y - Y position in screen pixels
   */
  setTerrainY(y) {
    this.offsetY = y;
  }

  /**
   * Compute the current viewport transform, snapping translation to whole pixels
   * to avoid sub-pixel seams between tiles.
   * @param {CameraSystem} camera
   * @returns {{scaleX: number, scaleY: number, translateX: number, translateY: number}}
   * @private
   */
  _getTransform(camera) {
    const scaleX = camera.zoom;
    const scaleY = camera.zoom;
    const translateX = Math.round(
      (this.canvasWidth / 2 + this.offsetX) - camera.x * scaleX,
    );
    const translateY = Math.round(
      (this.canvasHeight / 2 + this.offsetY) - camera.y * scaleY,
    );

    return {
      scaleX,
      scaleY,
      translateX,
      translateY,
    };
  }
}
