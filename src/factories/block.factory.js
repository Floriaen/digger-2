import { Block } from '../entities/block.entity.js';
import { RenderComponent } from '../components/block/render.component.js';
import { PhysicsComponent } from '../components/block/physics.component.js';
import { HealthComponent } from '../components/block/health.component.js';
import { DiggableComponent } from '../components/block/diggable.component.js';
import { FallableComponent } from '../components/block/fallable.component.js';
import { DarknessComponent } from '../components/block/darkness.component.js';
import { LootableComponent } from '../components/block/lootable.component.js';
import { LethalComponent } from '../components/block/lethal.component.js';
import { PauseOnDestroyComponent } from '../components/block/pause-on-destroy.component.js';

/**
 * BlockFactory
 *
 * Creates Block entities with appropriate component composition.
 * This is the single source of truth for block definitions in the ECS architecture.
 */
export class BlockFactory {
  /**
   * Attach metadata to a newly created block and return it.
   * @param {Block} block
   * @param {string} type
   * @param {Object} extra
   * @returns {Block}
   * @private
   */
  static finalizeBlock(block, type, extra = {}) {
    block.type = type;
    Object.assign(block, extra);
    return block;
  }

  /**
   * Create an empty (air) block
   * @returns {Block}
   */
  static createEmpty() {
    const block = new Block([
      new PhysicsComponent({ collidable: false }),
    ]);
    return BlockFactory.finalizeBlock(block, 'empty');
  }

  /**
   * Create an immovable boundary block (solid, non-diggable, invisible)
   * @returns {Block}
   */
  static createBoundary() {
    const block = new Block([
      new PhysicsComponent({ collidable: true }),
    ]);
    return BlockFactory.finalizeBlock(block, 'boundary');
  }

  /**
   * Create a mud block with variable HP and visual variant
   * @param {number} hp - Hit points (all mud has 5)
   * @param {number} variant - Visual variant (1-5 for depth-based diversity)
   * @returns {Block}
   */
  static createMud(hp = 5, variant = 1) {
    // Map variant (1-5) to darkness alpha (0-0.4)
    const darknessAlpha = (variant - 1) * 0.1; // 1→0, 2→0.1, 3→0.2, 4→0.3, 5→0.4

    const components = [
      new RenderComponent({ spriteX: 16, spriteY: 0 }),
      new PhysicsComponent({ collidable: true }),
      new HealthComponent({ hp }),
      new DiggableComponent(),
    ];

    // Add DarknessComponent if variant creates darkening
    if (darknessAlpha > 0) {
      components.push(new DarknessComponent({ alpha: darknessAlpha }));
    }

    const block = new Block(components);
    return BlockFactory.finalizeBlock(block, 'mud', { variant });
  }

  /**
   * Create a rock block (falls when unsupported)
   * @returns {Block}
   */
  static createRock() {
    const block = new Block([
      new RenderComponent({
        spriteX: 48,
        spriteY: 0,
        width: 16,
        height: 25,
        // offsetY : -9
      }),
      new PhysicsComponent({ collidable: true }),
      new FallableComponent(),
    ]);
    return BlockFactory.finalizeBlock(block, 'rock');
  }

  /**
   * Create a pause crystal block (pauses game when destroyed)
   * @returns {Block}
   */
  static createPauseCrystal() {
    const block = new Block([
      new RenderComponent({
        spriteX: 64,
        spriteY: 24,
        spriteWidth: 16,
        spriteHeight: 25,
      }),
      new PhysicsComponent({ collidable: true }),
      new HealthComponent({ hp: 5 }),
      new DiggableComponent(),
      new PauseOnDestroyComponent(),
    ]);
    return BlockFactory.finalizeBlock(block, 'pause_crystal');
  }

  /**
   * Create a red frame block (torus)
   * @returns {Block}
   */
  static createRedFrame() {
    const block = new Block([
      new RenderComponent({ spriteX: 32, spriteY: 0 }),
      new PhysicsComponent({ collidable: true }),
      new HealthComponent({ hp: 5 }),
      new DiggableComponent(),
    ]);
    return BlockFactory.finalizeBlock(block, 'red_frame');
  }

  /**
   * Create a lava block (traversable but deadly)
   * @returns {Block}
   */
  static createLava() {
    const block = new Block([
      new RenderComponent({ spriteX: 64, spriteY: 0 }),
      new PhysicsComponent({ collidable: false }),
      new LethalComponent(),
    ]);
    return BlockFactory.finalizeBlock(block, 'lava');
  }

  /**
   * Create a grass block
   * @returns {Block}
   */
  static createGrass() {
    const block = new Block([
      new RenderComponent({ spriteX: 0, spriteY: 0 }),
      new PhysicsComponent({ collidable: true }),
      new HealthComponent({ hp: 5 }),
      new DiggableComponent(),
    ]);
    return BlockFactory.finalizeBlock(block, 'grass');
  }

  /**
   * Create a chest block (drops loot when destroyed)
   * @param {Array} loot - Array of loot items to drop
   * @returns {Block}
   */
  static createChest(loot = [{ type: 'coin', value: 10 }]) {
    const block = new Block([
      new RenderComponent({ spriteX: 64, spriteY: 0 }),
      new PhysicsComponent({ collidable: true }),
      new HealthComponent({ hp: 15 }),
      new DiggableComponent(),
      new LootableComponent({ loot }),
      new FallableComponent(),
    ]);
    return BlockFactory.finalizeBlock(block, 'chest');
  }

  /**
   * Create a covered chest (chest with cover that must be dug first)
   * When destroyed, spawns a regular chest at the same position
   * @param {Array} loot - Array of loot items for the chest underneath
   * @returns {Block}
   */
  static createCoveredChest(loot = [{ type: 'coin', value: 10 }]) {
    const block = new Block([
      new RenderComponent({
        layers: [
          { spriteX: 64, spriteY: 0 }, // Chest (bottom)
          {
            spriteX: 9,
            spriteY: 25,
            width: 23,
            height: 25,
            offsetX: -4,
          }, // Cover (top) - sprite position 9
        ],
      }),
      new PhysicsComponent({ collidable: true }),
      new HealthComponent({ hp: 10 }),
      new DiggableComponent(),
      new LootableComponent({
        spawnEntity: {
          factoryMethod: 'createChest',
          args: [loot],
        },
      }),
    ]);
    return BlockFactory.finalizeBlock(block, 'covered_chest');
  }

  /**
   * Create a protective block (renders with darkness overlay)
   * @param {number} darknessAlpha - Darkness overlay alpha (0-1)
   * @returns {Block}
   */
  static createProtectiveBlock(darknessAlpha = 0.5) {
    const block = new Block([
      new RenderComponent({ spriteX: 80, spriteY: 0 }),
      new PhysicsComponent({ collidable: true }),
      new HealthComponent({ hp: 10 }),
      new DiggableComponent(),
      new DarknessComponent({ alpha: darknessAlpha }),
    ]);
    return BlockFactory.finalizeBlock(block, 'protective_block', { darknessAlpha });
  }

  /**
   * Create a protective mud block (normal mud with darkness overlay)
   * @param {number} darknessAlpha - Darkness overlay alpha (0-1)
   * @returns {Block}
   */
  static createProtectiveMud(darknessAlpha = 0.5) {
    const block = new Block([
      new RenderComponent({ spriteX: 16, spriteY: 0 }),
      new PhysicsComponent({ collidable: true }),
      new HealthComponent({ hp: 5 }),
      new DiggableComponent(),
      new DarknessComponent({ alpha: darknessAlpha }),
    ]);
    const normalizedVariant = Math.min(5, Math.max(1, Math.round(darknessAlpha / 0.1) + 1));
    return BlockFactory.finalizeBlock(block, 'mud', { variant: normalizedVariant });
  }

  /**
   * Determine whether the provided block should be treated as mud.
   * @param {Block|null|undefined} block
   * @returns {boolean}
   */
  static isMud(block) {
    return Boolean(block && block.type === 'mud');
  }

  /**
   * Create a block from legacy numeric type ID
   * @param {number} typeId - Legacy BLOCK_TYPES enum value
   * @param {Object} options - Additional options (hp, darkness, etc.)
   * @returns {Block}
   */
  static fromLegacyType(typeId, options = {}) {
    switch (typeId) {
      case 0: // EMPTY
        return BlockFactory.createEmpty();
      case 1: // MUD_LIGHT
        return BlockFactory.createMud(options.hp || 5);
      case 2: // MUD_MEDIUM
        return BlockFactory.createMud(options.hp || 5);
      case 3: // MUD_DARK
        return BlockFactory.createMud(options.hp || 5);
      case 4: // MUD_DENSE
        return BlockFactory.createMud(options.hp || 5);
      case 5: // MUD_CORE
        return BlockFactory.createMud(options.hp || 5);
      case 6: // ROCK
        return BlockFactory.createRock();
      case 7: // RED_FRAME
        return BlockFactory.createRedFrame();
      case 8: // LAVA
        return BlockFactory.createLava();
      case 9: // GRASS
        return BlockFactory.createGrass();
      case 100: // PROTECTIVE_BLOCK
        return BlockFactory.createProtectiveBlock(options.darkness || 0.5);
      default:
        return BlockFactory.createEmpty();
    }
  }

  /**
   * Create a block from legacy object format
   * @param {Object} blockData - Legacy block data object
   * @returns {Block}
   */
  static fromLegacyObject(blockData) {
    if (typeof blockData === 'number') {
      return BlockFactory.fromLegacyType(blockData);
    }

    // Handle chest
    if (blockData.isChest) {
      return BlockFactory.createChest();
    }

    // Handle protective block
    if (blockData.darkness !== undefined) {
      return BlockFactory.createProtectiveBlock(blockData.darkness);
    }

    // Handle regular block with HP
    return BlockFactory.fromLegacyType(blockData.type, { hp: blockData.hp });
  }
}
