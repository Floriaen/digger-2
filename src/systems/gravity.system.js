/**
 * @file gravity.system.js
 * @description Unified gravity system - manages falling for all entities with FallableComponent
 */

import { LifecycleComponent } from '../core/lifecycle-component.js';
import { FallableComponent } from '../components/blocks/fallable.component.js';
import { PhysicsComponent } from '../components/blocks/physics.component.js';
import { BlockFactory } from '../factories/block.factory.js';
import { eventBus } from '../utils/event-bus.js';
import { LethalComponent } from '../components/blocks/lethal.component.js';

/**
 * GravitySystem
 * Unified ECS system for gravity and falling physics.
 * Manages all entities with FallableComponent (player, rocks, etc.)
 */
export class GravitySystem extends LifecycleComponent {
  init() {
    // Track falling blocks for collision detection
    this.fallingBlocks = new Set();
  }

  update(deltaTime) {
    const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainComponent');
    const player = this.game.components.find((c) => c.constructor.name === 'PlayerComponent');

    if (!terrain || !player) return;

    // 1. Update falling blocks in terrain
    this._updateFallingBlocks(terrain, player, deltaTime);

    // 2. Update player falling (if player has FallableComponent attached)
    this._updatePlayerFalling(terrain, player, deltaTime);
  }

  /**
   * Update all falling blocks in terrain
   * @param {TerrainComponent} terrain
   * @param {PlayerComponent} player
   * @param {number} deltaTime
   * @private
   */
  _updateFallingBlocks(terrain, player, deltaTime) {
    // Access chunks from terrain's cache (which is a Map)
    if (!terrain.cache || !terrain.cache.chunks) {
      return;
    }

    const { chunks } = terrain.cache;
    const newFallingBlocks = new Set();

    // Iterate through all chunks (chunks is a Map, not an object)
    chunks.forEach((chunk) => {
      // Iterate through 2D block array
      for (let y = 0; y < chunk.blocks.length; y += 1) {
        for (let x = 0; x < chunk.blocks[y].length; x += 1) {
          const block = chunk.blocks[y][x];
          if (!block || !block.has || !block.has(FallableComponent)) {
            // Skip blocks that don't have FallableComponent
            continue;
          }

          const fallable = block.get(FallableComponent);
          const worldX = chunk.chunkX * 32 + x; // 32 is CHUNK_SIZE
          const worldY = chunk.chunkY * 32 + y;

          // Check if block should start falling
          if (!fallable.isFalling && fallable.checkSupport(block, terrain, worldX, worldY)) {
            fallable.startFalling(worldX, worldY);
          }

          // Update falling blocks
          if (fallable.isFalling) {
            fallable.updateFalling(deltaTime);

            // Check if block landed on solid ground
            const blockBelow = terrain.getBlock(fallable.gridX, fallable.gridY + 1);
            const physicsBelow = blockBelow?.get(PhysicsComponent);

            if (physicsBelow && physicsBelow.isCollidable()) {
              // Landed - stop falling and update grid position
              // Move block from old position to new position
              terrain.setBlock(worldX, worldY, BlockFactory.createEmpty());
              terrain.setBlock(fallable.gridX, fallable.gridY, block);
              fallable.stopFalling();
            } else {
              // Still falling - check player collision
              if (this._checkBlockPlayerCollision(fallable, player)) {
                eventBus.emit('player:death', { cause: 'crushed' });
              }
              newFallingBlocks.add(block);
            }
          }
        }
      }
    });

    this.fallingBlocks = newFallingBlocks;
  }

  /**
   * Update player falling (if player has FallableComponent)
   * @param {TerrainComponent} terrain
   * @param {PlayerComponent} player
   * @param {number} deltaTime
   * @private
   */
  _updatePlayerFalling(terrain, player, deltaTime) {
    // Only handle gravity if player is in FALLING state
    if (player.state !== 'falling' || !player.fallable) return;

    // Start falling if not already
    if (!player.fallable.isFalling) {
      player.fallable.startFalling(player.gridX, player.gridY);
      player.fallable.pixelY = player.y; // Use current pixel position
    }

    // Apply gravity via FallableComponent
    player.fallable.updateFalling(deltaTime);

    // Update player position from fallable
    player.y = player.fallable.pixelY;
    const newGridY = Math.floor(player.y / 16);

    // Check if we've entered a new grid cell
    if (newGridY !== player.gridY) {
      const newGridX = Math.floor(player.x / 16);

      // Check what's at the new position BEFORE moving into it
      const blockAtNewPos = terrain.getBlock(newGridX, newGridY);

      // Check if we fell into lava
      if (blockAtNewPos.has(LethalComponent)) {
        eventBus.emit('player:death', { cause: 'lava' });
        player.state = 'idle';
        player.fallable.stopFalling();
        return;
      }

      // Check if we hit a solid block
      const physicsAtNewPos = blockAtNewPos.get(PhysicsComponent);
      if (physicsAtNewPos && physicsAtNewPos.isCollidable()) {
        // Stop at the previous grid position (don't enter the solid block)
        player.y = player.gridY * 16 + 8; // Snap to center of current grid cell
        player.fallable.stopFalling();

        // Notify player component to handle landing
        player.handleLanding(blockAtNewPos, newGridX, newGridY);
      } else {
        // Block is traversable, move into it and keep falling
        player.gridY = newGridY;
        player.gridX = newGridX;
        player.fallable.gridY = newGridY;
        player.fallable.gridX = newGridX;
      }
    }
  }

  /**
   * Check if falling block collides with player
   * @param {FallableComponent} fallable
   * @param {PlayerComponent} player
   * @returns {boolean}
   * @private
   */
  _checkBlockPlayerCollision(fallable, player) {
    const blockPixelY = fallable.pixelY;
    const blockPixelX = fallable.gridX * 16;

    // Check if block overlaps with player position
    const playerCenterX = player.x;
    const playerCenterY = player.y;

    // Simple AABB collision (16x16 block vs player radius)
    const blockLeft = blockPixelX;
    const blockRight = blockPixelX + 16;
    const blockTop = blockPixelY;
    const blockBottom = blockPixelY + 16;

    const playerLeft = playerCenterX - 8;
    const playerRight = playerCenterX + 8;
    const playerTop = playerCenterY - 8;
    const playerBottom = playerCenterY + 8;

    return (
      blockLeft < playerRight
      && blockRight > playerLeft
      && blockTop < playerBottom
      && blockBottom > playerTop
    );
  }

  destroy() {
    this.fallingBlocks.clear();
  }
}
