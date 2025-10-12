import { System } from '../core/system.js';
import { Block } from '../entities/block.entity.js';
import { RenderComponent } from '../components/block/render.component.js';
import { LootEffectComponent } from '../components/block/loot-effect.component.js';
import { CollectableComponent } from '../components/block/collectable.component.js';
import { RenderLayer } from '../rendering/render-layer.js';
import { eventBus } from '../utils/event-bus.js';
import { TILE_HEIGHT, TILE_WIDTH, SPRITE_HEIGHT } from '../utils/config.js';

const COIN_SPRITE = {
  x: 48,
  y: 50,
  size: 16,
};

const DEFAULT_DURATION = 700;

/**
 * CoinEffectSystem
 *
 * Spawns and animates floating coin visuals when chests drop loot.
 */
export class CoinEffectSystem extends System {
  init() {
    this.effects = [];
    this.unsubscribeLoot = eventBus.on('block:loot', (payload) => this._handleLootEvent(payload));
  }

  update(deltaTime) {
    if (!this.effects.length) return;

    const remaining = [];

    for (let i = 0; i < this.effects.length; i += 1) {
      const effect = this.effects[i];
      const state = effect.get(LootEffectComponent);
      if (!state) {
        continue;
      }

      state.elapsed += deltaTime;
      state.worldY += state.velocityY * deltaTime;
      const progress = Math.min(state.elapsed / state.duration, 1);
      state.alpha = Math.max(1 - progress, 0);

      if (state.elapsed < state.duration) {
        remaining.push(effect);
      }
    }

    this.effects = remaining;
  }

  render(ctx) {
    if (!this.effects.length) return;

    const terrain = this._getTerrain();

    if (!terrain || !terrain.spriteSheet) return;

    const texture = terrain.spriteSheet;

    for (let i = 0; i < this.effects.length; i += 1) {
      const effect = this.effects[i];
      const render = effect.get(RenderComponent);
      const state = effect.get(LootEffectComponent);

      if (!render || !state || state.alpha <= 0) {
        continue;
      }

      ctx.save();
      ctx.globalAlpha = state.alpha;
      ctx.drawImage(
        texture,
        render.spriteX,
        render.spriteY,
        render.spriteWidth,
        render.spriteHeight,
        state.worldX,
        state.worldY,
        render.spriteWidth,
        render.spriteHeight,
      );
      ctx.restore();
    }
  }

  destroy() {
    if (this.unsubscribeLoot) {
      this.unsubscribeLoot();
      this.unsubscribeLoot = null;
    }
    this.effects.length = 0;
  }

  _handleLootEvent({ x, y, loot } = {}) {
    if (!Array.isArray(loot) || loot.length === 0) {
      return;
    }

    const coinLoot = loot.filter((item) => item && item.type === 'coin');
    if (coinLoot.length === 0) {
      return;
    }

    for (let i = 0; i < coinLoot.length; i += 1) {
      const coinEffect = this._createCoinEffect(x, y);
      if (!coinEffect) {
        continue;
      }

      this.effects.push(coinEffect);
      this._grantCollectableReward(coinEffect);
    }
  }

  _createCoinEffect(gridX, gridY) {
    if (typeof gridX !== 'number' || typeof gridY !== 'number') {
      return null;
    }

    const tileLeft = gridX * TILE_WIDTH;
    const chestTop = gridY * TILE_HEIGHT - (SPRITE_HEIGHT - TILE_HEIGHT);
    const chestCenterY = chestTop + SPRITE_HEIGHT / 2;
    const coinTop = chestCenterY - COIN_SPRITE.size / 2;

    const renderComponent = new RenderComponent({
      spriteX: COIN_SPRITE.x,
      spriteY: COIN_SPRITE.y,
      spriteWidth: COIN_SPRITE.size,
      spriteHeight: COIN_SPRITE.size,
      layer: RenderLayer.EFFECTS,
    });

    const lootEffect = new LootEffectComponent({
      worldX: tileLeft,
      worldY: coinTop,
      duration: DEFAULT_DURATION,
    });

    const collectable = new CollectableComponent({ score: 1 });

    return new Block([renderComponent, lootEffect, collectable]);
  }

  _grantCollectableReward(effect) {
    const collectable = effect.get(CollectableComponent);
    if (!collectable || collectable.isCollected()) {
      return;
    }

    if (collectable.score > 0) {
      eventBus.emit('score:add', { amount: collectable.score });
    }
    collectable.markCollected();
  }

  _getTerrain() {
    if (!this.cachedTerrain || !this.game.components.includes(this.cachedTerrain)) {
      this.cachedTerrain = this.game.components.find(
        (c) => c.constructor.name === 'TerrainSystem',
      );
    }
    return this.cachedTerrain;
  }
}
