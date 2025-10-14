/**
 * @file mocks.js
 * @description Shared mock utilities for testing
 */

import { vi } from 'vitest';

/**
 * Create a mock game instance
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock game object
 */
export function createMockGame(overrides = {}) {
  return {
    components: [],
    canvas: {
      width: 800,
      height: 600,
      getContext: () => createMockCanvasContext(),
    },
    ctx: createMockCanvasContext(),
    pause: vi.fn(),
    ...overrides,
  };
}

/**
 * Create a mock terrain system
 * @param {number} worldWidthTiles - World width in tiles
 * @returns {Object} Mock terrain
 */
export function createMockTerrain(worldWidthTiles = 100) {
  return {
    constructor: { name: 'TerrainSystem' },
    worldWidthTiles,
    getBlock: vi.fn(),
    setBlock: vi.fn(),
  };
}

/**
 * Create a mock block entity
 * @param {Object} components - Map of ComponentClass → instance
 * @returns {Object} Mock block
 */
export function createMockBlock(components = {}) {
  const componentMap = new Map();
  Object.entries(components).forEach(([name, instance]) => {
    // Handle both string names and class constructors
    const componentName = typeof name === 'string' ? name : name.name;
    componentMap.set(componentName, instance);
  });

  return {
    has: vi.fn((ComponentClass) => {
      const name = typeof ComponentClass === 'string' ? ComponentClass : ComponentClass.name;
      return componentMap.has(name);
    }),
    get: vi.fn((ComponentClass) => {
      const name = typeof ComponentClass === 'string' ? ComponentClass : ComponentClass.name;
      return componentMap.get(name);
    }),
    components: componentMap,
  };
}

/**
 * Create a mock PhysicsComponent
 * @param {boolean} collidable - Whether block is collidable
 * @returns {Object} Mock physics component
 */
export function createMockPhysicsComponent(collidable = true) {
  return {
    constructor: { name: 'PhysicsComponent' },
    isCollidable: vi.fn(() => collidable),
    collidable,
  };
}

/**
 * Create a mock DiggableComponent
 * @param {Object} options - Component options
 * @returns {Object} Mock diggable component
 */
export function createMockDiggableComponent(options = {}) {
  return {
    constructor: { name: 'DiggableComponent' },
    dig: vi.fn(() => ({
      hp: options.hp ?? 0,
      destroyed: options.destroyed ?? true,
    })),
  };
}

/**
 * Create a mock HealthComponent
 * @param {number} hp - Current health
 * @param {number} maxHp - Maximum health
 * @returns {Object} Mock health component
 */
export function createMockHealthComponent(hp = 1, maxHp = 1) {
  return {
    constructor: { name: 'HealthComponent' },
    hp,
    maxHp,
  };
}

/**
 * Create a mock LethalComponent
 * @param {boolean} shouldRegenerate - Whether terrain should regenerate on death
 * @returns {Object} Mock lethal component
 */
export function createMockLethalComponent(shouldRegenerate = true) {
  return {
    constructor: { name: 'LethalComponent' },
    shouldRegenerate,
  };
}

/**
 * Create a mock DoorComponent
 * @param {boolean} active - Whether door is active
 * @returns {Object} Mock door component
 */
export function createMockDoorComponent(active = true) {
  return {
    constructor: { name: 'DoorComponent' },
    isActive: vi.fn(() => active),
    deactivate: vi.fn(),
  };
}

/**
 * Create a mock LootableComponent
 * @param {Object} options - Loot options
 * @returns {Object} Mock lootable component
 */
export function createMockLootableComponent(options = {}) {
  return {
    constructor: { name: 'LootableComponent' },
    hasSpawnEntity: vi.fn(() => options.hasSpawnEntity ?? false),
    getSpawnEntity: vi.fn(() => options.spawnEntity ?? null),
  };
}

/**
 * Create a mock camera system
 * @returns {Object} Mock camera
 */
export function createMockCamera() {
  return {
    constructor: { name: 'CameraSystem' },
    getViewBounds: vi.fn(() => ({
      left: 0,
      right: 800,
      top: 0,
      bottom: 600,
    })),
  };
}

/**
 * Create a mock canvas context
 * @returns {Object} Mock 2D context
 */
export function createMockCanvasContext() {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    rect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clip: vi.fn(),
    setTransform: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
  };
}

/**
 * Create a mock event bus
 * @returns {Object} Mock event bus with on/emit methods
 */
export function createMockEventBus() {
  const listeners = new Map();

  return {
    on: vi.fn((event, callback) => {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event).push(callback);

      // Return unsubscribe function
      return vi.fn(() => {
        const callbacks = listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      });
    }),
    emit: vi.fn((event, data) => {
      const callbacks = listeners.get(event) || [];
      callbacks.forEach((callback) => callback(data));
    }),
    listeners, // Expose for testing
  };
}
