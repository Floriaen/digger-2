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
export const CHUNK_SIZE = 9; // 32x32 blocks per chunk
export const CHUNK_CACHE_LIMIT = 10; // Max cached chunks

// World bounds (in chunks)
export const WORLD_WIDTH_CHUNKS = 1;
export const WORLD_HEIGHT_CHUNKS = 4;

// World dimensions (pixels)
export const WORLD_WIDTH_PX = WORLD_WIDTH_CHUNKS * CHUNK_SIZE * TILE_WIDTH;
export const WORLD_HEIGHT_PX = WORLD_HEIGHT_CHUNKS * CHUNK_SIZE * TILE_HEIGHT;

// Lava configuration (distance from bottom of the world in chunks)
export const LAVA_SURFACE_OFFSET_CHUNKS = 2;

// Door / level transition
export const DOOR_DEPTH_RATIO = 0.75; // Percentage of world height where the door appears
export const DOOR_MIN_DEPTH_TILES = 12; // Ensure the door is placed below the early game layers
export const DOOR_LAVA_CLEARANCE_TILES = 6; // Keep the door platform safely above lava
export const DOOR_STEP_WIDTH = 3;
export const RESET_TIMER_ON_LEVEL = true;

// Physics
export const GRAVITY = 0.5;
export const FALL_SPEED_MAX = 10;

export const CAMERA_OFFSET_Y = 200; // Player offset from top

// Debug
export const DEBUG_MODE = true;
export const SHOW_CHUNK_BOUNDS = false;
export const SHOW_HP_HEATMAP = false;
