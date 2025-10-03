/**
 * @file main.js
 * @description Entry point - initializes game and components
 */

import { Game } from './core/game.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './utils/config.js';

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

  // Set canvas dimensions
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // Create game instance
  const game = new Game(canvas);

  // TODO: Add components here in Milestone 0
  // game.addComponent(new BackgroundComponent(game));
  // game.addComponent(new TerrainComponent(game));
  // game.addComponent(new PlayerComponent(game));
  // game.addComponent(new CameraComponent(game));
  // game.addComponent(new HUDComponent(game));
  // game.addComponent(new DebugComponent(game));

  // Initialize game
  game.init();

  // Hide loading screen
  loading.classList.add('hidden');

  // Start game loop
  game.start();

  console.log('Digger 2 initialized successfully');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
