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
    // Score events will be implemented in Milestone 3
  }

  render(ctx) {
    // Coin icon (simple circle placeholder)
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(20, 20, 8, 0, Math.PI * 2);
    ctx.fill();

    // Score text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px monospace';
    ctx.fillText(`${this.score}`, 35, 25);
  }

  destroy() {
    // Cleanup if needed
  }
}
