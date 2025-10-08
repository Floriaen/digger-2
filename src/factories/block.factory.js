import { Block } from '../entities/block.entity.js';
import { RenderComponent } from '../components/blocks/render.component.js';
import { PhysicsComponent } from '../components/blocks/physics.component.js';
import { HealthComponent } from '../components/blocks/health.component.js';
import { DiggableComponent } from '../components/blocks/diggable.component.js';
import { FallableComponent } from '../components/blocks/fallable.component.js';
import { DarknessComponent } from '../components/blocks/darkness.component.js';
import { LootableComponent } from '../components/blocks/lootable.component.js';
import { LethalComponent } from '../components/blocks/lethal.component.js';
import { PauseOnDestroyComponent } from '../components/blocks/pause-on-destroy.component.js';

/**
 * BlockFactory
 *
 * Creates Block entities with appropriate component composition.
 * This is the single source of truth for block definitions in the ECS architecture.
 */
export class BlockFactory {
  /**
   * Create an empty (air) block
   * @returns {Block}
   */
  static createEmpty() {
    return new Block([
      new PhysicsComponent({ collidable: false }),
    ]);
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
    block.type = 'mud';
    return block;
  }

  /**
   * Create a rock block (falls when unsupported)
   * @returns {Block}
   */
  static createRock() {
    return new Block([
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
  }

  /**
   * Create a pause crystal block (pauses game when destroyed)
   * @returns {Block}
   */
  static createPauseCrystal() {
    return new Block([
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
  }

  /**
   * Create a red frame block (torus)
   * @returns {Block}
   */
  static createRedFrame() {
    return new Block([
      new RenderComponent({ spriteX: 32, spriteY: 0 }),
      new PhysicsComponent({ collidable: true }),
      new HealthComponent({ hp: 5 }),
      new DiggableComponent(),
    ]);
  }

  /**
   * Create a lava block (traversable but deadly)
   * @returns {Block}
   */
  static createLava() {
    return new Block([
      new RenderComponent({ spriteX: 64, spriteY: 0 }),
      new PhysicsComponent({ collidable: false }),
      new LethalComponent(),
    ]);
  }

  /**
   * Create a grass block
   * @returns {Block}
   */
  static createGrass() {
    return new Block([
      new RenderComponent({ spriteX: 0, spriteY: 0 }),
      new PhysicsComponent({ collidable: true }),
      new HealthComponent({ hp: 5 }),
      new DiggableComponent(),
    ]);
  }

  /**
   * Create a chest block (drops loot when destroyed)
   * @param {Array} loot - Array of loot items to drop
   * @returns {Block}
   */
  static createChest(loot = [{ type: 'coin', value: 10 }]) {
    return new Block([
      new RenderComponent({ spriteX: 64, spriteY: 0 }),
      new PhysicsComponent({ collidable: true }),
      new HealthComponent({ hp: 15 }),
      new DiggableComponent(),
      new LootableComponent({ loot }),
      new FallableComponent(),
    ]);
  }

  /**
   * Create a covered chest (chest with cover that must be dug first)
   * When destroyed, spawns a regular chest at the same position
   * @param {Array} loot - Array of loot items for the chest underneath
   * @returns {Block}
   */
  static createCoveredChest(loot = [{ type: 'coin', value: 10 }]) {
    return new Block([
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
  }

  /**
   * Create a protective block (renders with darkness overlay)
   * @param {number} darknessAlpha - Darkness overlay alpha (0-1)
   * @returns {Block}
   */
  static createProtectiveBlock(darknessAlpha = 0.5) {
    return new Block([
      new RenderComponent({ spriteX: 80, spriteY: 0 }),
      new PhysicsComponent({ collidable: true }),
      new HealthComponent({ hp: 10 }),
      new DiggableComponent(),
      new DarknessComponent({ alpha: darknessAlpha }),
    ]);
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
    block.type = 'mud';
    return block;
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
