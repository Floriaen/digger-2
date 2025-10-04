/**
 * @file main.js
 * @description Entry point - initializes game and components
 */

import { Game } from './core/game.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './utils/config.js';
import { BackgroundComponent } from './components/background.component.js';
import { TerrainComponent } from './components/terrain.component.js';
import { PlayerComponent } from './components/player.component.js';
import { ShadowComponent } from './components/shadow.component.js';
import { GridOverlayComponent } from './components/grid-overlay.component.js';
import { NavigationComponent } from './components/navigation.component.js';
import { FallingBlocksComponent } from './components/falling-blocks.component.js';
import { CameraComponent } from './components/camera.component.js';
import { HUDComponent } from './components/hud.component.js';
import { DebugComponent } from './components/debug.component.js';
import { InputSystem } from './systems/input.system.js';
import { eventBus } from './utils/event-bus.js';

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

  // Initialize input system
  const inputSystem = new InputSystem();
  inputSystem.init();
  game.inputSystem = inputSystem;

  // Add components (order matters for rendering)
  game.addComponent(new BackgroundComponent(game));
  game.addComponent(new TerrainComponent(game));
  game.addComponent(new GridOverlayComponent(game)); // Grid overlay on blocks
  game.addComponent(new FallingBlocksComponent(game));
  game.addComponent(new ShadowComponent(game)); // Shadow renders before player
  game.addComponent(new NavigationComponent(game));
  game.addComponent(new PlayerComponent(game));
  game.addComponent(new CameraComponent(game));
  game.addComponent(new HUDComponent(game));
  game.addComponent(new DebugComponent(game));

  // Initialize game
  game.init();

  // Subscribe to pause toggle event
  eventBus.on('input:pause-toggle', () => {
    game.togglePause();
  });

  // Hide loading screen
  loading.classList.add('hidden');

  // Start game loop
  game.start();
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
