/**
 * @file block-registry.js
 * @description Block type definitions and registry - single source of truth for blocks
 */

/**
 * Block type enumeration
 */
export const BLOCK_TYPES = {
  EMPTY: 0,
  MUD_LIGHT: 1,
  MUD_MEDIUM: 2,
  MUD_DARK: 3,
  MUD_DENSE: 4,
  MUD_CORE: 5,
  ROCK: 6,
  RED_FRAME: 7,
  LAVA: 8,
};

/**
 * Block properties registry
 */
const REGISTRY = {
  [BLOCK_TYPES.EMPTY]: {
    hp: 0,
    traversable: true,
    diggable: false,
    color: null,
    name: 'empty',
    spriteX: null,
    spriteY: null,
  },
  [BLOCK_TYPES.MUD_LIGHT]: {
    hp: 1,
    traversable: false,
    diggable: true,
    color: '#A67C52',
    name: 'mud_light',
    spriteX: 16, // Classic mud sprite
    spriteY: 0,
  },
  [BLOCK_TYPES.MUD_MEDIUM]: {
    hp: 2,
    traversable: false,
    diggable: true,
    color: '#8B6444',
    name: 'mud_medium',
    spriteX: 16, // Classic mud sprite
    spriteY: 0,
  },
  [BLOCK_TYPES.MUD_DARK]: {
    hp: 3,
    traversable: false,
    diggable: true,
    color: '#6F4E37',
    name: 'mud_dark',
    spriteX: 16, // Classic mud sprite
    spriteY: 0,
  },
  [BLOCK_TYPES.MUD_DENSE]: {
    hp: 4,
    traversable: false,
    diggable: true,
    color: '#5C4033',
    name: 'mud_dense',
    spriteX: 16, // Classic mud sprite
    spriteY: 0,
  },
  [BLOCK_TYPES.MUD_CORE]: {
    hp: 5,
    traversable: false,
    diggable: true,
    color: '#3E2723',
    name: 'mud_core',
    spriteX: 16, // Classic mud sprite
    spriteY: 0,
  },
  [BLOCK_TYPES.ROCK]: {
    hp: Infinity,
    traversable: false,
    diggable: false,
    color: '#9E9E9E',
    name: 'rock',
    spriteX: 48, // Rock sprite
    spriteY: 0,
  },
  [BLOCK_TYPES.RED_FRAME]: {
    hp: 5,
    traversable: false,
    diggable: true,
    color: '#D32F2F',
    name: 'red_frame',
    spriteX: 32, // Torus sprite
    spriteY: 0,
  },
  [BLOCK_TYPES.LAVA]: {
    hp: Infinity,
    traversable: true, // Player can fall through lava (game over)
    diggable: false,
    color: '#FF6D00',
    name: 'lava',
    spriteX: 64, // Lava sprite (5th position)
    spriteY: 0,
  },
};

/**
 * Get block properties by ID
 * @param {number} blockId - Block type ID
 * @returns {Object} Block properties
 */
export function getBlock(blockId) {
  return REGISTRY[blockId] || REGISTRY[BLOCK_TYPES.EMPTY];
}

/**
 * Check if block is diggable
 * @param {number} blockId - Block type ID
 * @returns {boolean}
 */
export function isDiggable(blockId) {
  return getBlock(blockId).diggable;
}

/**
 * Check if block is traversable (empty)
 * @param {number} blockId - Block type ID
 * @returns {boolean}
 */
export function isTraversable(blockId) {
  return getBlock(blockId).traversable;
}

/**
 * Check if block is solid
 * @param {number} blockId - Block type ID
 * @returns {boolean}
 */
export function isSolid(blockId) {
  return !getBlock(blockId).traversable;
}
