/**
 * @file hud.component.js
 * @description HUD component - displays score, UI overlays
 */

import { System } from '../core/system.js';
import { eventBus } from '../utils/event-bus.js';
import { RenderLayer } from '../rendering/render-layer.js';
import { SPRITE_ATLAS } from '../rendering/sprite-atlas.js';

const HUD_COIN_SPRITE = {
  x: SPRITE_ATLAS.simple_coin.x,
  y: SPRITE_ATLAS.simple_coin.y,
  width: SPRITE_ATLAS.simple_coin.width,
  height: SPRITE_ATLAS.simple_coin.height,
  destX: 12,
  destY: 12,
  destWidth: 32,
  destHeight: 32,
};

/**
 * HUDComponent
 * Renders score display and UI elements
 */
export class HUDSystem extends System {
  init() {
    this.score = 0;
    this.timerSeconds = 60;
    this.unsubscribeScore = eventBus.on('score:add', ({ amount = 0 } = {}) => {
      this.score += amount;
    });
    this.unsubscribeTimer = eventBus.on('timer:update', ({ seconds = 0 } = {}) => {
      this.timerSeconds = seconds;
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
      destWidth: HUD_COIN_SPRITE.destWidth,
      destHeight: HUD_COIN_SPRITE.destHeight,
    });

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    renderQueue.flush(ctx);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '32px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${this.score}`, 35, 40);
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.max(0, this.timerSeconds)}`, ctx.canvas.width - 20, 40);
    ctx.restore();
  }

  destroy() {
    if (this.unsubscribeScore) {
      this.unsubscribeScore();
      this.unsubscribeScore = null;
    }
    if (this.unsubscribeTimer) {
      this.unsubscribeTimer();
      this.unsubscribeTimer = null;
    }
  }
}
