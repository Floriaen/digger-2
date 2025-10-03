/**
 * @file event-bus.js
 * @description Lightweight publish-subscribe event system for component communication
 */

/**
 * EventBus for decoupled component communication
 */
class EventBus {
  constructor() {
    this.listeners = {};
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    };
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first trigger)
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   */
  once(event, callback) {
    const unsubscribe = this.on(event, (...args) => {
      unsubscribe();
      callback(...args);
    });
  }

  /**
   * Emit an event to all subscribers
   * @param {string} event - Event name
   * @param {*} data - Event payload
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name
   */
  off(event) {
    delete this.listeners[event];
  }

  /**
   * Clear all event listeners
   */
  clear() {
    this.listeners = {};
  }
}

// Export singleton instance
export const eventBus = new EventBus();
