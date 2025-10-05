/**
 * @file config.js
 * @description Centralized game configuration constants
 */

// Canvas & Rendering (responsive - will be updated based on viewport)
export let CANVAS_WIDTH = 800;
export let CANVAS_HEIGHT = 600;
export const TARGET_FPS = 60;

/**
 * Update canvas dimensions (called from main.js on resize)
 * @param {number} width
 * @param {number} height
 */
export function updateCanvasDimensions(width, height) {
  CANVAS_WIDTH = width;
  CANVAS_HEIGHT = height;
}

// Tile Dimensions (from spec: 16x25px with 16x9px cap)
export const TILE_WIDTH = 16;
export const TILE_HEIGHT = 16; // Collision box height (square base only)
export const SPRITE_HEIGHT = 25; // Full sprite height (16px base + 9px cap)
export const TILE_CAP_HEIGHT = 9;
export const TILE_BASE_HEIGHT = 16; // Collision box height (excludes cap)

// Player
export const DIG_INTERVAL_MS = 40; // Time per HP point (200ms = 1 second for HP=5)
export const PLAYER_RADIUS = 5;

// Terrain
export const CHUNK_SIZE = 32; // 32x32 blocks per chunk
export const CHUNK_CACHE_LIMIT = 10; // Max cached chunks

// Physics
export const GRAVITY = 0.5;
export const FALL_SPEED_MAX = 10;

// Camera
export const CAMERA_LERP_FACTOR = 0.1;
export const CAMERA_OFFSET_Y = 200; // Player offset from top

// Debug
export const DEBUG_MODE = true;
export const SHOW_CHUNK_BOUNDS = false;
export const SHOW_HP_HEATMAP = false;
