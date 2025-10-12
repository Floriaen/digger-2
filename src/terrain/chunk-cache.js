/**
 * @file chunk-cache.js
 * @description Chunk caching and streaming management
 */

import { CHUNK_CACHE_LIMIT } from '../utils/config.js';

/**
 * ChunkCache
 * Manages chunk loading, caching, and memory limits
 */
export class ChunkCache {
  constructor(generator) {
    this.generator = generator;
    this.chunks = new Map(); // Map<string, TerrainChunk>
    this.accessTimes = new Map(); // Map<string, number> for LRU
  }

  /**
   * Get or generate a chunk
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @returns {TerrainChunk}
   */
  getChunk(chunkX, chunkY) {
    if (this.generator.isChunkWithinBounds
      && !this.generator.isChunkWithinBounds(chunkX, chunkY)) {
      return null;
    }

    const key = `${chunkX},${chunkY}`;

    // Return cached chunk
    if (this.chunks.has(key)) {
      this.accessTimes.set(key, Date.now());
      return this.chunks.get(key);
    }

    // Generate new chunk (with performance tracking)
    let chunk = null;
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark('chunkGen-start');
    }
    chunk = this.generator.generateChunk(chunkX, chunkY);
    if (!chunk) {
      return null;
    }
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark('chunkGen-end');
      try {
        performance.measure('chunkGen', 'chunkGen-start', 'chunkGen-end');
      } catch (e) {
        // Ignore if marks don't exist
      }
    }

    this.chunks.set(key, chunk);
    this.accessTimes.set(key, Date.now());

    // Enforce cache limit (LRU eviction)
    if (this.chunks.size > CHUNK_CACHE_LIMIT) {
      this._evictOldest();
    }

    return chunk;
  }

  /**
   * Evict least recently used chunk
   * @private
   */
  _evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    this.accessTimes.forEach((time, key) => {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.chunks.delete(oldestKey);
      this.accessTimes.delete(oldestKey);
    }
  }

  /**
   * Clear all cached chunks
   */
  clear() {
    this.chunks.clear();
    this.accessTimes.clear();
  }
}
