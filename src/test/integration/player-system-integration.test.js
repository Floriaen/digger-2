/**
 * @file player-system-integration.test.js
 * @description Integration tests for PlayerSystem with terrain and event handling
 */

import { vi } from 'vitest';

import { PlayerSystem } from '../../systems/player.system.js';
import { eventBus } from '../../utils/event-bus.js';
import {
  createMockGame,
  createMockTerrain,
  createMockBlock,
  createMockPhysicsComponent,
  createMockLethalComponent,
  createMockDoorComponent,
  createMockEventBus,
} from '../helpers/mocks.js';

describe('PlayerSystem Integration', () => {
  let mockGame;
  let mockTerrain;
  let mockEventBus;
  let playerSystem;

  beforeEach(() => {
    // Create mock event bus
    mockEventBus = createMockEventBus();

    // Replace real event bus with mock
    Object.assign(eventBus, mockEventBus);

    // Create mock terrain
    mockTerrain = createMockTerrain(100);

    // Create mock game
    mockGame = createMockGame({
      components: [mockTerrain],
    });

    // Create player system
    playerSystem = new PlayerSystem(mockGame);
    playerSystem.init();
  });

  afterEach(() => {
    if (typeof jest !== 'undefined') {
      vi.clearAllMocks();
    }
  });

  // ==========================================
  // A. Input Event Handling
  // ==========================================
  describe('Input Event Handling', () => {
    beforeEach(() => {
      playerSystem.hasStarted = true; // Enable input processing
    });

    it('should set requestedDirection to left on input:move-left', () => {
      mockEventBus.emit('input:move-left');

      expect(playerSystem.requestedDirection).toEqual({ dx: -1, dy: 0 });
    });

    it('should set requestedDirection to right on input:move-right', () => {
      mockEventBus.emit('input:move-right');

      expect(playerSystem.requestedDirection).toEqual({ dx: 1, dy: 0 });
    });

    it('should set hasStarted = true on first input:move-down', () => {
      playerSystem.hasStarted = false;

      mockEventBus.emit('input:move-down');

      expect(playerSystem.hasStarted).toBe(true);
      expect(playerSystem.requestedDirection).toBe(null); // Not set on first press
    });

    it('should set requestedDirection on subsequent input:move-down', () => {
      playerSystem.hasStarted = true;

      mockEventBus.emit('input:move-down');

      expect(playerSystem.requestedDirection).toEqual({ dx: 0, dy: 1 });
    });

    it('should ignore input when dead', () => {
      playerSystem.dead = true;

      mockEventBus.emit('input:move-left');
      mockEventBus.emit('input:move-right');
      mockEventBus.emit('input:move-down');

      expect(playerSystem.requestedDirection).toBe(null);
    });

    it('should ignore directional input when not started (except down)', () => {
      playerSystem.hasStarted = false;

      mockEventBus.emit('input:move-left');
      expect(playerSystem.requestedDirection).toBe(null);

      mockEventBus.emit('input:move-right');
      expect(playerSystem.requestedDirection).toBe(null);
    });
  });

  // ==========================================
  // B. Death Event Handling
  // ==========================================
  describe('Death Event Handling', () => {
    it('should set dead = true on player:death', () => {
      mockEventBus.emit('player:death', { cause: 'lava' });

      expect(playerSystem.dead).toBe(true);
    });

    it('should stop movement on player:death', () => {
      playerSystem.movement.active = true;

      mockEventBus.emit('player:death', { cause: 'lava' });

      expect(playerSystem.movement.active).toBe(false);
    });

    it('should emit player:death on block:crushed-player', () => {
      vi.clearAllMocks();

      mockEventBus.emit('block:crushed-player', { cause: 'crushed' });

      expect(mockEventBus.emit).toHaveBeenCalledWith('player:death', {
        cause: 'crushed',
        shouldRegenerate: false,
      });
    });

    it('should not emit player:death if already dead', () => {
      playerSystem.dead = true;
      vi.clearAllMocks();

      mockEventBus.emit('block:crushed-player', { cause: 'crushed' });

      expect(mockEventBus.emit).not.toHaveBeenCalledWith('player:death', expect.any(Object));
    });
  });

  // ==========================================
  // C. Restart Event Handling
  // ==========================================
  describe('Restart Event Handling', () => {
    beforeEach(() => {
      // Modify player state
      playerSystem.gridX = 30;
      playerSystem.gridY = 10;
      playerSystem.dead = true;
      playerSystem.timerMs = 15000;
    });

    it('should call resetToSpawn on player:restart', () => {
      const spy = vi.spyOn(playerSystem, 'resetToSpawn');

      mockEventBus.emit('player:restart');

      expect(spy).toHaveBeenCalled();
    });

    it('should preserve timer when preserveTimer = true', () => {
      mockEventBus.emit('player:restart', { preserveTimer: true });

      expect(playerSystem.timerMs).toBe(15000); // Preserved
      expect(playerSystem.dead).toBe(false); // But still reset state
    });

    it('should reset timer when preserveTimer = false', () => {
      mockEventBus.emit('player:restart', { preserveTimer: false });

      expect(playerSystem.timerMs).toBe(60000); // Reset
    });

    it('should reset timer by default (no options)', () => {
      mockEventBus.emit('player:restart');

      expect(playerSystem.timerMs).toBe(60000);
    });

    it('should not preserve timer if timer is 0', () => {
      playerSystem.timerMs = 0;

      mockEventBus.emit('player:restart', { preserveTimer: true });

      expect(playerSystem.timerMs).toBe(60000); // Reset because timer was 0
    });
  });

  // ==========================================
  // D. Loot Event Handling
  // ==========================================
  describe('Loot Event Handling', () => {
    it('should add timer seconds for coin loot', () => {
      playerSystem.timerMs = 30000;
      playerSystem.lastTimerBroadcastSeconds = 30;

      mockEventBus.emit('block:loot', {
        loot: [{ type: 'coin', value: 10 }],
        timerIncrementSeconds: 5,
      });

      expect(playerSystem.timerMs).toBe(35000);
    });

    it('should ignore non-coin loot', () => {
      playerSystem.timerMs = 30000;

      mockEventBus.emit('block:loot', {
        loot: [{ type: 'gem', value: 100 }],
        timerIncrementSeconds: 5,
      });

      expect(playerSystem.timerMs).toBe(30000); // Unchanged
    });

    it('should ignore loot when dead', () => {
      playerSystem.timerMs = 30000;
      playerSystem.dead = true;

      mockEventBus.emit('block:loot', {
        loot: [{ type: 'coin', value: 10 }],
        timerIncrementSeconds: 5,
      });

      expect(playerSystem.timerMs).toBe(30000); // Unchanged
    });

    it('should ignore invalid timerIncrementSeconds', () => {
      playerSystem.timerMs = 30000;

      mockEventBus.emit('block:loot', {
        loot: [{ type: 'coin', value: 10 }],
        timerIncrementSeconds: 0,
      });

      expect(playerSystem.timerMs).toBe(30000);

      mockEventBus.emit('block:loot', {
        loot: [{ type: 'coin', value: 10 }],
        timerIncrementSeconds: -5,
      });

      expect(playerSystem.timerMs).toBe(30000);
    });

    it('should cap timer at max (60 seconds)', () => {
      playerSystem.timerMs = 58000;
      playerSystem.lastTimerBroadcastSeconds = 58;

      mockEventBus.emit('block:loot', {
        loot: [{ type: 'coin', value: 10 }],
        timerIncrementSeconds: 5,
      });

      expect(playerSystem.timerMs).toBe(60000); // Capped
    });

    it('should ignore empty loot array', () => {
      playerSystem.timerMs = 30000;

      mockEventBus.emit('block:loot', {
        loot: [],
        timerIncrementSeconds: 5,
      });

      expect(playerSystem.timerMs).toBe(30000);
    });

    it('should ignore loot with mixed types (no coins)', () => {
      playerSystem.timerMs = 30000;

      mockEventBus.emit('block:loot', {
        loot: [
          { type: 'gem', value: 100 },
          { type: 'key', value: 1 },
        ],
        timerIncrementSeconds: 5,
      });

      expect(playerSystem.timerMs).toBe(30000);
    });

    it('should add time if any loot item is a coin', () => {
      playerSystem.timerMs = 30000;
      playerSystem.lastTimerBroadcastSeconds = 30;

      mockEventBus.emit('block:loot', {
        loot: [
          { type: 'gem', value: 100 },
          { type: 'coin', value: 10 }, // Has coin
        ],
        timerIncrementSeconds: 5,
      });

      expect(playerSystem.timerMs).toBe(35000);
    });
  });

  // ==========================================
  // E. Update Cycle
  // ==========================================
  describe('Update Cycle', () => {
    beforeEach(() => {
      // Setup default terrain response (solid block below player)
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(true),
      }));
    });

    it('should return early if no terrain', () => {
      const gameWithoutTerrain = createMockGame({ components: [] });
      const player = new PlayerSystem(gameWithoutTerrain);
      player.init();

      expect(() => {
        player.update(16);
      }).not.toThrow();
    });

    it('should set state to IDLE when transitioning', () => {
      playerSystem.transitioning = true;
      playerSystem.state = 'digging';

      playerSystem.update(16);

      expect(playerSystem.state).toBe('idle');
    });

    it('should set state to IDLE when dead', () => {
      playerSystem.dead = true;
      playerSystem.state = 'digging';

      playerSystem.update(16);

      expect(playerSystem.state).toBe('idle');
    });

    it('should stay IDLE when not started', () => {
      playerSystem.hasStarted = false;
      playerSystem.state = 'idle';

      playerSystem.update(16);

      expect(playerSystem.state).toBe('idle');
    });

    it('should check for fall when not started', () => {
      playerSystem.hasStarted = false;

      // Mock empty space below
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(false), // Not collidable
      }));

      playerSystem.update(16);

      // Should trigger fall even before game started
      expect(playerSystem.state).toBe('falling');
      expect(playerSystem.hasStarted).toBe(true);
    });

    it('should tick timer when hasStarted = true', () => {
      playerSystem.hasStarted = true;
      playerSystem.timerMs = 5000;

      playerSystem.update(100);

      expect(playerSystem.timerMs).toBe(4900);
    });

    it('should not tick timer when not started', () => {
      playerSystem.hasStarted = false;
      playerSystem.timerMs = 5000;

      playerSystem.update(100);

      expect(playerSystem.timerMs).toBe(5000); // Unchanged
    });

    it('should update movement when state = MOVING', () => {
      playerSystem.hasStarted = true;
      playerSystem._beginMovement(51, 2, 120);

      playerSystem.update(60); // 50% progress

      // Position should be interpolated
      expect(playerSystem.x).toBeGreaterThan(808);
      expect(playerSystem.x).toBeLessThan(824);
    });

    it('should accumulate digTimer', () => {
      playerSystem.hasStarted = true;
      playerSystem.digTimer = 0;

      playerSystem.update(10);
      expect(playerSystem.digTimer).toBe(10);

      playerSystem.update(15);
      expect(playerSystem.digTimer).toBe(25);
    });

    it('should delegate falling to GravitySystem (state = FALLING)', () => {
      playerSystem.hasStarted = true;
      playerSystem.state = 'falling';

      // Update should return early, letting GravitySystem handle falling
      playerSystem.update(16);

      // State should remain FALLING (not changed by update)
      expect(playerSystem.state).toBe('falling');
    });
  });

  // ==========================================
  // F. Level Transition Integration
  // ==========================================
  describe('Level Transition', () => {
    it('should emit level:transition event when entering active door', () => {
      vi.clearAllMocks();

      const door = createMockDoorComponent(true);
      const doorBlock = createMockBlock({ DoorComponent: door });

      playerSystem.enterDoor(doorBlock, 10, 10, 'test');

      expect(mockEventBus.emit).toHaveBeenCalledWith('level:transition', {
        door: { gridX: 10, gridY: 10 },
        source: 'test',
        triggerId: expect.any(Number),
      });
    });

    it('should handle level:transition:complete event', () => {
      playerSystem.transitioning = true;
      playerSystem.timerBeforeTransition = 30000;

      mockEventBus.emit('level:transition:complete');

      expect(playerSystem.transitioning).toBe(false);
      expect(playerSystem.hasStarted).toBe(true);
    });
  });

  // ==========================================
  // G. Digging Integration
  // ==========================================
  describe('Digging Integration', () => {
    beforeEach(() => {
      playerSystem.hasStarted = true;
      playerSystem.state = 'idle';
      // Default: solid block support
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(true),
      }));
    });

    it.skip('should trigger death when digging lava block', () => {
      vi.clearAllMocks();

      // Setup lava block ahead
      const lavaBlock = createMockBlock({
        LethalComponent: createMockLethalComponent(true),
      });

      mockTerrain.getBlock.mockImplementation((x, y) => {
        if (x === 50 && y === 3) return lavaBlock; // Block ahead
        return createMockBlock({ PhysicsComponent: createMockPhysicsComponent(true) });
      });

      playerSystem.digDirection = { dx: 0, dy: 1 };
      playerSystem.update(16);

      expect(mockEventBus.emit).toHaveBeenCalledWith('player:death', {
        cause: 'lava',
        shouldRegenerate: true,
      });
    });

    it.skip('should enter door when digging into door block', () => {
      const door = createMockDoorComponent(true);
      const doorBlock = createMockBlock({
        DoorComponent: door,
      });

      mockTerrain.getBlock.mockImplementation((x, y) => {
        if (x === 50 && y === 3) return doorBlock;
        return createMockBlock({ PhysicsComponent: createMockPhysicsComponent(true) });
      });

      playerSystem.digDirection = { dx: 0, dy: 1 };
      playerSystem.update(16);

      expect(playerSystem.transitioning).toBe(true);
    });
  });
});
