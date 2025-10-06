import { Component } from '../../core/component.js';
import { TILE_WIDTH, SPRITE_HEIGHT, TILE_CAP_HEIGHT } from '../../utils/config.js';

/**
 * DarknessComponent
 *
 * Applies a darkness overlay to the block rendering.
 * Used by mud blocks for visual variety and protective blocks for depth gradient.
 */
export class DarknessComponent extends Component {
  constructor({ alpha }) {
    super({ alpha });
  }

  /**
   * Render darkness overlay on the block
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} screenX - Screen X position
   * @param {number} screenY - Screen Y position
   */
  render(ctx, screenX, screenY) {
    if (this.alpha <= 0) return;

    const spriteY = screenY - TILE_CAP_HEIGHT;
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${this.alpha})`;
    ctx.fillRect(screenX, spriteY, TILE_WIDTH, SPRITE_HEIGHT);
    ctx.restore();
  }
}
