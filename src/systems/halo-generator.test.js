/**
 * @file halo-generator.test.js
 * @description Tests for organic halo generation around chests
 */

import { generateHalo } from './halo-generator.js';

describe('generateHalo', () => {
  describe('directional coverage', () => {
    it('should create at least one block in each cardinal/ordinal direction', () => {
      const centerX = 50;
      const centerY = 50;
      const minRadius = 1;
      const maxRadius = 3;
      const seed = 12345; // Fixed seed for reproducibility

      const haloBlocks = generateHalo(centerX, centerY, minRadius, maxRadius, seed);

      // Define 8 directional sectors (45° each)
      // N: 337.5° - 22.5° (0°), NE: 22.5° - 67.5°, E: 67.5° - 112.5°, etc.
      const directions = {
        N: { min: -22.5, max: 22.5 },      // North (0°)
        NE: { min: 22.5, max: 67.5 },      // Northeast (45°)
        E: { min: 67.5, max: 112.5 },      // East (90°)
        SE: { min: 112.5, max: 157.5 },    // Southeast (135°)
        S: { min: 157.5, max: 202.5 },     // South (180°)
        SW: { min: 202.5, max: 247.5 },    // Southwest (225°)
        W: { min: 247.5, max: 292.5 },     // West (270°)
        NW: { min: 292.5, max: 337.5 },    // Northwest (315°)
      };

      // Count blocks in each direction
      const directionCounts = {
        N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0,
      };

      haloBlocks.forEach((block) => {
        const dx = block.x - centerX;
        const dy = block.y - centerY;

        // Calculate angle in degrees (0° = North, clockwise)
        // atan2 returns -π to π, with 0 pointing right (East)
        // Convert to 0-360° with 0° = North
        let angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180 to 180
        angle = (angle + 90) % 360; // Rotate 90° to make North = 0°
        if (angle < 0) angle += 360; // Normalize to 0-360

        // Determine which sector this block belongs to
        Object.keys(directions).forEach((dir) => {
          const { min, max } = directions[dir];

          // Handle wraparound for North (337.5° - 22.5°)
          if (dir === 'N') {
            if (angle >= 337.5 || angle < 22.5) {
              directionCounts[dir]++;
            }
          } else if (angle >= min && angle < max) {
            directionCounts[dir]++;
          }
        });
      });

      // Assert at least one block exists in each direction
      Object.keys(directionCounts).forEach((dir) => {
        expect(directionCounts[dir]).toBeGreaterThan(0);
      });
    });

    it('should not place any blocks at the center position', () => {
      const centerX = 50;
      const centerY = 50;
      const seed = 12345;

      const haloBlocks = generateHalo(centerX, centerY, 1, 3, seed);

      const centerBlock = haloBlocks.find((block) => block.x === centerX && block.y === centerY);
      expect(centerBlock).toBeUndefined();
    });

    it('should work with different radius values', () => {
      const centerX = 50;
      const centerY = 50;
      const testCases = [
        { minRadius: 1, maxRadius: 2, seed: 11111 },
        { minRadius: 2, maxRadius: 4, seed: 22222 },
        { minRadius: 1, maxRadius: 5, seed: 33333 },
      ];

      testCases.forEach(({ minRadius, maxRadius, seed }) => {
        const haloBlocks = generateHalo(centerX, centerY, minRadius, maxRadius, seed);

        // All blocks should be within maxRadius
        haloBlocks.forEach((block) => {
          const dx = block.x - centerX;
          const dy = block.y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          expect(distance).toBeLessThanOrEqual(maxRadius);
          expect(distance).toBeGreaterThanOrEqual(minRadius);
        });
      });
    });
  });
});
