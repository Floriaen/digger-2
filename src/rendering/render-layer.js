/**
 * @file render-layer.js
 * @description Ordered render layer constants for queue-based rendering.
 */

/**
 * Enumerates render layers in the order they should flush.
 */
export const RenderLayer = {
  BACKGROUND: 0,
  TERRAIN_BASE: 1,
  TERRAIN_OVERLAY: 2,
  ENTITIES: 3,
  EFFECTS: 4,
  HUD: 5,
};

export const RENDER_LAYER_SEQUENCE = [
  RenderLayer.BACKGROUND,
  RenderLayer.TERRAIN_BASE,
  RenderLayer.TERRAIN_OVERLAY,
  RenderLayer.ENTITIES,
  RenderLayer.EFFECTS,
  RenderLayer.HUD,
];
