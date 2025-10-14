import { Block } from '../entities/block.entity.js';
import { RenderComponent } from '../components/block/render.component.js';
import { SPRITE_ATLAS } from '../rendering/sprite-atlas.js';
import { PhysicsComponent } from '../components/block/physics.component.js';
import { HealthComponent } from '../components/block/health.component.js';
import { DiggableComponent } from '../components/block/diggable.component.js';
import { FallableComponent } from '../components/block/fallable.component.js';
import { DarknessComponent } from '../components/block/darkness.component.js';
import { LootableComponent } from '../components/block/lootable.component.js';
import { LethalComponent } from '../components/block/lethal.component.js';
import { PauseOnDestroyComponent } from '../components/block/pause-on-destroy.component.js';
import { DoorComponent } from '../components/block/door.component.js';

function spriteToComponentProps(sprite) {
  if (!sprite) {
    return {};
  }

  const props = {
    spriteX: sprite.x,
    spriteY: sprite.y,
  };

  if (sprite.width !== undefined) {
    props.spriteWidth = sprite.width;
  }

  if (sprite.height !== undefined) {
    props.spriteHeight = sprite.height;
  }

  if (sprite.offsetX !== undefined) {
    props.offsetX = sprite.offsetX;
  }

  if (sprite.offsetY !== undefined) {
    props.offsetY = sprite.offsetY;
  }

  return props;
}

function spriteToLayerProps(sprite) {
  if (!sprite) {
    return {};
  }

  const layer = {
    spriteX: sprite.x,
    spriteY: sprite.y,
  };

  if (sprite.width !== undefined) {
    layer.width = sprite.width;
  }

  if (sprite.height !== undefined) {
    layer.height = sprite.height;
  }

  if (sprite.offsetX !== undefined) {
    layer.offsetX = sprite.offsetX;
  }

  if (sprite.offsetY !== undefined) {
    layer.offsetY = sprite.offsetY;
  }

  return layer;
}

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

    const mudVariants = SPRITE_ATLAS.mud_variants || [];
    const variantIndex = Math.min(mudVariants.length - 1, Math.max(0, variant - 1));
    const mudSprite = mudVariants[variantIndex] || mudVariants[0] || SPRITE_ATLAS.mud_light;

    const components = [
      new RenderComponent(spriteToComponentProps(mudSprite)),
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
    const sprite = SPRITE_ATLAS.rock;
    const block = new Block([
      new RenderComponent(spriteToComponentProps(sprite)),
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
    const sprite = SPRITE_ATLAS.pause_crystal;
    const block = new Block([
      new RenderComponent(spriteToComponentProps(sprite)),
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
    const sprite = SPRITE_ATLAS.red_frame;
    const block = new Block([
      new RenderComponent(spriteToComponentProps(sprite)),
      new PhysicsComponent({ collidable: true }),
      new HealthComponent({ hp: 5 }),
      new DiggableComponent(),
    ]);
    return BlockFactory.finalizeBlock(block, 'red_frame');
  }

  /**
   * Create a door block (non-collidable trigger for level transition)
   * @returns {Block}
   */
  static createDoor() {
    const sprite = SPRITE_ATLAS.door;
    const block = new Block([
      new RenderComponent(spriteToComponentProps(sprite)),
      new PhysicsComponent({ collidable: false }),
      new DoorComponent(),
    ]);
    return BlockFactory.finalizeBlock(block, 'door');
  }

  /**
   * Create an indestructible doorstep block (supports the door platform)
   * @returns {Block}
   */
  static createDoorstep() {
    const sprite = SPRITE_ATLAS.doorstep;
    const block = new Block([
      new RenderComponent(spriteToComponentProps(sprite)),
      new PhysicsComponent({ collidable: true }),
    ]);
    return BlockFactory.finalizeBlock(block, 'doorstep');
  }

  /**
   * Create a lava block (traversable but deadly)
   * @returns {Block}
   */
  static createLava() {
    const {
      x,
      y,
      width,
      height,
    } = SPRITE_ATLAS.lava;
    const block = new Block([
      new RenderComponent({
        spriteX: x,
        spriteY: y,
        spriteWidth: width,
        spriteHeight: height,
      }),
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
    const sprite = SPRITE_ATLAS.grass;
    const block = new Block([
      new RenderComponent(spriteToComponentProps(sprite)),
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
    const sprite = SPRITE_ATLAS.chest_base;
    const block = new Block([
      new RenderComponent(spriteToComponentProps(sprite)),
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
    const baseSprite = SPRITE_ATLAS.chest_base;
    const coverSprite = SPRITE_ATLAS.chest_cover;
    const block = new Block([
      new RenderComponent({
        layers: [
          spriteToLayerProps(baseSprite),
          spriteToLayerProps(coverSprite),
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
    const sprite = SPRITE_ATLAS.protective_block;
    const block = new Block([
      new RenderComponent(spriteToComponentProps(sprite)),
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
    const normalizedVariant = Math.min(5, Math.max(1, Math.round(darknessAlpha / 0.1) + 1));
    const mudVariants = SPRITE_ATLAS.mud_variants || [];
    const variantIndex = Math.min(mudVariants.length - 1, Math.max(0, normalizedVariant - 1));
    const mudSprite = mudVariants[variantIndex] || mudVariants[0] || SPRITE_ATLAS.mud_light;

    const block = new Block([
      new RenderComponent(spriteToComponentProps(mudSprite)),
      new PhysicsComponent({ collidable: true }),
      new HealthComponent({ hp: 5 }),
      new DiggableComponent(),
      new DarknessComponent({ alpha: darknessAlpha }),
    ]);
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
}
