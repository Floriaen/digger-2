import { Component } from '../../core/component.js';
import { PhysicsComponent } from './physics.component.js';
import {
  GRAVITY,
  FALL_SPEED_MAX,
  TILE_HEIGHT,
} from '../../utils/config.js';

const DEFAULT_KIND = 'block';
const ACTOR_KIND = 'actor';

/**
 * FallableComponent
 *
 * Handles gravity and falling physics for blocks and actors that share the same
 * gravity pipeline. Each instance must be bound to its owning entity via
 * `attachOwner` before use.
 */
export class FallableComponent extends Component {
  constructor({ kind = DEFAULT_KIND } = {}) {
    super();
    this.kind = kind;
    this.owner = null;

    this.isFalling = false;
    this.velocityY = 0;

    // Stored world-space information for blocks (and for exposing state to systems).
    this.pixelY = null;
    this.gridX = null;
    this.gridY = null;
  }

  /**
   * Bind the component to its owning entity.
   * @param {Object} owner
   */
  attachOwner(owner) {
    this.owner = owner;
  }

  /**
   * Ensure the component has been bound before use.
   * @private
   */
  _assertOwner() {
    console.assert(this.owner, 'FallableComponent requires an owner before use.');
  }

  /**
   * Determine whether a tile is supported by a solid block beneath it.
   * @param {Object} terrain
   * @param {number} gridX
   * @param {number} gridY
   * @returns {boolean}
   */
  hasSupport(terrain, gridX, gridY) {
    const blockBelow = terrain.getBlock(gridX, gridY + 1);
    const physicsBelow = blockBelow.get(PhysicsComponent);

    return Boolean(physicsBelow && physicsBelow.isCollidable());
  }

  /**
   * Begin falling from the provided grid coordinates.
   * @param {number} gridX
   * @param {number} gridY
   */
  start(gridX, gridY) {
    this._assertOwner();
    this.isFalling = true;
    this.velocityY = 0;

    this.gridX = gridX;
    this.gridY = gridY;
    this.pixelY = gridY * TILE_HEIGHT;

    if (this.kind === ACTOR_KIND) {
      this._syncActorPositionToComponent();
    }
  }

  /**
   * Advance the falling simulation.
   * @param {number} deltaMs
   */
  tick(_deltaMs = 0) {
    this._assertOwner();
    if (!this.isFalling) return;

    // Apply acceleration (frame-based; deltaMs kept for future tuning).
    this.velocityY += GRAVITY;
    if (this.velocityY > FALL_SPEED_MAX) {
      this.velocityY = FALL_SPEED_MAX;
    }

    if (this.kind === ACTOR_KIND) {
      this._translateActor();
    } else {
      // Blocks (and any callers relying on pixel/grid state).
      this.pixelY += this.velocityY;
      this.gridY = Math.floor(this.pixelY / TILE_HEIGHT);
    }
  }

  /**
   * Stop falling and snap to the current grid cell.
   */
  land() {
    this._assertOwner();
    this.isFalling = false;
    this.velocityY = 0;

    if (this.kind === ACTOR_KIND) {
      this._snapActorToGrid();
    } else if (this.gridY !== null) {
      this.pixelY = this.gridY * TILE_HEIGHT;
    }
  }

  /**
   * Reset stored state (used when block is removed from the world).
   */
  reset() {
    this.isFalling = false;
    this.velocityY = 0;
    this.pixelY = null;
    this.gridX = null;
    this.gridY = null;
  }

  /**
   * Expose the current grid location where available.
   * @returns {{gridX: number, gridY: number}|null}
   */
  getGridPosition() {
    if (this.gridX === null || this.gridY === null) {
      return null;
    }
    return { gridX: this.gridX, gridY: this.gridY };
  }

  /**
   * Translate actor owners using their position component.
   * @private
   */
  _translateActor() {
    const position = this._getActorPositionComponent();
    if (!position) {
      return;
    }

    position.translate(0, this.velocityY);
    this.gridX = position.gridX;
    this.gridY = position.gridY;
    this.pixelY = position.y;
  }

  /**
   * Snap actor owners back to their grid cell.
   * @private
   */
  _snapActorToGrid() {
    const position = this._getActorPositionComponent();
    if (!position) {
      return;
    }

    position.y = position.gridY * TILE_HEIGHT;
    position.syncSpawn();
    this.gridX = position.gridX;
    this.gridY = position.gridY;
    this.pixelY = position.y;
  }

  /**
   * Mirror stored state into the actor's PositionComponent.
   * @private
   */
  _syncActorPositionToComponent() {
    const position = this._getActorPositionComponent();
    if (!position || this.gridY === null) {
      return;
    }

    position.gridX = this.gridX;
    position.gridY = this.gridY;
    position.y = this.pixelY;
    position.syncSpawn();
  }

  /**
   * Lazy-load and fetch the actor PositionComponent.
   * @private
   * @returns {PositionComponent|null}
   */
  _getActorPositionComponent() {
    if (!this.owner || typeof this.owner.get !== 'function') {
      return null;
    }

    try {
      // eslint-disable-next-line global-require
      const { PositionComponent } = require('../shared/position.component.js');
      return this.owner.get(PositionComponent) || null;
    } catch (error) {
      return null;
    }
  }
}
