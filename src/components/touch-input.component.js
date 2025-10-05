/**
 * @file touch-input.component.js
 * @description Touch input component - handles mobile swipe gestures for movement
 */

import { Component } from '../core/component.base.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/config.js';
import { eventBus } from '../utils/event-bus.js';

/**
 * TouchInputComponent
 * Provides swipe gesture controls for mobile (left/right/down with single finger)
 */
export class TouchInputComponent extends Component {
  init() {
    this.enabled = true;

    // Swipe tracking
    this.touchStartX = null;
    this.touchStartY = null;
    this.touchStartTime = null;
    this.isSwiping = false;

    // Swipe configuration
    this.minSwipeDistance = 30; // Minimum pixels to register as swipe
    this.maxSwipeTime = 300; // Maximum time for swipe (ms)
    this.swipeAngleThreshold = 45; // Degrees to determine direction

    // Visual feedback
    this.swipeTrail = []; // Array of {x, y, alpha} points
    this.arrowIndicator = null; // {direction: 'left'|'right'|'down', alpha: number}
    this.feedbackDuration = 200; // Visual feedback fade duration (ms)

    // Bind touch handlers
    this._handleTouchStart = this._handleTouchStart.bind(this);
    this._handleTouchMove = this._handleTouchMove.bind(this);
    this._handleTouchEnd = this._handleTouchEnd.bind(this);

    // Register touch events on canvas
    const canvas = this.game.canvas;
    canvas.addEventListener('touchstart', this._handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this._handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', this._handleTouchEnd, { passive: false });
  }

  update(deltaTime) {
    // Fade out swipe trail
    this.swipeTrail = this.swipeTrail.filter((point) => {
      point.alpha -= deltaTime / this.feedbackDuration;
      return point.alpha > 0;
    });

    // Fade out arrow indicator
    if (this.arrowIndicator) {
      this.arrowIndicator.alpha -= deltaTime / this.feedbackDuration;
      if (this.arrowIndicator.alpha <= 0) {
        this.arrowIndicator = null;
      }
    }
  }

  render(ctx) {
    if (!this.enabled) return;
    if (!this._isMobileDevice() && !this.forceShow) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform (render on top)

    // Draw swipe trail
    if (this.swipeTrail.length > 1) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${this.swipeTrail[0].alpha * 0.5})`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(this.swipeTrail[0].x, this.swipeTrail[0].y);
      for (let i = 1; i < this.swipeTrail.length; i += 1) {
        ctx.lineTo(this.swipeTrail[i].x, this.swipeTrail[i].y);
      }
      ctx.stroke();
    }

    // Draw arrow indicator
    if (this.arrowIndicator) {
      const { direction, alpha } = this.arrowIndicator;
      const centerX = CANVAS_WIDTH / 2;
      const centerY = CANVAS_HEIGHT / 2;
      const arrowSize = 40;

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
      ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.5})`;
      ctx.lineWidth = 2;

      ctx.beginPath();
      if (direction === 'left') {
        // Left arrow: ◄
        ctx.moveTo(centerX - arrowSize, centerY);
        ctx.lineTo(centerX, centerY - arrowSize / 2);
        ctx.lineTo(centerX, centerY + arrowSize / 2);
      } else if (direction === 'right') {
        // Right arrow: ►
        ctx.moveTo(centerX + arrowSize, centerY);
        ctx.lineTo(centerX, centerY - arrowSize / 2);
        ctx.lineTo(centerX, centerY + arrowSize / 2);
      } else if (direction === 'down') {
        // Down arrow: ▼
        ctx.moveTo(centerX, centerY + arrowSize);
        ctx.lineTo(centerX - arrowSize / 2, centerY);
        ctx.lineTo(centerX + arrowSize / 2, centerY);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  destroy() {
    const canvas = this.game.canvas;
    canvas.removeEventListener('touchstart', this._handleTouchStart);
    canvas.removeEventListener('touchmove', this._handleTouchMove);
    canvas.removeEventListener('touchend', this._handleTouchEnd);
  }

  /**
   * Handle touch start - record starting position
   * @param {TouchEvent} event
   * @private
   */
  _handleTouchStart(event) {
    event.preventDefault();

    if (event.touches.length !== 1) return; // Only handle single touch

    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];

    // Store start position (canvas coordinates)
    this.touchStartX = ((touch.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    this.touchStartY = ((touch.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    this.touchStartTime = Date.now();
    this.isSwiping = true;

    // Initialize swipe trail
    this.swipeTrail = [{ x: this.touchStartX, y: this.touchStartY, alpha: 1.0 }];
  }

  /**
   * Handle touch move - build swipe trail
   * @param {TouchEvent} event
   * @private
   */
  _handleTouchMove(event) {
    event.preventDefault();

    if (!this.isSwiping || event.touches.length !== 1) return;

    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];

    const currentX = ((touch.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const currentY = ((touch.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;

    // Add to trail (limit to last 20 points for performance)
    this.swipeTrail.push({ x: currentX, y: currentY, alpha: 1.0 });
    if (this.swipeTrail.length > 20) {
      this.swipeTrail.shift();
    }
  }

  /**
   * Handle touch end - detect swipe direction and emit event
   * @param {TouchEvent} event
   * @private
   */
  _handleTouchEnd(event) {
    event.preventDefault();

    if (!this.isSwiping) return;

    const swipeTime = Date.now() - this.touchStartTime;

    // Get last touch position from trail
    if (this.swipeTrail.length < 2) {
      this.isSwiping = false;
      return;
    }

    const endPoint = this.swipeTrail[this.swipeTrail.length - 1];
    const deltaX = endPoint.x - this.touchStartX;
    const deltaY = endPoint.y - this.touchStartY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Check if swipe meets minimum criteria
    if (distance < this.minSwipeDistance || swipeTime > this.maxSwipeTime) {
      this.isSwiping = false;
      this.swipeTrail = [];
      return;
    }

    // Calculate swipe angle (in degrees, 0 = right, 90 = down, 180 = left, 270 = up)
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    // Determine primary direction
    let direction = null;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      // Vertical swipe
      direction = deltaY > 0 ? 'down' : 'up';
    }

    // Emit appropriate input event
    if (direction === 'left') {
      eventBus.emit('input:move-left');
      this.arrowIndicator = { direction: 'left', alpha: 1.0 };
    } else if (direction === 'right') {
      eventBus.emit('input:move-right');
      this.arrowIndicator = { direction: 'right', alpha: 1.0 };
    } else if (direction === 'down') {
      eventBus.emit('input:move-down');
      this.arrowIndicator = { direction: 'down', alpha: 1.0 };
    }

    // Reset swipe state
    this.isSwiping = false;
    this.touchStartX = null;
    this.touchStartY = null;
  }

  /**
   * Detect if device is mobile
   * @returns {boolean}
   * @private
   */
  _isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || ('ontouchstart' in window);
  }
}
