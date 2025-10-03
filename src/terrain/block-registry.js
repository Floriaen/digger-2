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
  },
  [BLOCK_TYPES.MUD_LIGHT]: {
    hp: 1,
    traversable: false,
    diggable: true,
    color: '#A67C52',
    name: 'mud_light',
  },
  [BLOCK_TYPES.MUD_MEDIUM]: {
    hp: 2,
    traversable: false,
    diggable: true,
    color: '#8B6444',
    name: 'mud_medium',
  },
  [BLOCK_TYPES.MUD_DARK]: {
    hp: 3,
    traversable: false,
    diggable: true,
    color: '#6F4E37',
    name: 'mud_dark',
  },
  [BLOCK_TYPES.MUD_DENSE]: {
    hp: 4,
    traversable: false,
    diggable: true,
    color: '#5C4033',
    name: 'mud_dense',
  },
  [BLOCK_TYPES.MUD_CORE]: {
    hp: 5,
    traversable: false,
    diggable: true,
    color: '#3E2723',
    name: 'mud_core',
  },
  [BLOCK_TYPES.ROCK]: {
    hp: Infinity,
    traversable: false,
    diggable: false,
    color: '#9E9E9E',
    name: 'rock',
  },
  [BLOCK_TYPES.RED_FRAME]: {
    hp: 5,
    traversable: false,
    diggable: true,
    color: '#D32F2F',
    name: 'red_frame',
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
