/**
 * @file game.js
 * @description Main game class - orchestrates component lifecycle and game loop
 */

import { TARGET_FPS } from '../utils/config.js';

/**
 * Main Game class
 * Manages component lifecycle and update/render loop
 */
export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.components = [];
    this.running = false;
    this.lastTime = 0;
    this.deltaTime = 0;
    this.frameInterval = 1000 / TARGET_FPS;
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

    // Calculate delta time
    this.deltaTime = currentTime - this.lastTime;

    // Cap delta time to prevent spiral of death
    if (this.deltaTime > 100) {
      this.deltaTime = this.frameInterval;
    }

    // Update all components
    this.components.forEach((component) => {
      if (component.update) {
        component.update(this.deltaTime);
      }
    });

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Render all components
    this.components.forEach((component) => {
      if (component.render) {
        component.render(this.ctx);
      }
    });

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
   * Clean up all components and resources
   */
  destroy() {
    this.stop();
    this.components.forEach((component) => component.destroy());
    this.components = [];
  }
}
