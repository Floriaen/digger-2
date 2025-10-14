/**
 * @file player-behavior.test.js
 * @description End-to-end behavioral tests for player gameplay scenarios
 */

import { vi } from 'vitest';

import { PlayerSystem } from '../../systems/player.system.js';
import { eventBus } from '../../utils/event-bus.js';
import {
  createMockGame,
  createMockTerrain,
  createMockBlock,
  createMockPhysicsComponent,
  createMockDiggableComponent,
  createMockHealthComponent,
  createMockLethalComponent,
  createMockEventBus,
} from '../helpers/mocks.js';

describe('Player Behavior (E2E)', () => {
  let mockGame;
  let mockTerrain;
  let mockEventBus;
  let playerSystem;

  beforeEach(() => {
    // Create mock event bus
    mockEventBus = createMockEventBus();
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
  // A. Starting the Game
  // ==========================================
  describe('Starting the Game', () => {
    it('should spawn player centered horizontally at gridY = 2', () => {
      expect(playerSystem.gridX).toBe(50); // Centered in world width 100
      expect(playerSystem.gridY).toBe(2);
    });

    it('should calculate pixel position correctly', () => {
      expect(playerSystem.x).toBe(50 * 16 + 8); // 808
      expect(playerSystem.y).toBe(2 * 16 + 8);  // 40
    });

    it('should wait for down arrow (hasStarted = false)', () => {
      expect(playerSystem.hasStarted).toBe(false);
      expect(playerSystem.state).toBe('idle');
    });

    it('should start game on first down arrow press', () => {
      mockEventBus.emit('input:move-down');

      expect(playerSystem.hasStarted).toBe(true);
    });

    it('should allow falling even before game started', () => {
      // Mock empty space below
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(false),
      }));

      playerSystem.hasStarted = false;
      playerSystem.update(16);

      expect(playerSystem.state).toBe('falling');
      expect(playerSystem.hasStarted).toBe(true); // Auto-starts on fall
    });
  });

  // ==========================================
  // B. Timer Behavior
  // ==========================================
  describe('Timer Behavior', () => {
    beforeEach(() => {
      // Mock terrain to return solid blocks (prevents falling during timer tests)
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(true),
      }));
    });

    it('should start timer at 60 seconds', () => {
      expect(playerSystem.timerMs).toBe(60000);
    });

    it('should count down timer each frame when started', () => {
      playerSystem.hasStarted = true;

      // Simulate 1 second of gameplay (60 frames at 16ms each)
      for (let i = 0; i < 60; i++) {
        playerSystem.update(16);
      }

      // Timer should have decremented
      expect(playerSystem.timerMs).toBeLessThan(60000);
      expect(playerSystem.timerMs).toBeGreaterThanOrEqual(59000);
    });

    it('should not count down before game started', () => {
      playerSystem.hasStarted = false;
      const initialTimer = playerSystem.timerMs;

      // Mock solid block to prevent fall
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(true),
      }));

      playerSystem.update(100);

      expect(playerSystem.timerMs).toBe(initialTimer);
    });

    it('should emit timer:update when seconds change', () => {
      vi.clearAllMocks();
      playerSystem.hasStarted = true;
      playerSystem.timerMs = 5000;
      playerSystem.lastTimerBroadcastSeconds = 5;

      playerSystem.update(1000); // Tick by 1 second

      expect(mockEventBus.emit).toHaveBeenCalledWith('timer:update', { seconds: 4 });
    });

    it('should trigger death when timer reaches 0', () => {
      vi.clearAllMocks();
      playerSystem.hasStarted = true;
      playerSystem.timerMs = 50;
      playerSystem.dead = false;

      playerSystem.update(100); // Timer goes to 0

      expect(mockEventBus.emit).toHaveBeenCalledWith('player:death', {
        cause: 'time_expired',
        shouldRegenerate: false,
      });
    });

    it('should add time from coin loot', () => {
      playerSystem.hasStarted = true;
      playerSystem.timerMs = 30000;
      playerSystem.lastTimerBroadcastSeconds = 30;

      mockEventBus.emit('block:loot', {
        loot: [{ type: 'coin', value: 10 }],
        timerIncrementSeconds: 5,
      });

      expect(playerSystem.timerMs).toBe(35000);
    });

    it('should cap timer at 60 seconds', () => {
      playerSystem.hasStarted = true;
      playerSystem.timerMs = 58000;
      playerSystem.lastTimerBroadcastSeconds = 58;

      mockEventBus.emit('block:loot', {
        loot: [{ type: 'coin', value: 10 }],
        timerIncrementSeconds: 10,
      });

      expect(playerSystem.timerMs).toBe(60000);
    });
  });

  // ==========================================
  // C. State Transitions
  // ==========================================
  describe('State Transitions', () => {
    beforeEach(() => {
      playerSystem.hasStarted = true;
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(true),
      }));
    });

    it.skip('should transition IDLE → DIGGING when digging down', () => {
      // Mock diggable block below
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        DiggableComponent: createMockDiggableComponent(),
        HealthComponent: createMockHealthComponent(1, 1),
        PhysicsComponent: createMockPhysicsComponent(true),
      }));

      playerSystem.state = 'idle';
      playerSystem.digDirection = { dx: 0, dy: 1 };

      playerSystem.update(16);

      expect(playerSystem.state).toBe('digging');
    });

    it('should transition IDLE → DIGGING_LATERAL when digging sideways', () => {
      // Mock diggable block to the right
      mockTerrain.getBlock.mockImplementation((x, y) => {
        if (x === 51 && y === 2) {
          return createMockBlock({
            DiggableComponent: createMockDiggableComponent(),
            PhysicsComponent: createMockPhysicsComponent(true),
          });
        }
        return createMockBlock({ PhysicsComponent: createMockPhysicsComponent(true) });
      });

      playerSystem.state = 'idle';
      playerSystem.digDirection = { dx: 1, dy: 0 };

      playerSystem.update(16);

      expect(playerSystem.state).toBe('digging_lateral');
    });

    it('should transition IDLE → FALLING when no support below', () => {
      // Mock empty space below
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(false), // Not collidable
      }));

      playerSystem.state = 'idle';
      playerSystem.update(16);

      expect(playerSystem.state).toBe('falling');
    });

    it('should transition IDLE → MOVING for lateral movement', () => {
      playerSystem.state = 'idle';
      playerSystem._beginMovement(51, 2, 120);

      expect(playerSystem.state).toBe('moving');
    });

    it('should transition MOVING → IDLE when animation completes', () => {
      playerSystem._beginMovement(51, 2, 120);

      playerSystem.update(120); // Complete movement

      expect(playerSystem.state).toBe('idle');
    });

    it('should stay in FALLING state until GravitySystem lands player', () => {
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(false),
      }));

      playerSystem.state = 'idle';
      playerSystem.update(16); // Trigger fall

      expect(playerSystem.state).toBe('falling');

      // Multiple updates - should stay falling
      playerSystem.update(16);
      playerSystem.update(16);

      expect(playerSystem.state).toBe('falling');
    });
  });

  // ==========================================
  // D. Death Scenarios
  // ==========================================
  describe('Death Scenarios', () => {
    beforeEach(() => {
      playerSystem.hasStarted = true;
      // Mock solid block to prevent falling
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(true),
      }));
    });

    it.skip('should die from timer expiration', () => {
      vi.clearAllMocks();
      playerSystem.timerMs = 50;
      playerSystem.dead = false;

      playerSystem.update(100);

      expect(mockEventBus.emit).toHaveBeenCalledWith('player:death', {
        cause: 'time_expired',
        shouldRegenerate: false,
      });
      expect(playerSystem.dead).toBe(false); // Event sets it, but we test event emission
    });

    it.skip('should die from lava contact', () => {
      vi.clearAllMocks();

      // Mock lava block ahead
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        LethalComponent: createMockLethalComponent(true),
      }));

      playerSystem.digDirection = { dx: 0, dy: 1 };
      playerSystem.update(16);

      expect(mockEventBus.emit).toHaveBeenCalledWith('player:death', {
        cause: 'lava',
        shouldRegenerate: true,
      });
    });

    it('should die from rock crushing', () => {
      vi.clearAllMocks();

      mockEventBus.emit('block:crushed-player', { cause: 'crushed' });

      expect(mockEventBus.emit).toHaveBeenCalledWith('player:death', {
        cause: 'crushed',
        shouldRegenerate: false,
      });
    });

    it('should set dead = true on player:death event', () => {
      playerSystem.dead = false;

      mockEventBus.emit('player:death', { cause: 'lava' });

      expect(playerSystem.dead).toBe(true);
    });

    it('should stop movement on death', () => {
      playerSystem._beginMovement(51, 2, 120);
      expect(playerSystem.movement.active).toBe(true);

      mockEventBus.emit('player:death', { cause: 'lava' });

      expect(playerSystem.movement.active).toBe(false);
    });

    it('should not process input when dead', () => {
      playerSystem.dead = true;

      mockEventBus.emit('input:move-left');
      mockEventBus.emit('input:move-right');
      mockEventBus.emit('input:move-down');

      expect(playerSystem.requestedDirection).toBe(null);
    });

    it('should not update position when dead', () => {
      const initialX = playerSystem.x;
      const initialY = playerSystem.y;

      playerSystem.dead = true;
      playerSystem.update(100);
      playerSystem.update(100);

      expect(playerSystem.x).toBe(initialX);
      expect(playerSystem.y).toBe(initialY);
      expect(playerSystem.state).toBe('idle');
    });
  });

  // ==========================================
  // E. Respawn Behavior
  // ==========================================
  describe('Respawn Behavior', () => {
    beforeEach(() => {
      // Move player away from spawn
      playerSystem.gridX = 30;
      playerSystem.gridY = 10;
      playerSystem.x = 488;
      playerSystem.y = 168;
      playerSystem.state = 'digging';
      playerSystem.dead = true;
      playerSystem.hasStarted = true;
      playerSystem.timerMs = 15000;
    });

    it('should restore spawn position on resetToSpawn', () => {
      playerSystem.resetToSpawn();

      expect(playerSystem.gridX).toBe(50);
      expect(playerSystem.gridY).toBe(2);
      expect(playerSystem.x).toBe(808);
      expect(playerSystem.y).toBe(40);
    });

    it('should reset all state on resetToSpawn', () => {
      playerSystem.resetToSpawn();

      expect(playerSystem.state).toBe('idle');
      expect(playerSystem.dead).toBe(false);
      expect(playerSystem.hasStarted).toBe(false);
      expect(playerSystem.currentDigTarget).toBe(null);
      expect(playerSystem.digTimer).toBe(0);
      expect(playerSystem.digDirection).toEqual({ dx: 0, dy: 1 });
    });

    it('should reset timer by default', () => {
      playerSystem.resetToSpawn();

      expect(playerSystem.timerMs).toBe(60000);
    });

    it('should optionally preserve timer', () => {
      playerSystem.resetToSpawn({ preserveTimer: true, timerMs: 15000 });

      expect(playerSystem.timerMs).toBe(15000);
      expect(playerSystem.dead).toBe(false); // Other state still reset
    });

    it('should handle player:restart event', () => {
      mockEventBus.emit('player:restart');

      expect(playerSystem.gridX).toBe(50);
      expect(playerSystem.dead).toBe(false);
      expect(playerSystem.timerMs).toBe(60000); // Reset by default
    });

    it('should preserve timer on restart when requested', () => {
      mockEventBus.emit('player:restart', { preserveTimer: true });

      expect(playerSystem.timerMs).toBe(15000); // Preserved
    });
  });

  // ==========================================
  // F. Movement Behavior
  // ==========================================
  describe('Movement Behavior', () => {
    beforeEach(() => {
      playerSystem.hasStarted = true;
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(true),
      }));
    });

    it('should interpolate position during horizontal movement', () => {
      const startX = playerSystem.x;
      playerSystem._beginMovement(51, 2, 120);

      playerSystem.update(60); // 50% progress

      expect(playerSystem.x).toBeGreaterThan(startX);
      expect(playerSystem.x).toBeLessThan(51 * 16 + 8);
    });

    it('should snap to target position when movement completes', () => {
      playerSystem._beginMovement(51, 2, 120);

      playerSystem.update(120); // 100% progress

      expect(playerSystem.x).toBe(51 * 16 + 8); // Exact target
      expect(playerSystem.gridX).toBe(51);
    });

    it('should set requestedDirection on arrow key press', () => {
      mockEventBus.emit('input:move-left');
      expect(playerSystem.requestedDirection).toEqual({ dx: -1, dy: 0 });

      mockEventBus.emit('input:move-right');
      expect(playerSystem.requestedDirection).toEqual({ dx: 1, dy: 0 });

      mockEventBus.emit('input:move-down');
      expect(playerSystem.requestedDirection).toEqual({ dx: 0, dy: 1 });
    });

    it('should update digDirection when changing direction', () => {
      playerSystem.digDirection = { dx: 0, dy: 1 };
      playerSystem.requestedDirection = { dx: 1, dy: 0 };

      // Mock diggable block to the right
      mockTerrain.getBlock.mockImplementation((x, y) => {
        if (x === 51) {
          return createMockBlock({
            DiggableComponent: createMockDiggableComponent(),
          });
        }
        return createMockBlock({ PhysicsComponent: createMockPhysicsComponent(true) });
      });

      playerSystem.update(16);

      expect(playerSystem.digDirection).toEqual({ dx: 1, dy: 0 });
    });

    it('should reset direction to down when hitting solid block', () => {
      playerSystem.digDirection = { dx: 1, dy: 0 };

      // Mock solid (non-diggable) block to the right
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(true),
      }));

      playerSystem.update(16);

      expect(playerSystem.digDirection).toEqual({ dx: 0, dy: 1 });
    });
  });

  // ==========================================
  // G. Complex Scenarios
  // ==========================================
  describe('Complex Scenarios', () => {
    beforeEach(() => {
      playerSystem.hasStarted = true;
    });

    it('should handle rapid state transitions', () => {
      // IDLE → FALLING → DIGGING sequence
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(false),
      }));

      playerSystem.update(16); // Trigger fall
      expect(playerSystem.state).toBe('falling');

      // Simulate landing (GravitySystem would call this)
      const landingBlock = createMockBlock({
        DiggableComponent: createMockDiggableComponent(),
      });
      playerSystem.handleLanding(landingBlock, 50, 3);

      expect(playerSystem.state).toBe('digging');
    });

    it('should maintain state consistency across multiple updates', () => {
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(true),
      }));

      // Run many update cycles
      for (let i = 0; i < 100; i++) {
        playerSystem.update(16);
      }

      // Should still be in valid state
      expect(['idle', 'digging', 'falling', 'moving', 'digging_lateral']).toContain(
        playerSystem.state,
      );
      expect(typeof playerSystem.gridX).toBe('number');
      expect(typeof playerSystem.gridY).toBe('number');
    });

    it('should handle simultaneous events correctly', () => {
      vi.clearAllMocks();

      // Death + restart in quick succession
      mockEventBus.emit('player:death', { cause: 'lava' });
      expect(playerSystem.dead).toBe(true);

      mockEventBus.emit('player:restart');
      expect(playerSystem.dead).toBe(false);
      expect(playerSystem.gridX).toBe(50);
      expect(playerSystem.gridY).toBe(2);
    });
  });
});
