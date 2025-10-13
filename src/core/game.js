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

    // Death delay timer
    this.deathTimer = null; // Tracks remaining delay time
    this.pendingDeathOverlay = null; // Stores death overlay details during delay

    // Fade overlay for transitions (death, etc.)
    this.fadeOverlay = {
      active: false,
      alpha: 0, // Current opacity (0 = transparent, 1 = black)
      targetAlpha: 0, // Target opacity
      speed: 0, // Alpha change per millisecond
      onComplete: null, // Callback when fade finishes
    };

    // Terrain regeneration flag (set on death, executed on restart)
    this.pendingTerrainRegeneration = false;

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

    // Update fade overlay (always active, even when paused)
    if (this.fadeOverlay.active) {
      const deltaAlpha = this.fadeOverlay.speed * this.deltaTime;

      if (this.fadeOverlay.alpha < this.fadeOverlay.targetAlpha) {
        // Fading IN (to black)
        this.fadeOverlay.alpha = Math.min(
          this.fadeOverlay.targetAlpha,
          this.fadeOverlay.alpha + deltaAlpha,
        );
      } else if (this.fadeOverlay.alpha > this.fadeOverlay.targetAlpha) {
        // Fading OUT (from black)
        this.fadeOverlay.alpha = Math.max(
          this.fadeOverlay.targetAlpha,
          this.fadeOverlay.alpha - deltaAlpha,
        );
      }

      // Check if fade complete
      if (this.fadeOverlay.alpha === this.fadeOverlay.targetAlpha) {
        if (this.fadeOverlay.onComplete) {
          const callback = this.fadeOverlay.onComplete;
          this.fadeOverlay.onComplete = null;
          callback();
        }
      }
    }

    // Tick death timer if active
    if (this.deathTimer !== null) {
      this.deathTimer -= this.deltaTime;
      if (this.deathTimer <= 0) {
        // Delay expired - show the overlay now
        this.deathTimer = null;
        if (this.pendingDeathOverlay) {
          const { overrides } = this.pendingDeathOverlay;
          this.pendingDeathOverlay = null;
          this.showOverlay('death', overrides);
        }
      }
    }

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
   * @param {{title?: string, message?: string, instruction?: string, delay?: number}} overrides
   */
  showOverlay(type, overrides = {}) {
    const { delay, ...overlayOverrides } = overrides;

    // If delay is specified, defer showing the overlay
    if (delay !== undefined && delay > 0) {
      this.deathTimer = delay;
      this.pendingDeathOverlay = { type, overrides: overlayOverrides };
      return;
    }

    const presets = {
      pause: {
        title: 'PAUSED',
        message: '',
        instruction: 'SPACE to resume',
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
      ...overlayOverrides,
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
   * Start fade transition
   * @param {number} targetAlpha - Target opacity (0 = transparent, 1 = black)
   * @param {number} durationMs - Fade duration in milliseconds
   * @param {Function} onComplete - Callback when fade finishes
   */
  startFade(targetAlpha, durationMs, onComplete = null) {
    this.fadeOverlay.active = true;
    this.fadeOverlay.targetAlpha = Math.max(0, Math.min(1, targetAlpha));
    this.fadeOverlay.speed = Math.abs(targetAlpha - this.fadeOverlay.alpha) / durationMs;
    this.fadeOverlay.onComplete = onComplete;
  }

  /**
   * Restart the player while preserving terrain state
   * @private
   */
  _restartAfterDeath() {
    // Hide text overlay
    this.hideOverlay();

    // Regenerate terrain if pending (happens while screen is black)
    if (this.pendingTerrainRegeneration) {
      const terrainSystem = this.components.find(
        (c) => c.constructor.name === 'TerrainSystem',
      );
      const npcSystem = this.components.find(
        (c) => c.constructor.name === 'NPCSystem',
      );

      if (terrainSystem) {
        const newSeed = Math.floor(Math.random() * 1000000);
        terrainSystem.setSeed(newSeed);
      }

      if (npcSystem) {
        npcSystem.clear();
      }

      this.pendingTerrainRegeneration = false;
    }

    // Reset player position
    eventBus.emit('player:restart');

    // Fade from black to reveal terrain (400ms)
    this.startFade(0.0, 400);
  }

  /**
   * Render overlay dialog
   * @private
   */
  _renderOverlay() {
    const { ctx } = this;
    const { width, height } = this.canvas;

    // Render fade overlay (for death transitions, etc.)
    if (this.fadeOverlay.active && this.fadeOverlay.alpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeOverlay.alpha})`;
      ctx.fillRect(0, 0, width, height);
    }

    // Render text overlay on top if present
    if (this.overlay) {
      // Additional dark overlay for pause screen (not death)
      if (this.overlay.type === 'pause') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, height);
      }

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
