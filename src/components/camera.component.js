/**
 * @file camera.component.js
 * @description Camera component - handles viewport tracking and smooth following
 */

import { Component } from '../core/component.base.js';
import { CAMERA_LERP_FACTOR, CAMERA_OFFSET_Y, CANVAS_WIDTH } from '../utils/config.js';
import { lerp } from '../utils/math.js';

/**
 * CameraComponent
 * Manages viewport position and smooth player tracking
 */
export class CameraComponent extends Component {
  init() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
  }

  update(deltaTime) {
    const player = this.game.components.find((c) => c.constructor.name === 'PlayerComponent');
    if (!player) return;

    // Target: center player horizontally, offset vertically
    this.targetX = CANVAS_WIDTH / 2 - player.x;
    this.targetY = CAMERA_OFFSET_Y - player.y;

    // Smooth lerp
    this.x = lerp(this.x, this.targetX, CAMERA_LERP_FACTOR);
    this.y = lerp(this.y, this.targetY, CAMERA_LERP_FACTOR);
  }

  render(ctx) {
    // Camera doesn't render, it transforms context
  }

  destroy() {
    // Cleanup if needed
  }

  /**
   * Get camera transform for rendering
   * @returns {{x: number, y: number}} Camera offset
   */
  getTransform() {
    return { x: this.x, y: this.y };
  }
}
