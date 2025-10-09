import { Component } from '../../core/component.js';

/**
 * LootEffectComponent
 *
 * Stores animation state for transient loot visuals like floating coins.
 */
export class LootEffectComponent extends Component {
  constructor({
    worldX,
    worldY,
    velocityY = -0.045,
    duration = 700,
  }) {
    super({
      worldX,
      worldY,
      velocityY,
      duration,
      elapsed: 0,
      alpha: 1,
    });
  }
}
