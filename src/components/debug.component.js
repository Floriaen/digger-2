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
    this.deZoomActive = false;
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
    // FPS counter
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    ctx.fillText(`FPS: ${this.fps}`, 10, 550);

    // Player grid position
    if (this.showGridPos) {
      const player = this.game.components.find(
        (c) => c.constructor.name === 'PlayerComponent',
      );
      if (player) {
        ctx.fillText(`Grid: (${player.gridX}, ${player.gridY})`, 10, 565);
        ctx.fillText(`State: ${player.state}`, 10, 580);
      }
    }

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
    debugFolder.add(this, 'deZoomActive').name('De-Zoom').onChange((value) => {
      // De-zoom toggle (zoom out camera)
      const camera = this.game.components.find(
        (c) => c.constructor.name === 'CameraComponent',
      );
      if (camera) {
        // TODO: Implement de-zoom in camera
      }
    });
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
