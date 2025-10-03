/**
 * @file hud.component.js
 * @description HUD component - displays score, UI overlays
 */

import { Component } from '../core/component.base.js';

/**
 * HUDComponent
 * Renders score display and UI elements
 */
export class HUDComponent extends Component {
  init() {
    this.score = 0;
  }

  update(deltaTime) {
    // TODO: Listen for score events in Milestone 3
  }

  render(ctx) {
    // TODO: Implement HUD rendering in Milestone 0
    // - Gold coin icon
    // - Score text (top-left)
  }

  destroy() {
    // Cleanup if needed
  }
}
