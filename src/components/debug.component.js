/**
 * @file debug.component.js
 * @description Debug component - dat.GUI controls, de-zoom, overlays
 */

import { LifecycleComponent } from '../core/lifecycle-component.js';
import { CHUNK_SIZE, TILE_WIDTH, TILE_HEIGHT } from '../utils/config.js';

/**
 * DebugComponent
 * Provides dat.GUI interface and debug visualizations
 */
export class DebugComponent extends LifecycleComponent {
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
    /*
    // Calculate FPS
    if (deltaTime > 0) {
      const currentFPS = 1000 / deltaTime;
      this.fpsHistory.push(currentFPS);
      if (this.fpsHistory.length > 30) this.fpsHistory.shift();
      this.fps = Math.round(
        this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length,
      );
    }
      */
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

  render(ctx) {
    /*
    // Save context to prevent zoom from affecting debug text
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset to identity matrix

    // FPS counter (always visible)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    ctx.fillText(`FPS: ${this.fps}`, 10, 20);

    // Player grid position and zoom
    if (this.showGridPos) {
      const player = this.game.components.find(
        (c) => c.constructor.name === 'PlayerComponent',
      );
      const camera = this.game.components.find(
        (c) => c.constructor.name === 'CameraComponent',
      );
      if (player) {
        ctx.fillText(`Grid: (${player.gridX}, ${player.gridY})`, 10, 35);
        ctx.fillText(`State: ${player.state}`, 10, 50);
      }
      if (camera) {
        const transform = camera.getTransform();
        ctx.fillText(`Zoom: ${camera.zoom.toFixed(2)} → ${transform.zoom.toFixed(2)} (target: ${camera.targetZoom.toFixed(2)})`, 10, 65);
      }
    }

    ctx.restore();

    // Chunk bounds
    if (this.showChunkBounds) {
      this._drawChunkBounds(ctx);
    }
    */
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
      (c) => c.constructor.name === 'TerrainComponent',
    );
    if (terrainComponent) {
      const seedControl = {
        seed: terrainComponent.seed,
        lavaDepth: terrainComponent.generator.lavaDepth,
        regenerate: () => {
          terrainComponent.setSeed(seedControl.seed);
          terrainComponent.generator.lavaDepth = seedControl.lavaDepth;
        },
      };
      terrainFolder.add(seedControl, 'seed').name('Seed');
      terrainFolder.add(seedControl, 'lavaDepth', 100, 2000).step(50).name('Lava Depth')
        .onChange((val) => {
          terrainComponent.generator.lavaDepth = val;
          terrainComponent.generator.clearCache();
        });
      terrainFolder.add(seedControl, 'regenerate').name('Regenerate');
    }
    terrainFolder.open();

    // Debug overlays
    const debugFolder = this.gui.addFolder('Debug');
    debugFolder.add(this, 'showChunkBounds').name('Chunk Bounds');
    debugFolder.add(this, 'showGridPos').name('Grid Position');

    // Zoom control
    const camera = this.game.components.find(
      (c) => c.constructor.name === 'CameraComponent',
    );
    if (camera) {
      // Manual zoom toggle
      debugFolder.add(camera, 'manualZoom').name('Manual Zoom')
        .onChange((val) => {
          if (!val) {
            // Reset to auto when disabled
            camera.manualZoom = false;
          }
        });

      // Control targetZoom (not zoom) to work with lerp system
      debugFolder.add(camera, 'targetZoom', 0.1, 10.0).step(0.1).name('Zoom')
        .onChange(() => {
          // Enable manual zoom when slider is moved
          camera.manualZoom = true;
        })
        .listen(); // Update GUI when zoom changes programmatically
    }

    // Zoom strategy toggle
    debugFolder.add(this.game, 'zoomAfterRendering').name('Zoom After Rendering');

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

  /**
   * Draw chunk boundary lines
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _drawChunkBounds(ctx) {
    const camera = this.game.components.find(
      (c) => c.constructor.name === 'CameraComponent',
    );
    if (!camera) return;

    const transform = camera.getTransform();
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 1;

    // Draw visible chunk grid
    for (let cx = -2; cx <= 2; cx += 1) {
      for (let cy = -2; cy <= 2; cy += 1) {
        const x = cx * CHUNK_SIZE * TILE_WIDTH + transform.x;
        const y = cy * CHUNK_SIZE * TILE_HEIGHT + transform.y;
        ctx.strokeRect(x, y, CHUNK_SIZE * TILE_WIDTH, CHUNK_SIZE * TILE_HEIGHT);
      }
    }
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
