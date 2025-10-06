/**
 * @file halo-generator.js
 * @description Generates organic protective halos around chests using noise
 */

import SimplexNoise from '../utils/noise.js';
import { BlockFactory } from '../factories/block.factory.js';

/**
 * Generate organic halo around a chest position
 * @param {number} centerX - Chest grid X position
 * @param {number} centerY - Chest grid Y position
 * @param {number} minRadius - Minimum halo radius (default: 1)
 * @param {number} maxRadius - Maximum halo radius (default: 3)
 * @param {number} seed - Random seed for noise generation
 * @returns {Array<Object>} Array of halo blocks with {x, y, blockData}
 */
export function generateHalo(centerX, centerY, minRadius = 1, maxRadius = 3, seed = Math.random()) {
  const noise = new SimplexNoise(seed);
  const haloBlocks = [];
  const noiseScale = 0.3; // Controls organic pattern frequency
  const threshold = 0.4; // Noise threshold for block placement

  // Scan area around chest
  for (let dy = -maxRadius; dy <= maxRadius; dy++) {
    for (let dx = -maxRadius; dx <= maxRadius; dx++) {
      // Skip center (chest position)
      if (dx === 0 && dy === 0) continue;

      const distance = Math.sqrt(dx * dx + dy * dy);

      // Skip if outside max radius
      if (distance > maxRadius) continue;

      // Get noise value for organic shape
      const noiseValue = noise.noise2D(
        (centerX + dx) * noiseScale,
        (centerY + dy) * noiseScale,
      );

      // Determine if block should exist based on distance and noise
      const distanceFactor = 1 - (distance / maxRadius);
      const placementProbability = distanceFactor * 0.7 + noiseValue * 0.3;

      if (placementProbability > threshold && distance >= minRadius) {
        // Calculate darkness alpha based on distance from center
        // Closer = darker (higher alpha), farther = lighter (lower alpha)
        const darknessAlpha = 0.8 - (distance / maxRadius) * 0.6; // 0.8 -> 0.2

        haloBlocks.push({
          x: centerX + dx,
          y: centerY + dy,
          blockData: BlockFactory.createProtectiveBlock(darknessAlpha),
        });
      }
    }
  }

  return haloBlocks;
}
