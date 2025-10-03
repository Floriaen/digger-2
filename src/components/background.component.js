/**
 * @file background.component.js
 * @description Background component - renders sky, mountains, sun, and lava
 */

import { Component } from '../core/component.base.js';

/**
 * BackgroundComponent
 * Renders orange sky, black mountains, parallax, and lava lake
 */
export class BackgroundComponent extends Component {
  init() {
    this.parallaxOffset = 0;
  }

  update(deltaTime) {
    // TODO: Implement parallax calculation in Milestone 0
  }

  render(ctx) {
    // TODO: Implement background rendering in Milestone 0
    // - Orange gradient sky
    // - Beige sun disc
    // - Black mountain silhouettes with parallax
    // - Switch to black background underground
    // - Lava lake at bottom
  }

  destroy() {
    // Cleanup if needed
  }
}
