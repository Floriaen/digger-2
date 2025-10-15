/**
 * @file player-upward-empty.test.js
 * @description Unit tests for upward movement into empty space and chaining while holding Up
 */

import { vi } from 'vitest';

import { PlayerSystem } from '../../systems/player.system.js';
import { DIG_INTERVAL_MS } from '../../utils/config.js';
import {
  createMockGame,
  createMockTerrain,
  createMockBlock,
  createMockPhysicsComponent,
} from '../helpers/mocks.js';

describe('PlayerSystem - Upward empty movement and chaining', () => {
  let mockGame;
  let mockTerrain;
  let playerSystem;

  beforeEach(() => {
    // Create mock terrain and game
    mockTerrain = createMockTerrain(100);
    mockGame = createMockGame({
      components: [mockTerrain],
    });

    // Create player system
    playerSystem = new PlayerSystem(mockGame);
    playerSystem.init();

    // Start the game and set Up direction as active
    playerSystem.hasStarted = true;
    playerSystem.digDirection = { dx: 0, dy: -1 };
    playerSystem.game.inputSystem = { isKeyPressed: (code) => code === 'ArrowUp' }; // Up held
  });

  it('should not auto-climb into pre-existing empty above; remain idle (or fall based on support)', () => {
    const initialGridY = playerSystem.gridY;

    const emptyBlockAbove = createMockBlock({
      PhysicsComponent: createMockPhysicsComponent(false),
    });
    const solidBlockBelow = createMockBlock({
      PhysicsComponent: createMockPhysicsComponent(true),
    });

    // 1) Above queried by _updateDirectionalDig()
    // 2) Below queried by _beginFallIfUnsupported()
    mockTerrain.getBlock
      .mockReturnValueOnce(emptyBlockAbove)
      .mockReturnValueOnce(solidBlockBelow);

    playerSystem._updateDirectionalDig(mockTerrain);

    expect(playerSystem.movement.active).toBe(false);
    expect(playerSystem.state).toBe('idle');
    // No move was started
    expect(playerSystem.gridY).toBe(initialGridY);
  });

  it('should not chain upward step into empty after movement completes even when Up is held', () => {
    const initialGridY = playerSystem.gridY;

    const emptyBlockAbove = createMockBlock({
      PhysicsComponent: createMockPhysicsComponent(false),
    });
    const solidBlockHere = createMockBlock({
      PhysicsComponent: createMockPhysicsComponent(true),
    });
    const solidBlockLeft = createMockBlock({
      PhysicsComponent: createMockPhysicsComponent(true),
    });
    const solidBlockRight = createMockBlock({
      PhysicsComponent: createMockPhysicsComponent(true),
    });
    const solidBlockBelow = createMockBlock({
      PhysicsComponent: createMockPhysicsComponent(true),
    });

    // Simulate that we just completed a dig and started a step up into the cleared tile
    playerSystem._beginMovement(playerSystem.gridX, playerSystem.gridY - 1, 120);

    // On movement completion, PlayerSystem queries in order:
    // 1) current tile block
    // 2) above block
    // 3) left block
    // 4) right block
    // 5) below block (via _beginFallIfUnsupported)
    mockTerrain.getBlock
      .mockReturnValueOnce(solidBlockHere)   // current tile
      .mockReturnValueOnce(emptyBlockAbove)  // above empty -> no up chain
      .mockReturnValueOnce(solidBlockLeft)   // left is solid/non-diggable
      .mockReturnValueOnce(solidBlockRight)  // right is solid/non-diggable
      .mockReturnValueOnce(solidBlockBelow); // below solid -> no fall

    // Complete first movement (120ms)
    playerSystem._updateMovement(playerSystem.movement.duration);

    // Should not start another upward step into empty
    expect(playerSystem.movement.active).toBe(false);
    expect(['idle', 'falling']).toContain(playerSystem.state);
    expect(playerSystem.gridY).toBe(initialGridY - 1);
  });

  it('should stop chaining into empty when Up is released after a step', () => {
    const initialGridY = playerSystem.gridY;

    const emptyBlockAbove = createMockBlock({
      PhysicsComponent: createMockPhysicsComponent(false),
    });
    const solidBlockHere = createMockBlock({
      PhysicsComponent: createMockPhysicsComponent(true),
    });
    const solidBlockBelow = createMockBlock({
      PhysicsComponent: createMockPhysicsComponent(true),
    });

    // Simulate first upward step already in progress
    playerSystem._beginMovement(playerSystem.gridX, playerSystem.gridY - 1, 120);

    // Release Up before finishing the movement
    playerSystem.game.inputSystem = { isKeyPressed: (code) => false };

    // On movement completion:
    mockTerrain.getBlock
      .mockReturnValueOnce(solidBlockHere)   // current tile
      .mockReturnValueOnce(emptyBlockAbove)  // above is empty (and Up is released)
      .mockReturnValueOnce(solidBlockBelow); // below is solid for fall check

    // Complete movement; should not chain another move
    playerSystem._updateMovement(playerSystem.movement.duration);

    expect(playerSystem.movement.active).toBe(false);
    expect(['idle', 'falling']).toContain(playerSystem.state);
    // Ensure we only moved up by 1 tile
    expect(playerSystem.gridY).toBe(initialGridY - 1);
  });
});
