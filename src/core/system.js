/**
 * @file system.js
 * @description Base class for all game loop systems
 *
 * NOTE: This is distinct from the ECS Component class (src/core/component.js).
 * - System: For game loop systems (player, camera, terrain, HUD, gravity, etc.)
 * - Component: For ECS components (data + behavior for entities)
 */

/**
 * System base class
 * All game loop systems extend this to follow a consistent lifecycle
 */
export class System {
  /**
   * @param {Game} game - Reference to the main game instance
   */
  constructor(game) {
    this.game = game;
  }

  /**
   * Initialize system state and resources
   * Called once when system is added to game
   */
  init() {
    // Override in subclass
  }

  /**
   * Update system logic
   * @param {number} deltaTime - Time elapsed since last frame (ms)
   */
  update(_deltaTime) {
    // Override in subclass
  }

  /**
   * Render system visuals
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   */
  render(_ctx) {
    // Override in subclass
  }

  /**
   * Clean up system resources
   * Called when system is removed or game ends
   */
  destroy() {
    // Override in subclass
  }
}
