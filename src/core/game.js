/**
 * @file game.js
 * @description Main game class - orchestrates component lifecycle and game loop
 */

import { TARGET_FPS } from '../utils/config.js';
import { PerformanceMonitor } from '../utils/performance-monitor.js';
import { RenderQueue } from '../rendering/render-queue.js';
import { eventBus } from '../utils/event-bus.js';

/**
 * Main Game class
 * Manages component lifecycle and update/render loop
 */
export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Disable image smoothing for crisp pixel art
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.mozImageSmoothingEnabled = false;
    this.ctx.webkitImageSmoothingEnabled = false;
    this.ctx.msImageSmoothingEnabled = false;

    this.components = [];
    this.running = false;
    this.paused = false;
    this.overlay = null;
    this.lastTime = 0;
    this.deltaTime = 0;
    this.frameInterval = 1000 / TARGET_FPS;

    // Performance monitoring
    this.performanceMonitor = new PerformanceMonitor();
    this.memoryUpdateCounter = 0; // Update memory every 60 frames

    // Shared render queue prototype for layer-based rendering.
    this.renderQueue = new RenderQueue();

    // Viewport (set by main.js after initialization)
    this.viewport = null;
  }

  /**
   * Add a component to the game
   * @param {Component} component - Component instance
   */
  addComponent(component) {
    this.components.push(component);
    component.init();
  }

  /**
   * Remove a component from the game
   * @param {Component} component - Component instance
   */
  removeComponent(component) {
    const index = this.components.indexOf(component);
    if (index !== -1) {
      this.components[index].destroy();
      this.components.splice(index, 1);
    }
  }

  /**
   * Initialize game and all components
   */
  init() {
    // Components will be added in main.js
    this.running = true;
    this.lastTime = performance.now();
  }

  /**
   * Main game loop
   * @param {number} currentTime - Current timestamp
   */
  loop(currentTime) {
    if (!this.running) return;

    requestAnimationFrame((time) => this.loop(time));

    // Performance: Start frame timing
    this.performanceMonitor.startMark('frame');

    // Calculate delta time
    this.deltaTime = currentTime - this.lastTime;

    // Cap delta time to prevent spiral of death
    if (this.deltaTime > 100) {
      this.deltaTime = this.frameInterval;
    }

    // Performance: Start update timing
    this.performanceMonitor.startMark('update');

    // Update all components (skip if paused)
    if (!this.paused) {
      this.components.forEach((component) => {
        if (component.update) {
          component.update(this.deltaTime);
        }
      });
    }

    // Performance: End update timing
    this.performanceMonitor.endMark('update');

    // Reset transform and clear canvas
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset to identity matrix
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Prepare render queue for the upcoming frame.
    this.renderQueue.clear();

    // Performance: Start render timing
    this.performanceMonitor.startMark('render');

    // Get camera for transform
    const camera = this.components.find((c) => c.constructor.name === 'CameraSystem');

    this.ctx.save();
    if (camera && this.viewport) {
      this.viewport.applyTransform(this.ctx, camera);
    }

    // Render all components (always render, even when paused)
    this.components.forEach((component) => {
      if (component.render) {
        component.render(this.ctx);
      }
    });

    this.ctx.restore();

    // Render overlay last so it is not affected by zoom transforms
    if (this.overlay) {
      this._renderOverlay();
    }

    // Performance: End render timing
    this.performanceMonitor.endMark('render');

    // Performance: End frame timing
    this.performanceMonitor.endMark('frame');

    // Update memory usage every 60 frames
    this.memoryUpdateCounter += 1;
    if (this.memoryUpdateCounter >= 60) {
      this.performanceMonitor.updateMemory();
      this.memoryUpdateCounter = 0;
    }

    this.lastTime = currentTime;
  }

  /**
   * Start the game loop
   */
  start() {
    this.running = true;
    requestAnimationFrame((time) => this.loop(time));
  }

  /**
   * Stop the game loop
   */
  stop() {
    this.running = false;
  }

  /**
   * Toggle pause state
   */
  togglePause() {
    this.handlePauseInput();
  }

  /**
   * Pause the game
   */
  pause() {
    this.showOverlay('pause');
  }

  /**
   * Resume the game
   */
  resume() {
    this.hideOverlay();
  }

  /**
   * Handle pause input (Space/Escape)
   */
  handlePauseInput() {
    if (this.overlay?.type === 'death') {
      this._restartAfterDeath();
      return;
    }

    if (this.overlay?.type === 'transition') {
      return;
    }

    if (this.overlay?.type === 'pause') {
      this.hideOverlay();
      return;
    }

    if (!this.paused) {
      this.showOverlay('pause');
    } else {
      this.hideOverlay();
    }
  }

  /**
   * Show modal overlay and pause the game
   * @param {'pause'|'death'} type
   * @param {{title?: string, message?: string, instruction?: string}} overrides
   */
  showOverlay(type, overrides = {}) {
    const presets = {
      pause: {
        title: 'PAUSED',
        message: '',
        instruction: 'SPACE to resume',
      },
      transition: {
        title: 'LEVEL COMPLETE',
        message: 'Generating new cavern...',
        instruction: '',
      },
      death: {
        title: 'YOU DIED',
        message: '',
        instruction: 'SPACE to restart',
      },
    };

    this.overlay = {
      type,
      ...presets[type],
      ...overrides,
    };
    this.paused = true;
  }

  /**
   * Hide overlay and resume updates
   */
  hideOverlay() {
    this.overlay = null;
    this.paused = false;
  }

  /**
   * Restart the player while preserving terrain state
   * @private
   */
  _restartAfterDeath() {
    eventBus.emit('player:restart');
    this.hideOverlay();
  }

  /**
   * Render overlay dialog
   * @private
   */
  _renderOverlay() {
    const { ctx } = this;
    const { width, height } = this.canvas;

    // Semi-transparent dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);

    const title = this.overlay?.title;
    const message = this.overlay?.message;
    const instruction = this.overlay?.instruction;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (title) {
      ctx.font = 'bold 48px Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(title, width / 2, height / 2 - 60);
    }

    if (message) {
      ctx.font = '24px Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(message, width / 2, height / 2 - 10);
    }

    if (instruction) {
      ctx.font = '20px Arial';
      ctx.fillStyle = '#CCCCCC';
      ctx.fillText(instruction, width / 2, height / 2 + 40);
    }
  }

  /**
   * Clean up all components and resources
   */
  destroy() {
    this.stop();
    this.components.forEach((component) => component.destroy());
    this.components = [];
  }
}
