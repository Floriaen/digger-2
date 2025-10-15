/**
 * @file player-system.test.js
 * @description Unit tests for existing PlayerSystem (before refactor)
 * These tests document current behavior and will serve as regression tests
 */

import { vi } from 'vitest';

import { PlayerSystem } from '../../systems/player.system.js';
import { eventBus } from '../../utils/event-bus.js';
import { DIG_INTERVAL_MS } from '../../utils/config.js';
import {
  createMockGame,
  createMockTerrain,
  createMockBlock,
  createMockPhysicsComponent,
  createMockDiggableComponent,
  createMockDoorComponent,
} from '../helpers/mocks.js';

// Mock event bus module
// Note: We'll manually override eventBus in beforeEach instead of using jest.mock
// because ES modules + Jest can be tricky

describe('PlayerSystem', () => {
  let mockGame;
  let mockTerrain;
  let playerSystem;

  beforeEach(() => {
    // Reset all mocks
    if (typeof jest !== 'undefined') {
      vi.clearAllMocks();
    }

    // Mock event bus methods
    eventBus.on = vi.fn(() => vi.fn());
    eventBus.emit = vi.fn();

    // Create mock terrain
    mockTerrain = createMockTerrain(100);

    // Create mock game
    mockGame = createMockGame({
      components: [mockTerrain],
    });

    // Create player system
    playerSystem = new PlayerSystem(mockGame);
  });

  // ==========================================
  // A. Initialization Tests
  // ==========================================
  describe('Initialization', () => {
    it('should initialize with game reference', () => {
      expect(playerSystem.game).toBe(mockGame);
    });

    it('should center player horizontally based on world width', () => {
      playerSystem.init();

      // World width = 100, so center = 50
      expect(playerSystem.gridX).toBe(50);
    });

    it('should spawn at gridY = 2', () => {
      playerSystem.init();

      expect(playerSystem.gridY).toBe(2);
    });

    it('should calculate pixel position as (gridX * 16 + 8, gridY * 16 + 8)', () => {
      playerSystem.init();

      // gridX = 50, gridY = 2
      expect(playerSystem.x).toBe(50 * 16 + 8); // 808
      expect(playerSystem.y).toBe(2 * 16 + 8); // 40
    });

    it('should store spawn reference', () => {
      playerSystem.init();

      expect(playerSystem.spawnGridX).toBe(50);
      expect(playerSystem.spawnGridY).toBe(2);
      expect(playerSystem.spawnX).toBe(808);
      expect(playerSystem.spawnY).toBe(40);
    });

    it('should initialize timer to 60 seconds (60000 ms)', () => {
      playerSystem.init();

      expect(playerSystem.timerMs).toBe(60000);
    });

    it('should start in IDLE state', () => {
      playerSystem.init();

      expect(playerSystem.state).toBe('idle');
    });

    it('should set hasStarted = false', () => {
      playerSystem.init();

      expect(playerSystem.hasStarted).toBe(false);
    });

    it('should set dead = false', () => {
      playerSystem.init();

      expect(playerSystem.dead).toBe(false);
    });

    it('should create FallableComponent', () => {
      playerSystem.init();

      expect(playerSystem.fallable).toBeDefined();
      expect(playerSystem.fallable.constructor.name).toBe('FallableComponent');
    });

    it('should initialize digDirection to {dx: 0, dy: 1}', () => {
      playerSystem.init();

      expect(playerSystem.digDirection).toEqual({ dx: 0, dy: 1 });
    });

    it('should initialize movement object', () => {
      playerSystem.init();

      expect(playerSystem.movement).toBeDefined();
      expect(playerSystem.movement.active).toBe(false);
      expect(playerSystem.movement.duration).toBe(120); // HORIZONTAL_MOVE_DURATION_MS
    });

    it('should handle missing TerrainSystem gracefully', () => {
      const gameWithoutTerrain = createMockGame({ components: [] });
      const player = new PlayerSystem(gameWithoutTerrain);

      expect(() => player.init()).not.toThrow();
      // Should use fallback width
      expect(player.gridX).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // B. Public Interface (State Properties)
  // ==========================================
  describe('Public Interface', () => {
    beforeEach(() => {
      playerSystem.init();
    });

    it('should expose gridX property (number)', () => {
      expect(typeof playerSystem.gridX).toBe('number');
      expect(playerSystem.gridX).toBe(50);
    });

    it('should expose gridY property (number)', () => {
      expect(typeof playerSystem.gridY).toBe('number');
      expect(playerSystem.gridY).toBe(2);
    });

    it('should expose x property (number)', () => {
      expect(typeof playerSystem.x).toBe('number');
      expect(playerSystem.x).toBe(808);
    });

    it('should expose y property (number)', () => {
      expect(typeof playerSystem.y).toBe('number');
      expect(playerSystem.y).toBe(40);
    });

    it('should expose state property (string)', () => {
      expect(typeof playerSystem.state).toBe('string');
      expect([
        'idle',
        'digging',
        'falling',
        'moving',
        'digging_lateral',
      ]).toContain(playerSystem.state);
    });

    it('should expose dead property (boolean)', () => {
      expect(typeof playerSystem.dead).toBe('boolean');
      expect(playerSystem.dead).toBe(false);
    });

    it('should expose hasStarted property (boolean)', () => {
      expect(typeof playerSystem.hasStarted).toBe('boolean');
      expect(playerSystem.hasStarted).toBe(false);
    });

    it('should expose timerMs property (number)', () => {
      expect(typeof playerSystem.timerMs).toBe('number');
      expect(playerSystem.timerMs).toBe(60000);
    });

    it('should expose movement object', () => {
      expect(playerSystem.movement).toBeDefined();
      expect(playerSystem.movement.active).toBe(false);
    });

    it('should expose digDirection object', () => {
      expect(playerSystem.digDirection).toEqual({ dx: 0, dy: 1 });
    });

    it('should expose currentDigTarget property', () => {
      expect(playerSystem.currentDigTarget).toBe(null);
    });

    it('should expose digTimer property', () => {
      expect(typeof playerSystem.digTimer).toBe('number');
      expect(playerSystem.digTimer).toBe(0);
    });

    it('should expose fallable component', () => {
      expect(playerSystem.fallable).toBeDefined();
    });

    it('should expose transitioning property', () => {
      expect(typeof playerSystem.transitioning).toBe('boolean');
      expect(playerSystem.transitioning).toBe(false);
    });
  });

  // ==========================================
  // C. Event Subscriptions
  // ==========================================
  describe('Event Subscriptions', () => {
    it('should subscribe to input events on init', () => {
      playerSystem.init();

      expect(eventBus.on).toHaveBeenCalledWith('input:move-left', expect.any(Function));
      expect(eventBus.on).toHaveBeenCalledWith('input:move-right', expect.any(Function));
      expect(eventBus.on).toHaveBeenCalledWith('input:move-up', expect.any(Function));
      expect(eventBus.on).toHaveBeenCalledWith('input:move-down', expect.any(Function));
    });

    it('should subscribe to player events on init', () => {
      playerSystem.init();

      expect(eventBus.on).toHaveBeenCalledWith('player:death', expect.any(Function));
      expect(eventBus.on).toHaveBeenCalledWith('player:restart', expect.any(Function));
      expect(eventBus.on).toHaveBeenCalledWith('block:crushed-player', expect.any(Function));
    });

    it('should subscribe to loot events on init', () => {
      playerSystem.init();

      expect(eventBus.on).toHaveBeenCalledWith('block:loot', expect.any(Function));
    });

    it('should subscribe to level transition events on init', () => {
      playerSystem.init();

      expect(eventBus.on).toHaveBeenCalledWith('level:transition:complete', expect.any(Function));
    });

    it('should store unsubscribe functions', () => {
      playerSystem.init();

      expect(typeof playerSystem.unsubscribeLeft).toBe('function');
      expect(typeof playerSystem.unsubscribeRight).toBe('function');
      expect(typeof playerSystem.unsubscribeDown).toBe('function');
      expect(typeof playerSystem.unsubscribeDeath).toBe('function');
      expect(typeof playerSystem.unsubscribeCrushed).toBe('function');
      expect(typeof playerSystem.unsubscribeRestart).toBe('function');
      expect(typeof playerSystem.unsubscribeBlockLoot).toBe('function');
      expect(typeof playerSystem.unsubscribeTransitionComplete).toBe('function');
    });

    it('should call all unsubscribe functions on destroy', () => {
      playerSystem.init();

      const unsubMocks = [
        playerSystem.unsubscribeLeft,
        playerSystem.unsubscribeRight,
        playerSystem.unsubscribeDown,
        playerSystem.unsubscribeDeath,
        playerSystem.unsubscribeCrushed,
        playerSystem.unsubscribeRestart,
        playerSystem.unsubscribeBlockLoot,
        playerSystem.unsubscribeTransitionComplete,
      ];

      playerSystem.destroy();

      unsubMocks.forEach((unsub) => {
        expect(unsub).toHaveBeenCalled();
      });
    });
  });

  // ==========================================
  // D. resetToSpawn() Method
  // ==========================================
  describe('resetToSpawn()', () => {
    beforeEach(() => {
      playerSystem.init();

      // Modify state to simulate gameplay
      playerSystem.gridX = 30;
      playerSystem.gridY = 10;
      playerSystem.x = 488;
      playerSystem.y = 168;
      playerSystem.state = 'digging';
      playerSystem.dead = true;
      playerSystem.hasStarted = true;
      playerSystem.digTimer = 100;
      playerSystem.currentDigTarget = {
        x: 31,
        y: 10,
        hp: 2,
        maxHp: 3,
      };
      playerSystem.digDirection = { dx: 1, dy: 0 };
      playerSystem.requestedDirection = { dx: -1, dy: 0 };
      playerSystem.timerMs = 15000;
    });

    it('should restore gridX/gridY to spawn position', () => {
      playerSystem.resetToSpawn();

      expect(playerSystem.gridX).toBe(50);
      expect(playerSystem.gridY).toBe(2);
    });

    it('should restore x/y to spawn pixel position', () => {
      playerSystem.resetToSpawn();

      expect(playerSystem.x).toBe(808);
      expect(playerSystem.y).toBe(40);
    });

    it('should reset state to IDLE', () => {
      playerSystem.resetToSpawn();

      expect(playerSystem.state).toBe('idle');
    });

    it('should clear digTimer', () => {
      playerSystem.resetToSpawn();

      expect(playerSystem.digTimer).toBe(0);
    });

    it('should clear currentDigTarget', () => {
      playerSystem.resetToSpawn();

      expect(playerSystem.currentDigTarget).toBe(null);
    });

    it('should reset digDirection to {dx: 0, dy: 1}', () => {
      playerSystem.resetToSpawn();

      expect(playerSystem.digDirection).toEqual({ dx: 0, dy: 1 });
    });

    it('should clear requestedDirection', () => {
      playerSystem.resetToSpawn();

      expect(playerSystem.requestedDirection).toBe(null);
    });

    it('should set hasStarted = false', () => {
      playerSystem.resetToSpawn();

      expect(playerSystem.hasStarted).toBe(false);
    });

    it('should set dead = false', () => {
      playerSystem.resetToSpawn();

      expect(playerSystem.dead).toBe(false);
    });

    it('should reset fallable component', () => {
      const resetSpy = vi.spyOn(playerSystem.fallable, 'reset');
      playerSystem.resetToSpawn();

      expect(resetSpy).toHaveBeenCalled();
    });

    it('should reset movement object', () => {
      playerSystem.movement.active = true;
      playerSystem.resetToSpawn();

      expect(playerSystem.movement.active).toBe(false);
      expect(playerSystem.movement.elapsed).toBe(0);
    });

    it('should reset timer by default', () => {
      playerSystem.timerMs = 15000;
      playerSystem.resetToSpawn();

      expect(playerSystem.timerMs).toBe(60000);
    });

    it('should preserve timer when preserveTimer = true', () => {
      playerSystem.timerMs = 15000;
      playerSystem.resetToSpawn({ preserveTimer: true, timerMs: 15000 });

      expect(playerSystem.timerMs).toBe(15000);
    });

    it('should broadcast timer update', () => {
      vi.clearAllMocks();
      playerSystem.resetToSpawn();

      expect(eventBus.emit).toHaveBeenCalledWith('timer:update', expect.any(Object));
    });
  });

  // ==========================================
  // E. Timer System
  // ==========================================
  describe('Timer System', () => {
    beforeEach(() => {
      playerSystem.init();
    });

    describe('_resetTimer()', () => {
      it('should set timerMs to 60000', () => {
        playerSystem.timerMs = 1000;
        playerSystem._resetTimer();

        expect(playerSystem.timerMs).toBe(60000);
      });

      it('should emit timer:update event', () => {
        vi.clearAllMocks();
        playerSystem._resetTimer();

        expect(eventBus.emit).toHaveBeenCalledWith('timer:update', { seconds: 60 });
      });
    });

    describe('_tickTimer()', () => {
      it('should decrement timerMs by deltaTime', () => {
        playerSystem.timerMs = 5000;
        playerSystem._tickTimer(100);

        expect(playerSystem.timerMs).toBe(4900);
      });

      it('should not go below 0', () => {
        playerSystem.timerMs = 50;
        playerSystem._tickTimer(100);

        expect(playerSystem.timerMs).toBe(0);
      });

      it('should emit player:death when timer reaches 0', () => {
        vi.clearAllMocks();
        playerSystem.timerMs = 50;
        playerSystem.dead = false;
        playerSystem._tickTimer(100);

        expect(eventBus.emit).toHaveBeenCalledWith('player:death', {
          cause: 'time_expired',
          shouldRegenerate: false,
        });
      });

      it('should not emit death if already dead', () => {
        vi.clearAllMocks();
        playerSystem.timerMs = 50;
        playerSystem.dead = true;
        playerSystem._tickTimer(100);

        expect(eventBus.emit).not.toHaveBeenCalledWith('player:death', expect.any(Object));
      });

      it('should broadcast timer changes when seconds change', () => {
        vi.clearAllMocks();
        playerSystem.timerMs = 5000; // 5 seconds
        playerSystem.lastTimerBroadcastSeconds = 5;
        playerSystem._tickTimer(1000); // Tick by 1 second

        expect(eventBus.emit).toHaveBeenCalledWith('timer:update', { seconds: 4 });
      });

      it('should only broadcast when seconds change (not every frame)', () => {
        vi.clearAllMocks();
        playerSystem.timerMs = 5000;
        playerSystem.lastTimerBroadcastSeconds = 5;
        playerSystem._tickTimer(100); // Still at 4.9 seconds = 4 whole seconds

        // Should broadcast because 5 → 4 seconds
        expect(eventBus.emit).toHaveBeenCalledWith('timer:update', { seconds: 4 });

        vi.clearAllMocks();
        playerSystem._tickTimer(100); // Still at 4.8 seconds = 4 whole seconds

        // Should NOT broadcast because still at 4 seconds
        expect(eventBus.emit).not.toHaveBeenCalled();
      });

      it('should do nothing if timer already at 0', () => {
        playerSystem.timerMs = 0;
        playerSystem._tickTimer(100);

        expect(playerSystem.timerMs).toBe(0);
      });
    });

    describe('_addTimerSeconds()', () => {
      it('should add seconds to timer', () => {
        playerSystem.timerMs = 30000; // 30 seconds
        playerSystem._addTimerSeconds(10);

        expect(playerSystem.timerMs).toBe(40000);
      });

      it('should cap at 60 seconds max', () => {
        playerSystem.timerMs = 55000;
        playerSystem._addTimerSeconds(10);

        expect(playerSystem.timerMs).toBe(60000); // Capped
      });

      it('should not add time when dead', () => {
        playerSystem.timerMs = 30000;
        playerSystem.dead = true;
        playerSystem._addTimerSeconds(10);

        expect(playerSystem.timerMs).toBe(30000); // Unchanged
      });

      it('should not add negative or zero seconds', () => {
        playerSystem.timerMs = 30000;
        playerSystem._addTimerSeconds(0);
        expect(playerSystem.timerMs).toBe(30000);

        playerSystem._addTimerSeconds(-5);
        expect(playerSystem.timerMs).toBe(30000);
      });

      it('should broadcast timer update', () => {
        vi.clearAllMocks();
        playerSystem.timerMs = 30000;
        playerSystem.lastTimerBroadcastSeconds = 30;
        playerSystem._addTimerSeconds(5);

        expect(eventBus.emit).toHaveBeenCalledWith('timer:update', { seconds: 35 });
      });
    });
  });

  // ==========================================
  // F. Movement System
  // ==========================================
  describe('Movement System', () => {
    beforeEach(() => {
      playerSystem.init();
    });

    describe('_beginMovement()', () => {
      it('should set movement.active = true', () => {
        playerSystem._beginMovement(51, 2, 120);

        expect(playerSystem.movement.active).toBe(true);
      });

      it('should set movement start position to current position', () => {
        playerSystem.x = 808;
        playerSystem.y = 40;
        playerSystem._beginMovement(51, 2, 120);

        expect(playerSystem.movement.startX).toBe(808);
        expect(playerSystem.movement.startY).toBe(40);
      });

      it('should calculate target pixel position', () => {
        playerSystem._beginMovement(51, 2, 120);

        // Target = gridX * 16 + 8
        expect(playerSystem.movement.targetX).toBe(51 * 16 + 8); // 824
        expect(playerSystem.movement.targetY).toBe(2 * 16 + 8); // 40
      });

      it('should set state to MOVING', () => {
        playerSystem._beginMovement(51, 2, 120);

        expect(playerSystem.state).toBe('moving');
      });

      it('should set duration (with minimum of 1)', () => {
        playerSystem._beginMovement(51, 2, 120);
        expect(playerSystem.movement.duration).toBe(120);

        playerSystem._beginMovement(51, 2, 0);
        expect(playerSystem.movement.duration).toBe(1); // Min clamping
      });
    });

    describe('_updateMovement()', () => {
      beforeEach(() => {
        playerSystem.x = 808;
        playerSystem.y = 40;
        playerSystem._beginMovement(51, 2, 120);

        // Mock terrain.getBlock to return solid block (for fall check on completion)
        mockTerrain.getBlock.mockReturnValue(createMockBlock({
          PhysicsComponent: createMockPhysicsComponent(true),
        }));
      });

      it('should interpolate position based on elapsed time', () => {
        playerSystem._updateMovement(60); // 50% progress

        // Should be halfway between start and target
        const expectedX = playerSystem._lerp(808, 824, 0.5);
        expect(playerSystem.x).toBe(expectedX);
      });

      it('should use _lerp for smooth interpolation', () => {
        const lerpSpy = vi.spyOn(playerSystem, '_lerp');
        playerSystem._updateMovement(60);

        expect(lerpSpy).toHaveBeenCalled();
      });

      it('should complete when progress >= 1', () => {
        const result = playerSystem._updateMovement(120); // 100% progress

        expect(result).toBe(false); // Movement complete
        expect(playerSystem.movement.active).toBe(false);
      });

      it('should update grid position on completion', () => {
        playerSystem._updateMovement(120);

        expect(playerSystem.gridX).toBe(51);
        expect(playerSystem.gridY).toBe(2);
      });

      it('should set state to IDLE on completion', () => {
        playerSystem._updateMovement(120);

        expect(playerSystem.state).toBe('idle');
      });

      it('should return true while moving', () => {
        const result = playerSystem._updateMovement(60); // 50% progress

        expect(result).toBe(true);
        expect(playerSystem.movement.active).toBe(true);
      });

      it('should return false when complete', () => {
        const result = playerSystem._updateMovement(120);

        expect(result).toBe(false);
      });

      it('should return false if movement not active', () => {
        playerSystem.movement.active = false;
        const result = playerSystem._updateMovement(60);

        expect(result).toBe(false);
        expect(playerSystem.state).toBe('idle');
      });
    });

    describe('_lerp()', () => {
      it('should correctly interpolate at t=0', () => {
        const result = playerSystem._lerp(0, 100, 0);
        expect(result).toBe(0);
      });

      it('should correctly interpolate at t=1', () => {
        const result = playerSystem._lerp(0, 100, 1);
        expect(result).toBe(100);
      });

      it('should correctly interpolate at t=0.5', () => {
        const result = playerSystem._lerp(0, 100, 0.5);
        expect(result).toBe(50);
      });

      it('should work with negative values', () => {
        const result = playerSystem._lerp(-50, 50, 0.5);
        expect(result).toBe(0);
      });
    });
  });

  // ==========================================
  // G. Direction Request
  // ==========================================
  describe('Direction Request', () => {
    beforeEach(() => {
      playerSystem.init();
    });

    it('should set requestedDirection when hasStarted = true', () => {
      playerSystem.hasStarted = true;
      playerSystem._requestDirection(-1, 0);

      expect(playerSystem.requestedDirection).toEqual({ dx: -1, dy: 0 });
    });

    it('should ignore requests when hasStarted = false', () => {
      playerSystem.hasStarted = false;
      playerSystem._requestDirection(-1, 0);

      expect(playerSystem.requestedDirection).toBe(null);
    });

    it('should ignore requests when dead = true', () => {
      playerSystem.hasStarted = true;
      playerSystem.dead = true;
      playerSystem._requestDirection(-1, 0);

      expect(playerSystem.requestedDirection).toBe(null);
    });

    it('should store direction as {dx, dy}', () => {
      playerSystem.hasStarted = true;

      playerSystem._requestDirection(-1, 0);
      expect(playerSystem.requestedDirection).toEqual({ dx: -1, dy: 0 });

      playerSystem._requestDirection(1, 0);
      expect(playerSystem.requestedDirection).toEqual({ dx: 1, dy: 0 });

      playerSystem._requestDirection(0, 1);
      expect(playerSystem.requestedDirection).toEqual({ dx: 0, dy: 1 });

      playerSystem._requestDirection(0, -1);
      expect(playerSystem.requestedDirection).toEqual({ dx: 0, dy: -1 });
    });
  });

  // ==========================================
  // H. Level Transition
  // ==========================================
  describe('Level Transition', () => {
    beforeEach(() => {
      playerSystem.init();
    });

    describe('enterDoor()', () => {
      it('should return false if no block', () => {
        const result = playerSystem.enterDoor(null, 10, 10);

        expect(result).toBe(false);
      });

      it('should return false if already transitioning', () => {
        playerSystem.transitioning = true;
        const block = createMockBlock({
          DoorComponent: createMockDoorComponent(true),
        });

        const result = playerSystem.enterDoor(block, 10, 10);

        expect(result).toBe(false);
      });

      it('should return false if block has no DoorComponent', () => {
        const block = createMockBlock({});

        const result = playerSystem.enterDoor(block, 10, 10);

        expect(result).toBe(false);
      });

      it('should return false if door is not active', () => {
        const block = createMockBlock({
          DoorComponent: createMockDoorComponent(false),
        });

        const result = playerSystem.enterDoor(block, 10, 10);

        expect(result).toBe(false);
      });

      it('should set transitioning = true', () => {
        const block = createMockBlock({
          DoorComponent: createMockDoorComponent(true),
        });

        playerSystem.enterDoor(block, 10, 10);

        expect(playerSystem.transitioning).toBe(true);
      });

      it('should emit level:transition event', () => {
        vi.clearAllMocks();
        const block = createMockBlock({
          DoorComponent: createMockDoorComponent(true),
        });

        playerSystem.enterDoor(block, 10, 10);

        expect(eventBus.emit).toHaveBeenCalledWith('level:transition', {
          door: { gridX: 10, gridY: 10 },
          source: 'player',
          triggerId: expect.any(Number),
        });
      });

      it('should deactivate door', () => {
        const door = createMockDoorComponent(true);
        const block = createMockBlock({ DoorComponent: door });

        playerSystem.enterDoor(block, 10, 10);

        expect(door.deactivate).toHaveBeenCalled();
      });
    });

    describe('_beginLevelTransition()', () => {
      it('should return false if already transitioning', () => {
        playerSystem.transitioning = true;

        const result = playerSystem._beginLevelTransition();

        expect(result).toBe(false);
      });

      it('should store current timer', () => {
        playerSystem.timerMs = 30000;

        playerSystem._beginLevelTransition();

        expect(playerSystem.timerBeforeTransition).toBe(30000);
      });

      it('should reset state to IDLE', () => {
        playerSystem.state = 'digging';

        playerSystem._beginLevelTransition();

        expect(playerSystem.state).toBe('idle');
      });

      it('should clear dig targets', () => {
        playerSystem.currentDigTarget = { x: 10, y: 10, hp: 1, maxHp: 3 };
        playerSystem.digTimer = 50;

        playerSystem._beginLevelTransition();

        expect(playerSystem.currentDigTarget).toBe(null);
        expect(playerSystem.digTimer).toBe(0);
      });

      it('should reset digDirection', () => {
        playerSystem.digDirection = { dx: 1, dy: 0 };

        playerSystem._beginLevelTransition();

        expect(playerSystem.digDirection).toEqual({ dx: 0, dy: 1 });
      });

      it('should clear requestedDirection', () => {
        playerSystem.requestedDirection = { dx: -1, dy: 0 };

        playerSystem._beginLevelTransition();

        expect(playerSystem.requestedDirection).toBe(null);
      });

      it('should set hasStarted = false', () => {
        playerSystem.hasStarted = true;

        playerSystem._beginLevelTransition();

        expect(playerSystem.hasStarted).toBe(false);
      });

      it('should stop movement', () => {
        playerSystem.movement.active = true;
        playerSystem.movement.elapsed = 50;

        playerSystem._beginLevelTransition();

        expect(playerSystem.movement.active).toBe(false);
        expect(playerSystem.movement.elapsed).toBe(0);
      });
    });

    describe('_handleLevelTransitionComplete()', () => {
      it('should call resetToSpawn', () => {
        const spy = vi.spyOn(playerSystem, 'resetToSpawn');
        playerSystem.timerBeforeTransition = 30000;

        playerSystem._handleLevelTransitionComplete();

        expect(spy).toHaveBeenCalled();
      });

      it('should set hasStarted = true', () => {
        playerSystem.hasStarted = false;

        playerSystem._handleLevelTransitionComplete();

        expect(playerSystem.hasStarted).toBe(true);
      });

      it('should set transitioning = false', () => {
        playerSystem.transitioning = true;

        playerSystem._handleLevelTransitionComplete();

        expect(playerSystem.transitioning).toBe(false);
      });

      it('should clear timerBeforeTransition', () => {
        playerSystem.timerBeforeTransition = 30000;

        playerSystem._handleLevelTransitionComplete();

        expect(playerSystem.timerBeforeTransition).toBe(null);
      });
    });
  });

  // ==========================================
  // I. Landing Handler
  // ==========================================
  describe('Landing Handler', () => {
    beforeEach(() => {
      playerSystem.init();
      mockTerrain.getBlock.mockReturnValue(createMockBlock({}));
    });

    it('should transition to DIGGING if landing on diggable block', () => {
      const diggableBlock = createMockBlock({
        DiggableComponent: createMockDiggableComponent(),
      });

      playerSystem.handleLanding(diggableBlock, 10, 10);

      expect(playerSystem.state).toBe('digging');
    });

    it('should set digDirection to down', () => {
      const diggableBlock = createMockBlock({
        DiggableComponent: createMockDiggableComponent(),
      });

      playerSystem.handleLanding(diggableBlock, 10, 10);

      expect(playerSystem.digDirection).toEqual({ dx: 0, dy: 1 });
    });

    it('should transition to IDLE if landing on non-diggable block', () => {
      const solidBlock = createMockBlock({});

      playerSystem.handleLanding(solidBlock, 10, 10);

      expect(playerSystem.state).toBe('idle');
    });
  });

  // ==========================================
  // J. Fall Detection
  // ==========================================
  describe('Fall Detection', () => {
    beforeEach(() => {
      playerSystem.init();
    });

    it('should return true if already falling', () => {
      playerSystem.state = 'falling';

      const result = playerSystem._beginFallIfUnsupported(mockTerrain);

      expect(result).toBe(true);
    });

    it('should check block below player', () => {
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(true),
      }));

      playerSystem._beginFallIfUnsupported(mockTerrain);

      expect(mockTerrain.getBlock).toHaveBeenCalledWith(50, 3); // gridY + 1
    });

    it('should return false if block below is collidable (has support)', () => {
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(true),
      }));

      const result = playerSystem._beginFallIfUnsupported(mockTerrain);

      expect(result).toBe(false);
      expect(playerSystem.state).toBe('idle');
    });

    it('should transition to FALLING if no support', () => {
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(false), // Not collidable
      }));

      const result = playerSystem._beginFallIfUnsupported(mockTerrain);

      expect(result).toBe(true);
      expect(playerSystem.state).toBe('falling');
    });

    it('should reset fallable component', () => {
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(false),
      }));

      const spy = vi.spyOn(playerSystem.fallable, 'reset');
      playerSystem._beginFallIfUnsupported(mockTerrain);

      expect(spy).toHaveBeenCalled();
    });

    it('should clear currentDigTarget', () => {
      playerSystem.currentDigTarget = { x: 10, y: 10, hp: 1, maxHp: 3 };
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(false),
      }));

      playerSystem._beginFallIfUnsupported(mockTerrain);

      expect(playerSystem.currentDigTarget).toBe(null);
    });

    it('should reset digTimer', () => {
      playerSystem.digTimer = 100;
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(false),
      }));

      playerSystem._beginFallIfUnsupported(mockTerrain);

      expect(playerSystem.digTimer).toBe(0);
    });

    it('should set hasStarted = true (allows falling before game starts)', () => {
      playerSystem.hasStarted = false;
      mockTerrain.getBlock.mockReturnValue(createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(false),
      }));

      playerSystem._beginFallIfUnsupported(mockTerrain);

      expect(playerSystem.hasStarted).toBe(true);
    });
  });

  // ==========================================
  // K. Upward Digging
  // ==========================================
  describe('Upward Digging', () => {
    beforeEach(() => {
      playerSystem.init();
      mockTerrain.getBlock.mockReset();
      mockTerrain.setBlock.mockReset();
    });

    it('should move upward into empty space after destroying block above', () => {
      playerSystem.digTimer = DIG_INTERVAL_MS;

      const diggableBlock = createMockBlock({
        DiggableComponent: createMockDiggableComponent(),
      });
      const emptyBlock = createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(false),
      });

      mockTerrain.getBlock
        .mockReturnValueOnce(diggableBlock)
        .mockReturnValueOnce(diggableBlock)
        .mockReturnValueOnce(emptyBlock);

      playerSystem._digInDirection(mockTerrain, 0, -1);

      expect(playerSystem.state).toBe('moving');
      expect(playerSystem.movement.active).toBe(true);
      expect(playerSystem.movement.targetGridX).toBe(playerSystem.gridX);
      expect(playerSystem.movement.targetGridY).toBe(playerSystem.gridY - 1);
    });

    it('should continue digging upward when replacement block remains diggable', () => {
      playerSystem.digTimer = DIG_INTERVAL_MS;

      const firstBlock = createMockBlock({
        DiggableComponent: createMockDiggableComponent(),
      });
      const spawnedBlock = createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(true),
        DiggableComponent: createMockDiggableComponent(),
      });

      const digSpy = vi.spyOn(playerSystem, '_digInDirection');

      try {
        mockTerrain.getBlock
          .mockReturnValueOnce(firstBlock)
          .mockReturnValueOnce(firstBlock)
          .mockReturnValueOnce(spawnedBlock)
          .mockReturnValueOnce(spawnedBlock);

        // Simulate UP being held during chaining
        playerSystem.game.inputSystem = { isKeyPressed: (code) => code === 'ArrowUp' };

        playerSystem._digInDirection(mockTerrain, 0, -1);

        expect(playerSystem.state).toBe('digging');
        expect(playerSystem.digDirection).toEqual({ dx: 0, dy: -1 });
        expect(digSpy).toHaveBeenCalledTimes(2);
      } finally {
        digSpy.mockRestore();
      }
    });

    it('should fall after upward movement completes when unsupported below', () => {
      playerSystem.digTimer = DIG_INTERVAL_MS;

      const diggableBlock = createMockBlock({
        DiggableComponent: createMockDiggableComponent(),
      });
      const emptyBlock = createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(false),
      });
      const landingBlock = createMockBlock({});
      const unsupportedBlock = createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(false),
      });

      mockTerrain.getBlock
        .mockReturnValueOnce(diggableBlock)
        .mockReturnValueOnce(diggableBlock)
        .mockReturnValueOnce(emptyBlock)
        .mockReturnValueOnce(landingBlock)
        // Additional call for neighbor check (above) after movement completes
        .mockReturnValueOnce(emptyBlock)
        .mockReturnValueOnce(unsupportedBlock);

      playerSystem._digInDirection(mockTerrain, 0, -1);

      expect(playerSystem.movement.active).toBe(true);

      playerSystem._updateMovement(playerSystem.movement.duration);

      expect(playerSystem.state).toBe('falling');
    });

    it('should fall when upward dig reveals undiggable block', () => {
      playerSystem.digTimer = DIG_INTERVAL_MS;

      const diggableBlock = createMockBlock({
        DiggableComponent: createMockDiggableComponent(),
      });
      const blockingBlock = createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(true),
      });
      const unsupportedBlock = createMockBlock({
        PhysicsComponent: createMockPhysicsComponent(false),
      });

      mockTerrain.getBlock
        .mockReturnValueOnce(diggableBlock)
        .mockReturnValueOnce(diggableBlock)
        .mockReturnValueOnce(blockingBlock)
        .mockReturnValueOnce(unsupportedBlock);

      playerSystem._digInDirection(mockTerrain, 0, -1);

      expect(playerSystem.state).toBe('falling');
      expect(playerSystem.digDirection).toEqual({ dx: 0, dy: 1 });
    });
  });
});
