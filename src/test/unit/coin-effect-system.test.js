/**
 * @file coin-effect-system.test.js
 * @description Verify CoinEffectSystem grants +1 score on coin loot events and ignores non-coin loot.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CoinEffectSystem } from '../../systems/coin-effect.system.js';
import { eventBus } from '../../utils/event-bus.js';
import { createMockEventBus, createMockGame } from '../helpers/mocks.js';

describe('CoinEffectSystem', () => {
  let mockEventBus;
  let mockGame;
  let system;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    Object.assign(eventBus, mockEventBus);

    mockGame = createMockGame({ components: [] });
    system = new CoinEffectSystem(mockGame);
    system.init();
  });

  it('emits score:add with amount 1 when receiving coin loot', () => {
    mockEventBus.emit('block:loot', {
      x: 10,
      y: 12,
      loot: [{ type: 'coin', value: 1 }],
      timerIncrementSeconds: 0,
    });

    expect(mockEventBus.emit).toHaveBeenCalledWith('score:add', { amount: 1 });
  });

  it('ignores loot with no coins', () => {
    mockEventBus.emit('block:loot', {
      x: 0,
      y: 0,
      loot: [{ type: 'gem', value: 100 }],
      timerIncrementSeconds: 0,
    });

    // Should not emit score:add for non-coin loot
    const calls = mockEventBus.emit.mock.calls.filter(([eventName]) => eventName === 'score:add');
    expect(calls.length).toBe(0);
  });
});
