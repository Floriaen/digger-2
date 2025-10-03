/**
 * @file sprite-atlas.js
 * @description Sprite sheet coordinate mapping for sprite.png
 */

/**
 * Sprite atlas coordinates
 * Maps sprite names to {x, y, width, height} in sprite.png
 */
export const SPRITE_ATLAS = {
  // TODO: Map actual sprite coordinates in Milestone 0 after analyzing sprite.png
  // This will be filled when we integrate the sprite sheet

  // Player
  player_ball: { x: 0, y: 0, width: 16, height: 16 },

  // Blocks (fake-3D tiles: 16x25px with 16x9px cap)
  mud_light: { x: 0, y: 0, width: 16, height: 25 },
  mud_medium: { x: 16, y: 0, width: 16, height: 25 },
  mud_dark: { x: 32, y: 0, width: 16, height: 25 },
  mud_dense: { x: 48, y: 0, width: 16, height: 25 },
  mud_core: { x: 64, y: 0, width: 16, height: 25 },
  rock: { x: 80, y: 0, width: 16, height: 25 },
  red_frame: { x: 96, y: 0, width: 16, height: 25 },

  // UI
  coin_icon: { x: 0, y: 0, width: 16, height: 16 },

  // Navigation markers
  triangle_left: { x: 0, y: 0, width: 8, height: 8 },
  triangle_right: { x: 8, y: 0, width: 8, height: 8 },
  triangle_down: { x: 16, y: 0, width: 8, height: 8 },
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
