/**
 * @file lifecycle-component.js
 * @description Abstract base class for all game loop components following lifecycle pattern
 *
 * NOTE: This is distinct from the ECS Component class (src/core/component.js).
 * - LifecycleComponent: For game loop components (player, camera, terrain, HUD)
 * - Component: For ECS block components (pure data containers)
 */

/**
 * LifecycleComponent class
 * All game loop components extend this to follow a consistent lifecycle
 */
export class LifecycleComponent {
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
  update(_deltaTime) {
    // Override in subclass
  }

  /**
   * Render component visuals
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   */
  render(_ctx) {
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
