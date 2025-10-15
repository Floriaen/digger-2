/**
 * @file mud-loot.test.js
 * @description Verify mud drops a coin loot on destroy and emits proper events.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BlockFactory } from '../../factories/block.factory.js';
import { DiggableComponent } from '../../components/block/diggable.component.js';
import { eventBus } from '../../utils/event-bus.js';
import { createMockEventBus } from '../helpers/mocks.js';

describe('Mud Loot', () => {
  let mockEventBus;

  beforeEach(() => {
    // Fresh mock event bus before each test
    mockEventBus = createMockEventBus();
    Object.assign(eventBus, mockEventBus);
  });

  it('emits block:loot with a coin when mud is destroyed', () => {
    // Create mud with 1 HP so a single dig destroys it
    const mud = BlockFactory.createMud(1, 1);
    const diggable = mud.get(DiggableComponent);

    const result = diggable.dig(mud, 5, 6, 1);
    expect(result.destroyed).toBe(true);

    // Assert a block:loot event was emitted with a coin loot
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      'block:loot',
      expect.objectContaining({
        x: 5,
        y: 6,
        loot: expect.arrayContaining([
          expect.objectContaining({ type: 'coin' }),
        ]),
        timerIncrementSeconds: 0,
      }),
    );
  });

  it('emits block:loot with a coin when protective mud is destroyed', () => {
    // Protective mud also includes loot
    const protectiveMud = BlockFactory.createProtectiveMud(0.2);
    const diggable = protectiveMud.get(DiggableComponent);

    // Overkill damage to ensure destruction
    const result = diggable.dig(protectiveMud, 3, 4, 999);
    expect(result.destroyed).toBe(true);

    expect(mockEventBus.emit).toHaveBeenCalledWith(
      'block:loot',
      expect.objectContaining({
        x: 3,
        y: 4,
        loot: expect.arrayContaining([
          expect.objectContaining({ type: 'coin' }),
        ]),
        timerIncrementSeconds: 0,
      }),
    );
  });
});
