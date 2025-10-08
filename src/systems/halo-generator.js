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
        // Range: 0.7 (close) -> 0.3 (far) for protective visibility
        const darknessAlpha = 0.7 - (distance / maxRadius) * 0.4; // 0.7 -> 0.3

        haloBlocks.push({
          x: centerX + dx,
          y: centerY + dy,
          blockData: BlockFactory.createProtectiveBlock(darknessAlpha),
        });
      }
    }
  }

  // Ensure at least one block exists in each cardinal/ordinal direction
  // Define 8 directions: N, NE, E, SE, S, SW, W, NW
  const directions = [
    { dx: 0, dy: -1, name: 'N' }, // North
    { dx: 1, dy: -1, name: 'NE' }, // Northeast
    { dx: 1, dy: 0, name: 'E' }, // East
    { dx: 1, dy: 1, name: 'SE' }, // Southeast
    { dx: 0, dy: 1, name: 'S' }, // South
    { dx: -1, dy: 1, name: 'SW' }, // Southwest
    { dx: -1, dy: 0, name: 'W' }, // West
    { dx: -1, dy: -1, name: 'NW' }, // Northwest
  ];

  directions.forEach(({ dx, dy }) => {
    // Check if any block exists in this direction
    const hasBlockInDirection = haloBlocks.some((block) => {
      const blockDx = block.x - centerX;
      const blockDy = block.y - centerY;

      // Calculate angle for both the direction and the block
      const dirAngle = Math.atan2(dy, dx);
      const blockAngle = Math.atan2(blockDy, blockDx);

      // Check if block is within ±22.5° of this direction
      const angleDiff = Math.abs(dirAngle - blockAngle);
      const normalizedDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
      return normalizedDiff < Math.PI / 8; // 22.5° in radians
    });

    if (!hasBlockInDirection) {
      // Add a guaranteed block at minRadius in this direction
      const guaranteedX = centerX + Math.round(dx * minRadius);
      const guaranteedY = centerY + Math.round(dy * minRadius);

      // Don't add if already exists
      const exists = haloBlocks.some((b) => b.x === guaranteedX && b.y === guaranteedY);
      if (!exists) {
        const distance = Math.sqrt(
          (guaranteedX - centerX) ** 2 + (guaranteedY - centerY) ** 2,
        );
        const darknessAlpha = 0.7 - (distance / maxRadius) * 0.4;

        haloBlocks.push({
          x: guaranteedX,
          y: guaranteedY,
          blockData: BlockFactory.createProtectiveBlock(darknessAlpha),
        });
      }
    }
  });

  return haloBlocks;
}
