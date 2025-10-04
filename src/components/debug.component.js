/**
 * @file debug.component.js
 * @description Debug component - dat.GUI controls, de-zoom, overlays
 */

import { Component } from '../core/component.base.js';
import { CHUNK_SIZE, TILE_WIDTH, TILE_HEIGHT } from '../utils/config.js';

/**
 * DebugComponent
 * Provides dat.GUI interface and debug visualizations
 */
export class DebugComponent extends Component {
  init() {
    this.gui = null;
    this.showChunkBounds = false;
    this.showGridPos = true;
    this.fps = 60;
    this.fpsHistory = [];

    this._initGUI();
  }

  update(deltaTime) {
    // Calculate FPS
    if (deltaTime > 0) {
      const currentFPS = 1000 / deltaTime;
      this.fpsHistory.push(currentFPS);
      if (this.fpsHistory.length > 30) this.fpsHistory.shift();
      this.fps = Math.round(
        this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length,
      );
    }
  }

  render(ctx) {
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
  }

  destroy() {
    if (this.gui) {
      this.gui.destroy();
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
}
