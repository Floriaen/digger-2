/**
 * @file debug.component.js
 * @description Debug component - dat.GUI controls, de-zoom, overlays
 */

import { System } from '../core/system.js';

const DEFAULT_CAMERA_ZOOM = 3.0;

/**
 * DebugComponent
 * Provides dat.GUI interface and debug visualizations
 */
export class DebugSystem extends System {
  init() {
    this.gui = null;
    this.showChunkBounds = false;
    this.showGridPos = true;
    this.fps = 60;
    this.fpsHistory = [];
    this.perfData = null;
    this.perfUpdateTimer = 0;

    this._initGUI();
  }

  update(deltaTime) {
    if (this.perfData && this.perfData.enabled) {
      this.perfUpdateTimer += deltaTime;
      if (this.perfUpdateTimer >= 100) {
        this.perfUpdateTimer = 0;
        const metrics = this.game.performanceMonitor.getMetrics();
        this.perfData.fps = Math.round(metrics.fps);
        this.perfData.frameTime = metrics.frameTime.avg;
        this.perfData.updateTime = metrics.updateTime.avg;
        this.perfData.renderTime = metrics.renderTime.avg;
        this.perfData.chunkGenTime = metrics.chunkGeneration.avg;
        this.perfData.digTime = metrics.digOperation.avg;
        this.perfData.memoryMB = metrics.memoryUsage.current;
        this.perfData.warnings = metrics.warnings.length > 0
          ? metrics.warnings[metrics.warnings.length - 1]
          : '';
      }
    }
  }

  destroy() {
    if (this.gui) {
      this.gui.destroy();
    }

    if (this.perfData && this.perfData.enabled) {
      this.game.performanceMonitor.disable();
    }
  }

  /**
   * Initialize dat.GUI
   * @private
   */
  _initGUI() {
    // dat.GUI is loaded from CDN in index.html
    if (typeof dat === 'undefined') {
      console.warn('dat.GUI not loaded');
      return;
    }

    this.gui = new dat.GUI();

    // Terrain controls
    const terrainFolder = this.gui.addFolder('Terrain');
    const terrainComponent = this.game.components.find(
      (c) => c.constructor.name === 'TerrainSystem',
    );
    if (terrainComponent) {
      const seedControl = {
        seed: terrainComponent.seed,
        regenerate: () => {
          terrainComponent.setSeed(seedControl.seed);
        },
      };
      terrainFolder.add(seedControl, 'seed').name('Seed');
      terrainFolder.add(seedControl, 'regenerate').name('Regenerate');
    }
    terrainFolder.open();

    // Debug overlays
    const debugFolder = this.gui.addFolder('Debug');
    debugFolder.add(this, 'showChunkBounds').name('Chunk Bounds');
    debugFolder.add(this, 'showGridPos').name('Grid Position');

    // Zoom control
    const camera = this.game.components.find(
      (c) => c.constructor.name === 'CameraSystem',
    );
    if (camera) {
      let zoomController;
      const zoomControl = {
        zoom: camera.zoom,
        set: (value) => {
          camera.setZoom(value);
          zoomControl.zoom = camera.zoom;
          if (zoomController) {
            zoomController.updateDisplay();
          }
        },
        reset: () => {
          camera.setZoom(DEFAULT_CAMERA_ZOOM);
          zoomControl.zoom = camera.zoom;
          if (zoomController) {
            zoomController.updateDisplay();
          }
        },
      };

      zoomController = debugFolder.add(zoomControl, 'zoom', 0.2, 3.0)
        .step(0.1)
        .name('Zoom')
        .onChange((value) => {
          camera.setZoom(value);
          zoomControl.zoom = camera.zoom;
          zoomController.updateDisplay();
        });

      zoomController.listen();
      debugFolder.add(zoomControl, 'reset').name('Reset Zoom');
    }

    debugFolder.open();

    // Performance monitoring
    const perfFolder = this.gui.addFolder('Performance');
    this.perfData = {
      enabled: false,
      fps: 0,
      frameTime: '0.00',
      updateTime: '0.00',
      renderTime: '0.00',
      chunkGenTime: '0.00',
      digTime: '0.00',
      memoryMB: '0.00',
      warnings: '',
    };

    perfFolder.add(this.perfData, 'enabled').name('Enable Profiling').onChange((value) => {
      if (value) {
        this.perfUpdateTimer = 0;
        this.game.performanceMonitor.enable();
      } else {
        this.game.performanceMonitor.disable();
        this._resetPerfMetrics();
      }
    });
    perfFolder.add(this.perfData, 'fps').name('FPS').listen();
    perfFolder.add(this.perfData, 'frameTime').name('Frame (ms)').listen();
    perfFolder.add(this.perfData, 'updateTime').name('Update (ms)').listen();
    perfFolder.add(this.perfData, 'renderTime').name('Render (ms)').listen();
    perfFolder.add(this.perfData, 'chunkGenTime').name('Chunk Gen (ms)').listen();
    perfFolder.add(this.perfData, 'digTime').name('Dig (ms)').listen();
    perfFolder.add(this.perfData, 'memoryMB').name('Memory (MB)').listen();
    perfFolder.add(this.perfData, 'warnings').name('Warnings').listen();

    perfFolder.open();
  }

  _resetPerfMetrics() {
    if (!this.perfData) return;

    this.perfData.fps = 0;
    this.perfData.frameTime = '0.00';
    this.perfData.updateTime = '0.00';
    this.perfData.renderTime = '0.00';
    this.perfData.chunkGenTime = '0.00';
    this.perfData.digTime = '0.00';
    this.perfData.memoryMB = '0.00';
    this.perfData.warnings = '';
  }
}
