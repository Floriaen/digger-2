/**
 * @file sprite-atlas.js
 * @description Sprite sheet coordinate mapping for sprite.png
 */

const MUD_VARIANTS = [
  {
    x: 16,
    y: 0,
    width: 16,
    height: 25,
  },
  {
    x: 16,
    y: 0,
    width: 16,
    height: 25,
  },
  {
    x: 16,
    y: 0,
    width: 16,
    height: 25,
  },
  {
    x: 16,
    y: 0,
    width: 16,
    height: 25,
  },
  {
    x: 16,
    y: 0,
    width: 16,
    height: 25,
  },
];

/**
 * Sprite atlas coordinates
 * Maps sprite names to {x, y, width, height} in sprite.png
 */
export const SPRITE_ATLAS = {
  // TODO: Map actual sprite coordinates in Milestone 0 after analyzing sprite.png
  // This will be filled when we integrate the sprite sheet

  // Blocks (fake-3D tiles: 16x25px with 16x9px cap)
  grass: {
    x: 0,
    y: 0,
    width: 16,
    height: 25,
  },
  mud_variants: MUD_VARIANTS,
  mud_light: MUD_VARIANTS[0],
  mud_medium: MUD_VARIANTS[1],
  mud_dark: MUD_VARIANTS[2],
  mud_dense: MUD_VARIANTS[3],
  mud_core: MUD_VARIANTS[4],
  rock: {
    x: 48,
    y: 0,
    width: 16,
    height: 25,
  },
  death: {
    x: 64,
    y: 50,
    width: 16,
    height: 25,
  },
  door: {
    x: 64,
    y: 75,
    width: 16,
    height: 25,
  },
  doorstep: {
    x: 48,
    y: 0,
    width: 16,
    height: 25,
  },
  support: {
    x: 80,
    y: 50,
    width: 16,
    height: 25,
  },
  column: {
    x: 80,
    y: 50,
    width: 16,
    height: 25,
  },
  red_frame: {
    x: 32,
    y: 0,
    width: 16,
    height: 25,
  },
  lava: {
    x: 32,
    y: 0,
    width: 16,
    height: 25,
  },
  chest_base: {
    x: 64,
    y: 0,
    width: 16,
    height: 25,
  },
  chest_cover: {
    x: 9,
    y: 25,
    width: 23,
    height: 25,
    offsetX: -4,
    offsetY: 0,
  },
  pause_crystal: {
    x: 64,
    y: 24,
    width: 16,
    height: 25,
  },
  protective_block: {
    x: 80,
    y: 0,
    width: 16,
    height: 25,
  },

  // Navigation markers (white arrows in row 3)
  triangle_left: {
    x: 0,
    y: 50,
    width: 16,
    height: 25,
  },
  triangle_down: {
    x: 16,
    y: 50,
    width: 16,
    height: 25,
  },
  triangle_right: {
    x: 32,
    y: 50,
    width: 16,
    height: 25,
  },
};

/**
 * Load sprite sheet image
 * @returns {Promise<HTMLImageElement>}
 */
export function loadSpriteSheet() {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = './Sprite/sprite.png';
  });
}
