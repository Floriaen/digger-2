# Chain-Reaction Hooks API

## Overview

The Chain-Reaction Hooks system enables multi-block destruction patterns for future hazards like explosions, collapse mechanics, or environmental chain reactions. This system is **currently stubbed** but provides integration points for future development.

**Status**: 🚧 Framework ready, awaiting gameplay implementation

## Core Architecture

### Event-Driven Pattern
Chain reactions use the existing event bus to broadcast destruction events and trigger cascading effects.

**Flow**:
1. Primary block destroyed → `block:destroyed` event fires
2. Chain-reaction listener catches event
3. Pattern-based destruction applied to surrounding blocks
4. Each destroyed block fires its own `block:destroyed` event (recursive)
5. Falling blocks system responds to all destruction events

---

## Event System Integration

### Primary Event: `block:destroyed`

**Emitted by**: [`PlayerComponent._digInDirection()`](../src/components/player.component.js:354)

**Payload**:
```javascript
{
  x: number,  // Grid X coordinate
  y: number   // Grid Y coordinate
}
```

**Current Subscribers**:
- `FallingBlocksComponent`: Checks blocks above for gravity triggers

**Future Subscribers**:
- `ChainReactionComponent` (planned): Explosive/collapse patterns
- `ScoreComponent` (planned): Combo multipliers for chain destructions

---

## Usage Example: Explosive Block (Future)

### Step 1: Define New Block Type
Add to [`block-registry.js`](../src/terrain/block-registry.js):

```javascript
export const BLOCK_TYPES = {
  // ... existing types
  EXPLOSIVE: 11,
};

[BLOCK_TYPES.EXPLOSIVE]: {
  hp: 1,
  traversable: false,
  diggable: true,
  color: '#FF6F00',
  name: 'explosive',
  spriteX: 96, // New sprite position
  spriteY: 0,
  chainReaction: 'cross', // Custom property for pattern type
},
```

### Step 2: Create Chain Reaction Component

**File**: `src/components/chain-reaction.component.js`

```javascript
import { Component } from '../core/component.base.js';
import { eventBus } from '../utils/event-bus.js';
import { BLOCK_TYPES, getBlock } from '../terrain/block-registry.js';

export class ChainReactionComponent extends Component {
  init() {
    // Subscribe to block destruction events
    this.unsubscribe = eventBus.on('block:destroyed', ({ x, y }) => {
      this._handleDestruction(x, y);
    });
  }

  _handleDestruction(x, y) {
    const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainComponent');
    if (!terrain) return;

    // Check if destroyed block had a chain reaction property
    const blockType = terrain.getBlock(x, y); // This will be EMPTY after destruction
    const blockData = getBlock(blockType);

    // Use a "pre-destruction" cache to check what block WAS there
    // (Implementation detail - would need modification to terrain component)
    const patternType = blockData.chainReaction;

    if (patternType === 'cross') {
      this._explodeCrossPattern(terrain, x, y);
    } else if (patternType === 'radial') {
      this._explodeRadialPattern(terrain, x, y, 2); // radius = 2
    }
  }

  _explodeCrossPattern(terrain, x, y) {
    // Destroy blocks in cross pattern (up, down, left, right)
    const offsets = [
      { dx: 0, dy: -1 }, // Up
      { dx: 0, dy: 1 },  // Down
      { dx: -1, dy: 0 }, // Left
      { dx: 1, dy: 0 },  // Right
    ];

    offsets.forEach(({ dx, dy }) => {
      const targetX = x + dx;
      const targetY = y + dy;
      const blockType = terrain.getBlock(targetX, targetY);

      // Only destroy diggable blocks
      if (getBlock(blockType).diggable) {
        terrain.setBlock(targetX, targetY, BLOCK_TYPES.EMPTY);
        eventBus.emit('block:destroyed', { x: targetX, y: targetY });
      }
    });
  }

  _explodeRadialPattern(terrain, centerX, centerY, radius) {
    // Destroy all blocks within radius
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > radius) continue;

        const targetX = centerX + dx;
        const targetY = centerY + dy;
        const blockType = terrain.getBlock(targetX, targetY);

        if (getBlock(blockType).diggable) {
          terrain.setBlock(targetX, targetY, BLOCK_TYPES.EMPTY);
          eventBus.emit('block:destroyed', { x: targetX, y: targetY });
        }
      }
    }
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
```

### Step 3: Register Component

Add to [`main.js`](../src/main.js):
```javascript
import { ChainReactionComponent } from './components/chain-reaction.component.js';

// In init() function, before terrain component:
game.addComponent(new ChainReactionComponent(game));
game.addComponent(new TerrainComponent(game)); // Terrain must be after chain reaction
```

---

## Destruction Patterns

### Cross Pattern
Destroys 4 blocks (up, down, left, right) adjacent to origin.

**Use Case**: Directional explosives, TNT blocks

**Visual**:
```
    X
  X O X
    X
```

### Radial Pattern (Circular)
Destroys all blocks within radius R.

**Use Case**: Grenades, collapse mechanics

**Visual** (radius = 2):
```
    X X X
  X X X X X
  X X O X X
  X X X X X
    X X X
```

### Line Pattern (Directional)
Destroys blocks in a straight line (like a laser).

**Use Case**: Beam weapons, drill tools

**Visual** (right direction, length = 4):
```
O X X X X
```

### Cluster Pattern (Rectangular)
Destroys 3x3 or NxM rectangular area.

**Use Case**: Large explosives, building demolition

**Visual** (3x3):
```
X X X
X O X
X X X
```

---

## Advanced: Pre-Destruction Block Type Caching

### Problem
When `block:destroyed` event fires, the block is already set to EMPTY. Chain reaction component can't determine what block type triggered the event.

### Solution: Terrain Component Modification

**Add to [`TerrainComponent`](../src/components/terrain.component.js)**:

```javascript
/**
 * Set block type with pre-destruction cache
 * @param {number} x - Grid X
 * @param {number} y - Grid Y
 * @param {number} blockType - New block type
 */
setBlock(x, y, blockType) {
  const chunkX = Math.floor(x / CHUNK_SIZE);
  const chunkY = Math.floor(y / CHUNK_SIZE);
  const chunk = this.cache.getChunk(chunkX, chunkY);
  if (!chunk) return;

  const localX = x - chunkX * CHUNK_SIZE;
  const localY = y - chunkY * CHUNK_SIZE;

  // Cache previous block type before destruction
  const previousBlockType = chunk.getBlock(localX, localY);
  this.lastDestroyedBlockType = previousBlockType; // Store for chain reaction component

  chunk.setBlock(localX, localY, blockType);
}
```

**Access in Chain Reaction Component**:
```javascript
_handleDestruction(x, y) {
  const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainComponent');
  const previousBlockType = terrain.lastDestroyedBlockType;
  const blockData = getBlock(previousBlockType);

  if (blockData.chainReaction) {
    this._triggerPattern(blockData.chainReaction, x, y);
  }
}
```

---

## Event Payload Extensions

### Enhanced `block:destroyed` Event

**Current Payload**:
```javascript
{ x: number, y: number }
```

**Proposed Payload** (for chain reactions):
```javascript
{
  x: number,           // Grid X
  y: number,           // Grid Y
  blockType: number,   // Block type that was destroyed
  source: string,      // 'player' | 'gravity' | 'chain-reaction'
  chainDepth: number,  // 0 = primary, 1+ = cascading
}
```

**Benefits**:
- Prevents infinite loops (limit chainDepth)
- Track destruction source for scoring
- Distinguish player-initiated vs. environmental destruction

---

## Recursive Chain Safety

### Infinite Loop Prevention

**Problem**: Explosive block A triggers explosive block B, which triggers A again.

**Solution**: Chain depth tracking

```javascript
_handleDestruction(x, y, chainDepth = 0) {
  const MAX_CHAIN_DEPTH = 5; // Prevent infinite recursion
  if (chainDepth >= MAX_CHAIN_DEPTH) return;

  // Process destruction pattern
  offsets.forEach(({ dx, dy }) => {
    // ... destroy blocks
    eventBus.emit('block:destroyed', {
      x: targetX,
      y: targetY,
      chainDepth: chainDepth + 1 // Increment depth
    });
  });
}
```

---

## Performance Considerations

### Batch Destruction
For large patterns (radial radius > 3), batch destroy blocks and emit single event:

```javascript
_explodeRadialBatch(terrain, centerX, centerY, radius) {
  const destroyedBlocks = [];

  // Collect all blocks to destroy
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      // ... distance check
      if (getBlock(blockType).diggable) {
        destroyedBlocks.push({ x: targetX, y: targetY });
        terrain.setBlock(targetX, targetY, BLOCK_TYPES.EMPTY);
      }
    }
  }

  // Emit batch event (falling blocks can process efficiently)
  eventBus.emit('blocks:destroyed-batch', { blocks: destroyedBlocks });
}
```

### Falling Blocks Optimization
Update `FallingBlocksComponent` to handle batch events:

```javascript
eventBus.on('blocks:destroyed-batch', ({ blocks }) => {
  const affectedColumns = new Set();
  blocks.forEach(({ x }) => affectedColumns.add(x));

  // Only check columns that had destructions
  affectedColumns.forEach((colX) => {
    this._checkColumnForFalling(colX);
  });
});
```

---

## Visual Effects Integration

### Explosion Animation Hook

**Event**: `explosion:triggered`

**Payload**:
```javascript
{
  x: number,        // World pixel X
  y: number,        // World pixel Y
  radius: number,   // Visual effect radius
  type: string,     // 'fire' | 'smoke' | 'dust'
}
```

**Subscriber** (future `ParticleComponent`):
```javascript
eventBus.on('explosion:triggered', ({ x, y, radius, type }) => {
  this.createExplosionParticles(x, y, radius, type);
});
```

---

## Testing Chain Reactions

### Unit Test Template
```javascript
describe('ChainReactionComponent', () => {
  it('should destroy cross pattern for explosive block', () => {
    // Setup terrain with explosive at (5, 5)
    terrain.setBlock(5, 5, BLOCK_TYPES.EXPLOSIVE);
    terrain.setBlock(5, 4, BLOCK_TYPES.MUD_LIGHT); // Above
    terrain.setBlock(5, 6, BLOCK_TYPES.MUD_LIGHT); // Below
    terrain.setBlock(4, 5, BLOCK_TYPES.MUD_LIGHT); // Left
    terrain.setBlock(6, 5, BLOCK_TYPES.MUD_LIGHT); // Right

    // Trigger destruction
    terrain.setBlock(5, 5, BLOCK_TYPES.EMPTY);
    eventBus.emit('block:destroyed', { x: 5, y: 5, blockType: BLOCK_TYPES.EXPLOSIVE });

    // Verify cross pattern destroyed
    expect(terrain.getBlock(5, 4)).toBe(BLOCK_TYPES.EMPTY);
    expect(terrain.getBlock(5, 6)).toBe(BLOCK_TYPES.EMPTY);
    expect(terrain.getBlock(4, 5)).toBe(BLOCK_TYPES.EMPTY);
    expect(terrain.getBlock(6, 5)).toBe(BLOCK_TYPES.EMPTY);
  });
});
```

---

## Integration Checklist

When adding chain-reaction blocks:
- [ ] Define block type in `BLOCK_TYPES`
- [ ] Add `chainReaction` property to registry
- [ ] Create sprite in atlas
- [ ] Implement destruction pattern in `ChainReactionComponent`
- [ ] Add visual effect hook (particle system)
- [ ] Test recursive chain depth limits
- [ ] Verify falling blocks trigger correctly after chain
- [ ] Update procedural generation to place new block type

---

## Future Enhancements

### Conditional Chain Reactions
Blocks trigger different patterns based on context:
```javascript
[BLOCK_TYPES.UNSTABLE_MUD]: {
  // ... properties
  chainReaction: (x, y, terrain) => {
    // Custom logic - only explode if surrounded by empty blocks
    const surroundingEmpty = this._countEmptyNeighbors(terrain, x, y);
    return surroundingEmpty >= 3 ? 'radial' : null;
  },
},
```

### Delayed Chain Reactions
Fuse mechanics with timer delays:
```javascript
_triggerDelayedExplosion(x, y, delayMs) {
  setTimeout(() => {
    eventBus.emit('block:destroyed', { x, y, source: 'delayed-fuse' });
  }, delayMs);
}
```

---

## Related Documentation
- [Block Registry API](./API_BLOCK_REGISTRY.md)
- [Event Bus Reference](../src/utils/event-bus.js)
- [Falling Blocks System](../src/components/falling-blocks.component.js)
- [Dev Tools Guide](./DEV_TOOLS.md)
