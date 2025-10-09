/**
 * @file npc-fall.component.js
 * @description Simple gravity handler for an NPC.
 */

import { Component } from '../../core/component.js';
import { TILE_HEIGHT } from '../../utils/config.js';
import { PhysicsComponent } from '../block/physics.component.js';
import { PositionComponent } from './position.component.js';

const FALL_SPEED_PX_PER_MS = 0.3;

export class FallComponent extends Component {
  constructor() {
    super();
    this.isFalling = false;
  }

  update(entity, deltaTime, { game, terrain }) {
    if (!game || deltaTime <= 0) {
      return;
    }

    const terrainRef = terrain
      || game.components.find((component) => component.constructor.name === 'TerrainComponent');

    if (!terrainRef) {
      return;
    }

    const position = entity.get(PositionComponent);
    if (!position) {
      return;
    }

    const belowBlock = terrainRef.getBlock(position.gridX, position.gridY + 1);
    const physicsBelow = belowBlock.get(PhysicsComponent);
    const hasSupport = physicsBelow && physicsBelow.isCollidable();

    if (!hasSupport) {
      this._applyFall(position, deltaTime, terrainRef);
    } else if (this.isFalling) {
      this._land(position);
    }
  }

  _applyFall(position, deltaTime, terrain) {
    this.isFalling = true;
    const distance = FALL_SPEED_PX_PER_MS * deltaTime;
    position.translate(0, distance);

    const belowBlock = terrain.getBlock(position.gridX, position.gridY + 1);
    const physicsBelow = belowBlock.get(PhysicsComponent);

    if (physicsBelow && physicsBelow.isCollidable()) {
      const snappedY = position.gridY * TILE_HEIGHT;
      position.y = snappedY;
      position.syncSpawn();
      this.isFalling = false;
    }
  }

  _land(position) {
    position.y = position.gridY * TILE_HEIGHT;
    position.syncSpawn();
    this.isFalling = false;
  }
}
