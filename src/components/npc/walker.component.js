/**
 * @file npc-walker.component.js
 * @description Horizontal crawl behaviour for an NPC.
 */

import { Component } from '../../core/component.js';
import { TILE_WIDTH } from '../../utils/config.js';
import { PhysicsComponent } from '../block/physics.component.js';
import { PositionComponent } from '../shared/position.component.js';
import { StateComponent } from './state.component.js';
import { EaterComponent } from './eater.component.js';
import { FallComponent } from './fall.component.js';

const WALK_SPEED_PX_PER_MS = 0.01; // ~2 tiles per second

export class WalkerComponent extends Component {
  update(entity, deltaTime, { game, terrain }) {
    if (!game || deltaTime <= 0) {
      return;
    }

    const terrainRef = terrain
      || game.components.find((component) => component.constructor.name === 'TerrainSystem');

    if (!terrainRef) {
      return;
    }

    const position = entity.get(PositionComponent);
    const state = entity.get(StateComponent);
    const eater = entity.get(EaterComponent);
    const fall = entity.get(FallComponent);

    if (!position || !state) {
      return;
    }

    if (fall && fall.isFalling) {
      return;
    }

    const pixelsToMove = WALK_SPEED_PX_PER_MS * deltaTime;
    if (pixelsToMove <= 0) {
      return;
    }

    const front = this._getFrontTile(position, state.direction);
    if (!this._ensureTraversable(front, terrainRef, eater, entity)) {
      state.direction *= -1;
      state.syncSpawn();
      return;
    }

    position.translate(state.direction * pixelsToMove, 0);
    state.syncSpawn();
  }

  _ensureTraversable(target, terrain, eater, entity) {
    const block = terrain.getBlock(target.gridX, target.gridY);
    const physics = block.get(PhysicsComponent);

    if (!physics || !physics.isCollidable()) {
      return true;
    }

    if (!eater) {
      return false;
    }

    return eater.tryEat(entity, terrain, target.gridX, target.gridY);
  }

  _getFrontTile(position, direction) {
    if (direction > 0) {
      const frontX = position.x + TILE_WIDTH;
      return {
        gridX: Math.floor(frontX / TILE_WIDTH),
        gridY: position.gridY,
      };
    }

    const frontX = position.x - 1;
    return {
      gridX: Math.floor(frontX / TILE_WIDTH),
      gridY: position.gridY,
    };
  }
}
