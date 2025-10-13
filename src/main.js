/**
 * @file main.js
 * @description Entry point - initializes game and components
 */

import { Game } from './core/game.js';
import { Viewport } from './core/viewport.js';
import {
  updateCanvasDimensions,
  WORLD_WIDTH_PX,
  WORLD_HEIGHT_PX,
} from './utils/config.js';
import { BackgroundSystem } from './systems/background.system.js';
import { TerrainSystem } from './systems/terrain.system.js';
import { PlayerSystem } from './systems/player.system.js';
import { ShadowSystem } from './systems/shadow.system.js';
import { NavigationSystem } from './systems/navigation.system.js';
import { DigIndicatorSystem } from './systems/dig-indicator.system.js';
import { CameraSystem } from './systems/camera.system.js';
import { HUDSystem } from './systems/hud.system.js';
import { DebugSystem } from './systems/debug.system.js';
import { TouchInputSystem } from './systems/touch-input.system.js';
import { NPCSystem } from './systems/npc.system.js';
import { InputSystem } from './systems/input.system.js';
import { GravitySystem } from './systems/gravity.system.js';
import { CoinEffectSystem } from './systems/coin-effect.system.js';
import { eventBus } from './utils/event-bus.js';

/**
 * Calculate responsive canvas dimensions for mobile-first design
 * @returns {{width: number, height: number}}
 */
function calculateCanvasDimensions() {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  // Mobile portrait: 9:16 aspect ratio (ideal for phones)
  // Desktop: maintain reasonable size
  const targetAspect = 9 / 16;
  let width = windowWidth;
  let height = windowHeight;

  const currentAspect = width / height;

  if (currentAspect > targetAspect) {
    // Too wide - constrain by height
    width = Math.floor(height * targetAspect);
  } else {
    // Too tall - constrain by width
    height = Math.floor(width / targetAspect);
  }

  // Minimum dimensions for playability
  width = Math.max(width, 360);
  height = Math.max(height, 640);

  // Maximum dimensions for desktop
  width = Math.min(width, 800);
  height = Math.min(height, 1422); // 800 / (9/16)

  return { width, height };
}

/**
 * Resize canvas to fit viewport
 */
function resizeCanvas(canvas, game) {
  const { width, height } = calculateCanvasDimensions();
  canvas.width = width;
  canvas.height = height;
  updateCanvasDimensions(width, height);

  // Update viewport dimensions if it exists
  if (game && game.viewport) {
    game.viewport.updateDimensions(width, height);
  }

  // Restore context state after resize (canvas resize resets context)
  if (game && game.ctx) {
    game.ctx.imageSmoothingEnabled = false;
    game.ctx.mozImageSmoothingEnabled = false;
    game.ctx.webkitImageSmoothingEnabled = false;
    game.ctx.msImageSmoothingEnabled = false;
  }
}

/**
 * Map death cause to dialog text
 */
function getDeathMessage(cause) {
  switch (cause) {
    case 'crushed':
      return 'Crushed by falling rock';
    case 'lava':
      return 'Melted by lava';
    default:
      return '';
  }
}

/**
 * Initialize the game when DOM is ready
 */
function init() {
  const canvas = document.getElementById('game-canvas');
  const loading = document.getElementById('loading');

  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  // Set initial canvas dimensions (responsive)
  const { width, height } = calculateCanvasDimensions();
  canvas.width = width;
  canvas.height = height;
  updateCanvasDimensions(width, height);

  // Create game instance
  const game = new Game(canvas);

  // Create viewport for coordinate transformation
  const viewport = new Viewport(width, height, WORLD_WIDTH_PX, WORLD_HEIGHT_PX);
  // viewport.setTerrainY(200);  // 100px from top, or use a constant
  game.viewport = viewport;

  // Initialize input system
  const inputSystem = new InputSystem();
  inputSystem.init();
  game.inputSystem = inputSystem;

  // Add systems (order matters for rendering and update logic)
  game.addComponent(new BackgroundSystem(game));
  game.addComponent(new TerrainSystem(game));
  game.addComponent(new NPCSystem(game));
  game.addComponent(new GravitySystem(game)); // Gravity system updates after terrain
  game.addComponent(new DigIndicatorSystem(game)); // Dig outline on top of terrain
  game.addComponent(new ShadowSystem(game)); // Shadow renders before player
  game.addComponent(new NavigationSystem(game));
  game.addComponent(new PlayerSystem(game));
  game.addComponent(new CoinEffectSystem(game));
  // Start camera positioned to show mountains and sun (Y=110 is sun center)
  game.addComponent(new CameraSystem(game, 256, 110, 3.0));
  game.addComponent(new HUDSystem(game));
  game.addComponent(new TouchInputSystem(game)); // Touch input for mobile
  game.addComponent(new DebugSystem(game));

  // Initialize game
  game.init();

  // Set up camera to follow player after initialization
  const camera = game.components.find((c) => c.constructor.name === 'CameraSystem');
  const player = game.components.find((c) => c.constructor.name === 'PlayerSystem');
  if (camera && player) {
    camera.follow(player);
  }

  // Subscribe to pause toggle event
  eventBus.on('input:pause-toggle', () => {
    game.handlePauseInput();
  });

  eventBus.on('player:death', ({ cause } = {}) => {
    const message = getDeathMessage(cause);
    game.showOverlay('death', { message });
  });

  // Hide loading screen
  loading.classList.add('hidden');

  // Handle window resize
  window.addEventListener('resize', () => resizeCanvas(canvas, game));

  // Start game loop
  game.start();
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
