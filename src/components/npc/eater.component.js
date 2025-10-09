/**
 * @file npc-eater.component.js
 * @description Behaviour component that lets an NPC consume diggable blocks instantly.
 */

import { Component } from '../../core/component.js';
import { BlockFactory } from '../../factories/block.factory.js';
import { PhysicsComponent } from '../../components/block/physics.component.js';
import { DiggableComponent } from '../../components/block/diggable.component.js';

const INSTANT_DAMAGE = Number.MAX_SAFE_INTEGER;

export class EaterComponent extends Component {
  constructor({ spawn }) {
    super({ spawn });
  }

  tryEat(entity, terrain, gridX, gridY) {
    if (!terrain) {
      return false;
    }

    const block = terrain.getBlock(gridX, gridY);
    const physics = block.get(PhysicsComponent);

    if (!physics || !physics.isCollidable()) {
      return true;
    }

    const diggable = block.get(DiggableComponent);
    if (!diggable) {
      return false;
    }

    const result = diggable.dig(block, gridX, gridY, INSTANT_DAMAGE);
    if (!result.destroyed) {
      return false;
    }

    terrain.setBlock(gridX, gridY, BlockFactory.createEmpty());

    if (this.spawn) {
      this.spawn.lastEatenAt = { x: gridX, y: gridY };
    }

    return true;
  }
}
