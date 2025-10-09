import { Component } from '../../core/component.js';
import { TILE_WIDTH, SPRITE_HEIGHT } from '../../utils/config.js';
import { RenderLayer } from '../../rendering/render-layer.js';

const DEFAULT_LAYER = {
  width: TILE_WIDTH,
  height: SPRITE_HEIGHT,
  offsetX: 0,
  offsetY: 0,
};

function normalizeLayer(layer = {}) {
  return {
    spriteX: layer.spriteX,
    spriteY: layer.spriteY,
    width: layer.width ?? DEFAULT_LAYER.width,
    height: layer.height ?? DEFAULT_LAYER.height,
    offsetX: layer.offsetX ?? 0,
    offsetY: layer.offsetY ?? 0,
    depthOffset: layer.depthOffset ?? 0,
    layer: layer.layer !== undefined ? layer.layer : null,
    alpha: layer.alpha ?? 1.0,
  };
}

/**
 * RenderComponent
 *
 * Defines visual representation of a block.
 * Can render a single sprite or multiple sprites stacked vertically.
 * - Single sprite: { spriteX, spriteY }
 * - Multiple sprites: { layers: [{ spriteX, spriteY }, ...] }
 */
export class RenderComponent extends Component {
  constructor({
    spriteX,
    spriteY,
    spriteWidth,
    spriteHeight,
    offsetX = 0,
    offsetY = 0,
    layers,
    layer = RenderLayer.TERRAIN_BASE,
    depthOffset = 0,
  }) {
    let resolvedLayers;

    if (Array.isArray(layers) && layers.length > 0) {
      resolvedLayers = layers.map(normalizeLayer);
    } else if (typeof spriteX === 'number' && typeof spriteY === 'number') {
      resolvedLayers = [
        normalizeLayer({
          spriteX,
          spriteY,
          width: spriteWidth,
          height: spriteHeight,
          offsetX,
          offsetY,
        }),
      ];
    } else {
      resolvedLayers = [];
    }

    const baseLayer = resolvedLayers[0] ?? null;

    super({
      layers: resolvedLayers,
      spriteX: baseLayer?.spriteX ?? spriteX,
      spriteY: baseLayer?.spriteY ?? spriteY,
      spriteWidth: baseLayer?.width ?? spriteWidth ?? DEFAULT_LAYER.width,
      spriteHeight: baseLayer?.height ?? spriteHeight ?? DEFAULT_LAYER.height,
      offsetX: baseLayer?.offsetX ?? offsetX,
      offsetY: baseLayer?.offsetY ?? offsetY,
      layer,
      depthOffset,
    });
  }

  /**
   * Check if this is a sprite stack (multiple layers)
   * @returns {boolean}
   */
  isSpriteStack() {
    return Array.isArray(this.layers) && this.layers.length > 1;
  }

  /**
   * Get all sprite layers (bottom to top)
   * For single sprite, returns array with one item
   * @returns {Array<{spriteX: number, spriteY: number}>}
   */
  getLayers() {
    if (Array.isArray(this.layers) && this.layers.length > 0) {
      return this.layers;
    }

    if (typeof this.spriteX === 'number' && typeof this.spriteY === 'number') {
      return [
        normalizeLayer({
          spriteX: this.spriteX,
          spriteY: this.spriteY,
          width: this.spriteWidth,
          height: this.spriteHeight,
          offsetX: this.offsetX,
          offsetY: this.offsetY,
        }),
      ];
    }

    return [];
  }

  /**
   * Get the base (terrain) sprite layer.
   * @returns {{spriteX: number, spriteY: number} | null}
   */
  getBaseLayer() {
    const layers = this.getLayers();
    return layers[0] ?? null;
  }

  /**
   * Get overlay layers rendered above the terrain base.
   * Preserves declaration order so later sprites draw in front.
   * @returns {Array<{spriteX: number, spriteY: number}>}
   */
  getOverlayLayers() {
    const layers = this.getLayers();
    if (layers.length <= 1) {
      return [];
    }
    return layers.slice(1);
  }

  /**
   * Get number of layers
   * @returns {number}
   */
  getLayerCount() {
    return this.getLayers().length;
  }
}
