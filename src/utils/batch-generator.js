/**
 * @file batch-generator.js
 * @description Offline batch generator for 10x10 chunk composites (images/JSON)
 */

import { CHUNK_SIZE } from './config.js';
import { TerrainGenerator } from '../terrain/terrain-generator.js';
import { getBlock } from '../terrain/block-registry.js';

/**
 * BatchGenerator
 * Generates 10x10 chunk composites for terrain review
 */
export class BatchGenerator {
  /**
   * @param {number} seed - Random seed for generation
   */
  constructor(seed = 12345) {
    this.generator = new TerrainGenerator(seed);
  }

  /**
   * Generate 10x10 chunk composite data
   * @param {number} startChunkX - Starting chunk X coordinate
   * @param {number} startChunkY - Starting chunk Y coordinate
   * @returns {Object} { chunks, metadata }
   */
  generateBatch(startChunkX = 0, startChunkY = 0) {
    const batchSize = 10;
    const chunks = [];
    const metadata = {
      seed: this.generator.seed,
      startChunkX,
      startChunkY,
      batchSize,
      totalBlocks: batchSize * batchSize * CHUNK_SIZE * CHUNK_SIZE,
      blockCounts: {},
      timestamp: new Date().toISOString(),
    };

    // Generate 10x10 grid of chunks
    for (let cy = 0; cy < batchSize; cy += 1) {
      for (let cx = 0; cx < batchSize; cx += 1) {
        const chunkX = startChunkX + cx;
        const chunkY = startChunkY + cy;
        const chunk = this.generator.generateChunk(chunkX, chunkY);

        // Collect chunk data
        const chunkData = {
          x: chunkX,
          y: chunkY,
          blocks: chunk.blocks.slice(), // Copy block array
        };

        chunks.push(chunkData);

        // Count block types
        chunk.blocks.forEach((blockType) => {
          const blockName = getBlock(blockType).name;
          metadata.blockCounts[blockName] = (metadata.blockCounts[blockName] || 0) + 1;
        });
      }
    }

    return { chunks, metadata };
  }

  /**
   * Generate JSON export of 10x10 batch
   * @param {number} startChunkX - Starting chunk X coordinate
   * @param {number} startChunkY - Starting chunk Y coordinate
   * @returns {string} JSON string
   */
  generateJSON(startChunkX = 0, startChunkY = 0) {
    const batch = this.generateBatch(startChunkX, startChunkY);
    return JSON.stringify(batch, null, 2);
  }

  /**
   * Generate ASCII visualization of 10x10 batch (for console)
   * @param {number} startChunkX - Starting chunk X coordinate
   * @param {number} startChunkY - Starting chunk Y coordinate
   * @returns {string} ASCII art
   */
  generateASCII(startChunkX = 0, startChunkY = 0) {
    const batchSize = 10;
    const { chunks } = this.generateBatch(startChunkX, startChunkY);

    // Block type to ASCII character mapping
    const blockChars = {
      empty: ' ',
      mud_light: '░',
      mud_medium: '▒',
      mud_dark: '▓',
      mud_dense: '█',
      mud_core: '■',
      rock: '#',
      red_frame: 'R',
    };

    let ascii = '';

    // For each row of blocks in the composite
    for (let worldY = 0; worldY < batchSize * CHUNK_SIZE; worldY += 1) {
      let line = '';

      for (let worldX = 0; worldX < batchSize * CHUNK_SIZE; worldX += 1) {
        // Find chunk containing this block
        const chunkX = Math.floor(worldX / CHUNK_SIZE);
        const chunkY = Math.floor(worldY / CHUNK_SIZE);
        const localX = worldX % CHUNK_SIZE;
        const localY = worldY % CHUNK_SIZE;

        const chunkIndex = chunkY * batchSize + chunkX;
        const chunk = chunks[chunkIndex];
        const blockIndex = localY * CHUNK_SIZE + localX;
        const blockType = chunk.blocks[blockIndex];

        const blockName = getBlock(blockType).name;
        line += blockChars[blockName] || '?';
      }

      ascii += `${line}\n`;
    }

    return ascii;
  }

  /**
   * Render 10x10 batch to canvas and return data URL
   * @param {number} startChunkX - Starting chunk X coordinate
   * @param {number} startChunkY - Starting chunk Y coordinate
   * @param {number} blockSize - Pixel size per block (default 2)
   * @returns {string} Canvas data URL (PNG)
   */
  generateImage(startChunkX = 0, startChunkY = 0, blockSize = 2) {
    const batchSize = 10;
    const { chunks } = this.generateBatch(startChunkX, startChunkY);

    const width = batchSize * CHUNK_SIZE * blockSize;
    const height = batchSize * CHUNK_SIZE * blockSize;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Block type to color mapping
    const blockColors = {
      empty: '#000000',
      mud_light: '#A67C52',
      mud_medium: '#8B6444',
      mud_dark: '#6F4E37',
      mud_dense: '#5C4033',
      mud_core: '#3E2723',
      rock: '#9E9E9E',
      red_frame: '#D32F2F',
    };

    // Render each block
    for (let worldY = 0; worldY < batchSize * CHUNK_SIZE; worldY += 1) {
      for (let worldX = 0; worldX < batchSize * CHUNK_SIZE; worldX += 1) {
        const chunkX = Math.floor(worldX / CHUNK_SIZE);
        const chunkY = Math.floor(worldY / CHUNK_SIZE);
        const localX = worldX % CHUNK_SIZE;
        const localY = worldY % CHUNK_SIZE;

        const chunkIndex = chunkY * batchSize + chunkX;
        const chunk = chunks[chunkIndex];
        const blockIndex = localY * CHUNK_SIZE + localX;
        const blockType = chunk.blocks[blockIndex];

        const blockName = getBlock(blockType).name;
        const color = blockColors[blockName] || '#FF00FF';

        ctx.fillStyle = color;
        ctx.fillRect(worldX * blockSize, worldY * blockSize, blockSize, blockSize);
      }
    }

    return canvas.toDataURL('image/png');
  }
}
