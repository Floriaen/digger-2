/**
 * @file main.js
 * @description Entry point - initializes game and components
 */

import { Game } from './core/game.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, updateCanvasDimensions } from './utils/config.js';
import { BackgroundComponent } from './components/background.component.js';
import { TerrainComponent } from './components/terrain.component.js';
import { PlayerComponent } from './components/player.component.js';
import { ShadowComponent } from './components/shadow.component.js';
import { GridOverlayComponent } from './components/grid-overlay.component.js';
import { NavigationComponent } from './components/navigation.component.js';
import { DigIndicatorComponent } from './components/dig-indicator.component.js';
import { CameraComponent } from './components/camera.component.js';
import { HUDComponent } from './components/hud.component.js';
import { DebugComponent } from './components/debug.component.js';
import { TouchInputComponent } from './components/touch-input.component.js';
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

  // Update camera if it exists
  if (game) {
    const camera = game.components.find((c) => c.constructor.name === 'CameraComponent');
    if (camera && camera.updateViewport) {
      camera.updateViewport();
    }
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

  // Initialize input system
  const inputSystem = new InputSystem();
  inputSystem.init();
  game.inputSystem = inputSystem;

  // Add components (order matters for rendering and update logic)
  game.addComponent(new BackgroundComponent(game));
  game.addComponent(new TerrainComponent(game));
  game.addComponent(new GravitySystem(game)); // Gravity system updates after terrain
  game.addComponent(new GridOverlayComponent(game)); // Grid overlay on blocks
  game.addComponent(new DigIndicatorComponent(game)); // Dig outline on top of terrain
  game.addComponent(new ShadowComponent(game)); // Shadow renders before player
  game.addComponent(new NavigationComponent(game));
  game.addComponent(new PlayerComponent(game));
  game.addComponent(new CoinEffectSystem(game));
  game.addComponent(new CameraComponent(game));
  game.addComponent(new HUDComponent(game));
  game.addComponent(new TouchInputComponent(game)); // Touch input for mobile
  game.addComponent(new DebugComponent(game));

  // Initialize game
  game.init();

  // Subscribe to pause toggle event
  eventBus.on('input:pause-toggle', () => {
    game.togglePause();
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
