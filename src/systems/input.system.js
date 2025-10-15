/**
 * @file input.system.js
 * @description Input system - captures keyboard/touch events and publishes to event bus
 */

import { eventBus } from '../utils/event-bus.js';

/**
 * InputSystem
 * Manages keyboard and touch input, emits events
 */
export class InputSystem {
  constructor() {
    this.keys = {};
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
  }

  /**
   * Initialize input listeners
   */
  init() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  /**
   * Handle keydown events
   * @param {KeyboardEvent} event
   * @private
   */
  _onKeyDown(event) {
    // Prevent repeat pause toggles
    if ((event.code === 'Space' || event.code === 'Escape') && this.keys[event.code]) {
      return;
    }

    this.keys[event.code] = true;

    if (event.code === 'ArrowLeft') {
      eventBus.emit('input:move-left');
    } else if (event.code === 'ArrowRight') {
      eventBus.emit('input:move-right');
    } else if (event.code === 'ArrowDown') {
      eventBus.emit('input:move-down');
    } else if (event.code === 'ArrowUp') {
      eventBus.emit('input:move-up');
    } else if (event.code === 'Space' || event.code === 'Escape') {
      eventBus.emit('input:pause-toggle');
    }
  }

  /**
   * Handle keyup events
   * @param {KeyboardEvent} event
   * @private
   */
  _onKeyUp(event) {
    this.keys[event.code] = false;
  }

  /**
   * Check if key is currently pressed
   * @param {string} code - Key code (e.g., 'ArrowLeft')
   * @returns {boolean}
   */
  isKeyPressed(code) {
    return !!this.keys[code];
  }

  /**
   * Clean up input listeners
   */
  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }
}
