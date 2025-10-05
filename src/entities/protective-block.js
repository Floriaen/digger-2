/**
 * @file protective-block.js
 * @description Special block type that protects chests with darkness gradient
 */

import { BLOCK_TYPES } from '../terrain/block-registry.js';

/**
 * Protective block type (extends block registry)
 * Uses type 100 to avoid conflicts with existing types (ROCK is type 6)
 */
export const PROTECTIVE_BLOCK = {
  type: 100, // Unique type ID (not 6 which conflicts with ROCK)
  hp: 10,
  traversable: false,
  diggable: true,
  name: 'protective_block',
  spriteX: 80, // Tile 5 (5 * 16) - dark gray block
  spriteY: 0,
};

/**
 * Create protective block data with darkness intensity
 * @param {number} darknessAlpha - Darkness overlay alpha (0.0 to 1.0)
 * @returns {Object} Block data with darkness property
 */
export function createProtectiveBlock(darknessAlpha) {
  return {
    type: PROTECTIVE_BLOCK.type,
    hp: PROTECTIVE_BLOCK.hp,
    darkness: Math.max(0.2, Math.min(0.8, darknessAlpha)), // Clamp between 0.2-0.8
  };
}

/**
 * Check if block is a protective block
 * @param {Object} blockData - Block data object
 * @returns {boolean}
 */
export function isProtectiveBlock(blockData) {
  return blockData && blockData.type === PROTECTIVE_BLOCK.type && blockData.darkness !== undefined;
}
