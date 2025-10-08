/**
 * @file game.js
 * @description Main game class - orchestrates component lifecycle and game loop
 */

import { TARGET_FPS } from '../utils/config.js';
import { PerformanceMonitor } from '../utils/performance-monitor.js';
import { RenderQueue } from '../rendering/render-queue.js';

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
    this.lastTime = 0;
    this.deltaTime = 0;
    this.frameInterval = 1000 / TARGET_FPS;
    this.zoomAfterRendering = false; // Toggle for testing zoom strategies

    // Performance monitoring
    this.performanceMonitor = new PerformanceMonitor();
    this.memoryUpdateCounter = 0; // Update memory every 60 frames

    // Shared render queue prototype for layer-based rendering.
    this.renderQueue = new RenderQueue();
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

    // Get camera and player for zoom
    const camera = this.components.find((c) => c.constructor.name === 'CameraComponent');
    const player = this.components.find((c) => c.constructor.name === 'PlayerComponent');
    const zoom = camera ? camera.getTransform().zoom : 1.0;

    if (this.zoomAfterRendering) {
      // STRATEGY 2: Render at 1:1 to temp canvas, then zoom
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.canvas.width;
      tempCanvas.height = this.canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.imageSmoothingEnabled = false;
      tempCtx.mozImageSmoothingEnabled = false;
      tempCtx.webkitImageSmoothingEnabled = false;
      tempCtx.msImageSmoothingEnabled = false;

      // Render all components EXCEPT debug to temp canvas at 1:1 (no zoom)
      this.components.forEach((component) => {
        if (component.render && component.constructor.name !== 'DebugComponent') {
          component.render(tempCtx);
        }
      });

      // Now zoom and draw the entire rendered image to main canvas
      this.ctx.save();
      if (camera && player) {
        const transform = camera.getTransform();
        const playerScreenX = Math.round(player.x + transform.x);
        const playerScreenY = Math.round(player.y + transform.y);
        this.ctx.translate(playerScreenX, playerScreenY);
        this.ctx.scale(zoom, zoom);
        this.ctx.translate(-playerScreenX, -playerScreenY);
      }
      this.ctx.drawImage(tempCanvas, 0, 0);
      this.ctx.restore();

      // Render debug component separately (not zoomed)
      const debugComponent = this.components.find((c) => c.constructor.name === 'DebugComponent');
      if (debugComponent && debugComponent.render) {
        debugComponent.render(this.ctx);
      }
    } else {
      // STRATEGY 1: Apply zoom BEFORE rendering (current approach)
      this.ctx.save();
      if (camera && player) {
        const transform = camera.getTransform();
        // Player's screen position (rounded to prevent sub-pixel gaps)
        const playerScreenX = Math.round(player.x + transform.x);
        const playerScreenY = Math.round(player.y + transform.y);
        // Zoom around player position
        this.ctx.translate(playerScreenX, playerScreenY);
        this.ctx.scale(zoom, zoom);
        this.ctx.translate(-playerScreenX, -playerScreenY);
      } else {
        // Fallback to center zoom
        const { width, height } = this.canvas;
        this.ctx.translate(width / 2, height / 2);
        this.ctx.scale(zoom, zoom);
        this.ctx.translate(-width / 2, -height / 2);
      }

      // Render all components (always render, even when paused)
      this.components.forEach((component) => {
        if (component.render) {
          component.render(this.ctx);
        }
      });

      // Restore context
      this.ctx.restore();
    }

    // Render pause overlay if paused (after restore, so it's not zoomed)
    if (this.paused) {
      this._renderPauseOverlay();
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
    this.paused = !this.paused;
  }

  /**
   * Pause the game
   */
  pause() {
    this.paused = true;
  }

  /**
   * Resume the game
   */
  resume() {
    this.paused = false;
  }

  /**
   * Render pause overlay
   * @private
   */
  _renderPauseOverlay() {
    const { ctx } = this;
    const { width, height } = this.canvas;

    // Semi-transparent dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);

    // "SPACE" text (large)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPACE', width / 2, height / 2 - 20);

    // "to resume" text (smaller below)
    ctx.font = '20px Arial';
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText('to resume', width / 2, height / 2 + 20);
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
