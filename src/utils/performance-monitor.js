/**
 * @file performance-monitor.js
 * @description Performance profiling system using native Performance API
 */

/**
 * PerformanceMonitor
 * Tracks frame timing, chunk generation, memory usage, and game-specific metrics
 */
export class PerformanceMonitor {
  constructor() {
    this.enabled = false;
    this.metrics = {
      frameTime: {
        current: 0, avg: 0, max: 0, samples: [],
      },
      updateTime: {
        current: 0, avg: 0, max: 0, samples: [],
      },
      renderTime: {
        current: 0, avg: 0, max: 0, samples: [],
      },
      chunkGeneration: {
        current: 0, avg: 0, max: 0, samples: [],
      },
      digOperation: {
        current: 0, avg: 0, max: 0, samples: [],
      },
      memoryUsage: {
        current: 0, avg: 0, max: 0, samples: [],
      },
    };

    this.sampleSize = 60; // Track last 60 samples for rolling average
    this.frameTimeThreshold = 16.67; // 60 FPS threshold (ms)
    this.warnings = [];

    // Performance observer for custom marks/measures
    if (window.PerformanceObserver) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this._handlePerformanceEntry(entry);
        }
      });
    }
  }

  /**
   * Enable performance monitoring
   */
  enable() {
    this.enabled = true;
    if (this.observer) {
      try {
        this.observer.observe({ entryTypes: ['measure', 'mark'] });
      } catch (e) {
        console.warn('PerformanceObserver not supported:', e);
      }
    }
  }

  /**
   * Disable performance monitoring
   */
  disable() {
    this.enabled = false;
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  /**
   * Start timing a specific operation
   * @param {string} name - Operation name (e.g., 'frame', 'update', 'render', 'chunkGen', 'dig')
   */
  startMark(name) {
    if (!this.enabled) return;
    performance.mark(`${name}-start`);
  }

  /**
   * End timing and record measure
   * @param {string} name - Operation name
   */
  endMark(name) {
    if (!this.enabled) return;
    performance.mark(`${name}-end`);
    try {
      performance.measure(name, `${name}-start`, `${name}-end`);
    } catch (e) {
      // Mark might not exist, ignore
    }
  }

  /**
   * Handle performance entry from observer
   * @param {PerformanceEntry} entry
   * @private
   */
  _handlePerformanceEntry(entry) {
    if (entry.entryType !== 'measure') return;

    const { duration } = entry;

    switch (entry.name) {
      case 'frame':
        this._updateMetric('frameTime', duration);
        if (duration > this.frameTimeThreshold) {
          const warning = `Frame drop: ${duration.toFixed(2)}ms (>${this.frameTimeThreshold}ms)`;
          this.warnings.push(warning);
          if (this.warnings.length > 10) this.warnings.shift();
        }
        break;
      case 'update':
        this._updateMetric('updateTime', duration);
        break;
      case 'render':
        this._updateMetric('renderTime', duration);
        break;
      case 'chunkGen':
        this._updateMetric('chunkGeneration', duration);
        break;
      case 'dig':
        this._updateMetric('digOperation', duration);
        break;
      default:
        break;
    }
  }

  /**
   * Update metric with new sample
   * @param {string} metricName
   * @param {number} value
   * @private
   */
  _updateMetric(metricName, value) {
    const metric = this.metrics[metricName];
    if (!metric) return;

    metric.current = value;
    metric.samples.push(value);
    if (metric.samples.length > this.sampleSize) {
      metric.samples.shift();
    }

    // Update average
    metric.avg = metric.samples.reduce((sum, v) => sum + v, 0) / metric.samples.length;

    // Update max
    metric.max = Math.max(metric.max, value);
  }

  /**
   * Update memory usage (if available)
   */
  updateMemory() {
    if (!this.enabled) return;
    if (performance.memory) {
      const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
      this._updateMetric('memoryUsage', usedMB);
    }
  }

  /**
   * Get current metrics snapshot
   * @returns {object} Metrics data
   */
  getMetrics() {
    return {
      fps: this.metrics.frameTime.avg > 0 ? 1000 / this.metrics.frameTime.avg : 0,
      frameTime: {
        current: this.metrics.frameTime.current.toFixed(2),
        avg: this.metrics.frameTime.avg.toFixed(2),
        max: this.metrics.frameTime.max.toFixed(2),
      },
      updateTime: {
        current: this.metrics.updateTime.current.toFixed(2),
        avg: this.metrics.updateTime.avg.toFixed(2),
        max: this.metrics.updateTime.max.toFixed(2),
      },
      renderTime: {
        current: this.metrics.renderTime.current.toFixed(2),
        avg: this.metrics.renderTime.avg.toFixed(2),
        max: this.metrics.renderTime.max.toFixed(2),
      },
      chunkGeneration: {
        current: this.metrics.chunkGeneration.current.toFixed(2),
        avg: this.metrics.chunkGeneration.avg.toFixed(2),
        max: this.metrics.chunkGeneration.max.toFixed(2),
      },
      digOperation: {
        current: this.metrics.digOperation.current.toFixed(2),
        avg: this.metrics.digOperation.avg.toFixed(2),
        max: this.metrics.digOperation.max.toFixed(2),
      },
      memoryUsage: {
        current: this.metrics.memoryUsage.current.toFixed(2),
        avg: this.metrics.memoryUsage.avg.toFixed(2),
        max: this.metrics.memoryUsage.max.toFixed(2),
      },
      warnings: this.warnings,
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    Object.keys(this.metrics).forEach((key) => {
      this.metrics[key] = {
        current: 0, avg: 0, max: 0, samples: [],
      };
    });
    this.warnings = [];
  }

  /**
   * Clear performance entries to prevent memory buildup
   */
  clearEntries() {
    if (performance.clearMarks) {
      performance.clearMarks();
    }
    if (performance.clearMeasures) {
      performance.clearMeasures();
    }
  }
}
