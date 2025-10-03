/**
 * @file component.base.js
 * @description Abstract base class for all game components following lifecycle pattern
 */

/**
 * Base Component class
 * All game components extend this to follow a consistent lifecycle
 */
export class Component {
  /**
   * @param {Game} game - Reference to the main game instance
   */
  constructor(game) {
    this.game = game;
  }

  /**
   * Initialize component state and resources
   * Called once when component is added to game
   */
  init() {
    // Override in subclass
  }

  /**
   * Update component logic
   * @param {number} deltaTime - Time elapsed since last frame (ms)
   */
  update(deltaTime) {
    // Override in subclass
  }

  /**
   * Render component visuals
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   */
  render(ctx) {
    // Override in subclass
  }

  /**
   * Clean up component resources
   * Called when component is removed or game ends
   */
  destroy() {
    // Override in subclass
  }
}
