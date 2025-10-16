/**
 * @file timer.component.js
 * @description Player timer (countdown + death on timeout)
 *
 * Manages the player's timer countdown and emits events on changes.
 * Extracted from PlayerSystem lines 84-86, 701-727.
 */

import { Component } from '../../core/component.js';
import { eventBus } from '../../utils/event-bus.js';

const MS_PER_SECOND = 1000;
const TIMER_UPDATE_EVENT = 'timer:update';

export class TimerComponent extends Component {
  static INITIAL_TIMER_SECONDS = 60;

  constructor({
    timerMs = TimerComponent.INITIAL_TIMER_SECONDS * MS_PER_SECOND,
  } = {}) {
    super();

    this.timerMs = timerMs;
    this.lastTimerBroadcastSeconds = null;
    this.timerBeforeTransition = null;
  }

  /**
   * Update timer - called each frame
   * @param {Object} entity - Player entity
   * @param {number} deltaTime - Time elapsed since last frame
   */
  update(entity, deltaTime) {
    if (this.timerMs <= 0) {
      return;
    }

    this.timerMs = Math.max(0, this.timerMs - deltaTime);
    this._broadcastTimerIfNeeded();

    if (this.timerMs === 0) {
      // Timer expired - emit death event (state check happens in PlayerManagerSystem)
      eventBus.emit('player:death', {
        cause: 'time_expired',
        shouldRegenerate: false,
      });
    }
  }

  /**
   * Reset timer to initial value
   */
  reset() {
    this.timerMs = TimerComponent.INITIAL_TIMER_SECONDS * MS_PER_SECOND;
    this._broadcastTimerIfNeeded(true);
  }

  /**
   * Add seconds to the timer (reward from coins)
   * @param {number} seconds - Seconds to add
   */
  addSeconds(seconds) {
    if (seconds <= 0) {
      return;
    }

    const maxTimerMs = TimerComponent.INITIAL_TIMER_SECONDS * MS_PER_SECOND;
    this.timerMs = Math.min(maxTimerMs, this.timerMs + seconds * MS_PER_SECOND);
    this._broadcastTimerIfNeeded();
  }

  /**
   * Get timer in seconds
   * @returns {number} Timer in seconds
   */
  getSeconds() {
    return Math.max(0, Math.floor(this.timerMs / MS_PER_SECOND));
  }

  /**
   * Store timer before level transition
   */
  storeBeforeTransition() {
    this.timerBeforeTransition = this.timerMs;
  }

  /**
   * Restore timer after level transition
   * @param {boolean} shouldPreserve - Whether to preserve the timer
   */
  restoreAfterTransition(shouldPreserve) {
    if (
      shouldPreserve
      && Number.isFinite(this.timerBeforeTransition)
      && this.timerBeforeTransition > 0
    ) {
      this.timerMs = Math.max(0, this.timerBeforeTransition);
      this._broadcastTimerIfNeeded(true);
    } else {
      this.reset();
    }
    this.timerBeforeTransition = null;
  }

  /**
   * Broadcast timer update event if seconds changed
   * @param {boolean} force - Force broadcast even if seconds unchanged
   * @private
   */
  _broadcastTimerIfNeeded(force = false) {
    const seconds = this.getSeconds();
    if (!force && seconds === this.lastTimerBroadcastSeconds) {
      return;
    }

    this.lastTimerBroadcastSeconds = seconds;
    eventBus.emit(TIMER_UPDATE_EVENT, { seconds });
  }
}
