/**
 * @file camera.component.js
 * @description Camera component - handles viewport tracking and smooth following
 */

import { Component } from '../core/component.base.js';

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
    // TODO: Implement smooth camera follow in Milestone 0
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
