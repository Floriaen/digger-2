/**
 * @file config.js
 * @description Centralized game configuration constants
 */

// Canvas & Rendering
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const TARGET_FPS = 60;

// Tile Dimensions (from spec: 16x25px with 16x9px cap)
export const TILE_WIDTH = 16;
export const TILE_HEIGHT = 25;
export const TILE_CAP_HEIGHT = 9;

// Player
export const DIG_INTERVAL_MS = 600;
export const PLAYER_RADIUS = 8;

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
