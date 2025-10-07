/**
 * @file render-queue.js
 * @description Minimal render queue that sorts commands by layer/depth.
 */

import { RenderLayer, RENDER_LAYER_SEQUENCE } from './render-layer.js';

const DEFAULT_FILL_STYLE = 'rgba(0, 0, 0, 1)';

export class RenderQueue {
  constructor() {
    this.layerBuckets = new Map();
    this.spriteSheet = null;

    RENDER_LAYER_SEQUENCE.forEach((layer) => {
      this.layerBuckets.set(layer, []);
    });
  }

  /**
   * Provide the sprite sheet used by sprite commands.
   * @param {HTMLImageElement} spriteSheet
   */
  setSpriteSheet(spriteSheet) {
    this.spriteSheet = spriteSheet;
  }

  /**
   * Queue a draw command (sprite or fill rectangle).
   * @param {object} command
   */
  queueDraw(command = {}) {
    const layer = command.layer ?? RenderLayer.TERRAIN_BASE;
    const bucket = this.layerBuckets.get(layer);
    if (!bucket) {
      throw new Error(`RenderQueue: Unknown layer ${layer}`);
    }
    bucket.push({
      layer,
      depth: command.depth ?? 0,
      type: command.type ?? 'sprite',
      spriteX: command.spriteX ?? 0,
      spriteY: command.spriteY ?? 0,
      width: command.width ?? 0,
      height: command.height ?? 0,
      destX: command.destX ?? 0,
      destY: command.destY ?? 0,
      alpha: command.alpha ?? 1.0,
      fillStyle: command.fillStyle ?? DEFAULT_FILL_STYLE,
    });
  }

  /**
   * Flush queued commands to the canvas context.
   * @param {CanvasRenderingContext2D} ctx
   */
  flush(ctx) {
    if (!ctx) return;

    const texture = this.spriteSheet;

    RENDER_LAYER_SEQUENCE.forEach((layer) => {
      const bucket = this.layerBuckets.get(layer);
      if (!bucket || bucket.length === 0) return;

      bucket.sort((a, b) => a.depth - b.depth);

      for (let i = 0; i < bucket.length; i += 1) {
        const command = bucket[i];

        if (command.type === 'fill-rect') {
          this._drawFill(ctx, command);
          continue;
        }

        if (!texture) {
          continue;
        }

        this._drawSprite(ctx, texture, command);
      }

      bucket.length = 0;
    });
  }

  /**
   * Remove any queued commands without drawing.
   */
  clear() {
    this.layerBuckets.forEach((bucket) => {
      bucket.length = 0;
    });
  }

  _drawFill(ctx, command) {
    ctx.save();
    ctx.globalAlpha = command.alpha;
    ctx.fillStyle = command.fillStyle;
    ctx.fillRect(command.destX, command.destY, command.width, command.height);
    ctx.restore();
  }

  _drawSprite(ctx, texture, command) {
    const needsAlpha = command.alpha !== 1.0;
    if (needsAlpha) {
      ctx.save();
      ctx.globalAlpha = command.alpha;
    }

    ctx.drawImage(
      texture,
      command.spriteX,
      command.spriteY,
      command.width,
      command.height,
      command.destX,
      command.destY,
      command.width,
      command.height,
    );

    if (needsAlpha) {
      ctx.restore();
    }
  }
}
