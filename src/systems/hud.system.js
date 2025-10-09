/**
 * @file hud.component.js
 * @description HUD component - displays score, UI overlays
 */

import { System } from "../core/system.js';
import { eventBus } from '../utils/event-bus.js';
import { RenderLayer } from '../rendering/render-layer.js';

const HUD_COIN_SPRITE = {
  x: 48,
  y: 50,
  width: 16,
  height: 16,
  destX: 12,
  destY: 12,
};

/**
 * HUDComponent
 * Renders score display and UI elements
 */
export class HUDSystem extends System {
  init() {
    this.score = 0;
    this.unsubscribeScore = eventBus.on('score:add', ({ amount = 0 } = {}) => {
      this.score += amount;
    });
  }

  update(_deltaTime) {
    // Score events will be implemented in Milestone 3
  }

  render(ctx) {
    const { renderQueue } = this.game;
    if (!renderQueue) return;

    renderQueue.queueDraw({
      layer: RenderLayer.HUD,
      spriteX: HUD_COIN_SPRITE.x,
      spriteY: HUD_COIN_SPRITE.y,
      width: HUD_COIN_SPRITE.width,
      height: HUD_COIN_SPRITE.height,
      destX: HUD_COIN_SPRITE.destX,
      destY: HUD_COIN_SPRITE.destY,
    });

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    renderQueue.flush(ctx);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px monospace';
    ctx.fillText(`${this.score}`, 35, 25);
    ctx.restore();
  }

  destroy() {
    if (this.unsubscribeScore) {
      this.unsubscribeScore();
      this.unsubscribeScore = null;
    }
  }
}
