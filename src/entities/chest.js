/**
 * @file chest.js
 * @description Chest entity that contains collectible coins
 */

/**
 * Chest entity type
 */
export const CHEST = {
  type: 5, // Sprite tile 5
  hp: 15,
  traversable: false,
  diggable: true,
  name: 'chest',
  spriteX: 80, // Tile 5 (5 * 16)
  spriteY: 0,
  coinValue: 10, // Score value when collected
};

/**
 * Create chest block data
 * @param {number} x - Grid X position
 * @param {number} y - Grid Y position
 * @returns {Object} Chest block data
 */
export function createChest(x, y) {
  return {
    type: CHEST.type,
    hp: CHEST.hp,
    isChest: true,
    gridX: x,
    gridY: y,
  };
}

/**
 * Check if block is a chest
 * @param {Object} blockData - Block data object
 * @returns {boolean}
 */
export function isChest(blockData) {
  return blockData && blockData.isChest === true;
}
