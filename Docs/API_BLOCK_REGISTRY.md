# Block Registry API

## Overview

The Block Registry is the single source of truth for all block types in Digger 2. It defines block properties, behaviors, collision rules, and sprite mappings.

**Location**: [`src/terrain/block-registry.js`](../src/terrain/block-registry.js)

## Core Concepts

### Block Type System
Each block has a unique numeric ID defined in `BLOCK_TYPES`. The registry maps these IDs to property objects that control gameplay behavior.

### Block Properties
Every block type has the following properties:
- **hp** (number | Infinity): Hit points - how many dig cycles required to destroy
- **traversable** (boolean): Can the player pass through? (true = passable, false = solid)
- **diggable** (boolean): Can the player dig/destroy this block?
- **color** (string | null): Hex color code for rendering (fallback if sprite unavailable)
- **name** (string): Human-readable identifier
- **spriteX** (number | null): X coordinate in sprite atlas (pixels)
- **spriteY** (number | null): Y coordinate in sprite atlas (pixels)

## Block Types Reference

### BLOCK_TYPES.EMPTY (0)
**Purpose**: Air/void space
**Properties**:
- HP: 0 (instant destruction, but not diggable)
- Traversable: ✅ Yes
- Diggable: ❌ No (already empty)

**Use Case**: Caverns, player-dug tunnels

---

### BLOCK_TYPES.MUD_LIGHT (1)
**Purpose**: Surface-layer soft earth
**Properties**:
- HP: 1 (200ms dig time at DIG_INTERVAL_MS=200)
- Traversable: ❌ No
- Diggable: ✅ Yes

**Sprite**: 16x25px classic mud tile (spriteX: 16, spriteY: 0)

**Use Case**: Top 40 units of terrain, easy digging

---

### BLOCK_TYPES.MUD_MEDIUM (2)
**Purpose**: Mid-depth earth
**Properties**:
- HP: 2 (400ms dig time)
- Traversable: ❌ No
- Diggable: ✅ Yes

**Sprite**: Same as MUD_LIGHT (uses color darkening for variation)

**Use Case**: 40-80 units depth, moderate resistance

---

### BLOCK_TYPES.MUD_DARK (3)
**Purpose**: Deep earth
**Properties**:
- HP: 3 (600ms dig time)
- Traversable: ❌ No
- Diggable: ✅ Yes

**Use Case**: 80-120 units depth

---

### BLOCK_TYPES.MUD_DENSE (4)
**Purpose**: Very deep compressed earth
**Properties**:
- HP: 4 (800ms dig time)
- Traversable: ❌ No
- Diggable: ✅ Yes

**Use Case**: 120-200 units depth

---

### BLOCK_TYPES.MUD_CORE (5)
**Purpose**: Core layer, maximum diggable density
**Properties**:
- HP: 5 (1000ms dig time)
- Traversable: ❌ No
- Diggable: ✅ Yes

**Use Case**: 200+ units depth, toughest diggable material

---

### BLOCK_TYPES.ROCK (6)
**Purpose**: Indestructible obstacles
**Properties**:
- HP: Infinity (cannot be destroyed)
- Traversable: ❌ No
- Diggable: ❌ No

**Behavior**: Falling solid - drops when support is removed, kills player on collision

**Sprite**: Gray rock tile (spriteX: 48, spriteY: 0)

**Use Case**: Rare obstacles forcing lateral navigation, environmental hazards

---

### BLOCK_TYPES.RED_FRAME (7)
**Purpose**: Torus structure borders
**Properties**:
- HP: 5 (1000ms dig time)
- Traversable: ❌ No
- Diggable: ✅ Yes

**Sprite**: Red tile (spriteX: 32, spriteY: 0)

**Use Case**: 8x6 hollow rectangle formations (red torus rings)

---

### BLOCK_TYPES.LAVA (8)
**Purpose**: Lethal liquid at world bottom
**Properties**:
- HP: Infinity (cannot be destroyed)
- Traversable: ✅ Yes (player falls through)
- Diggable: ❌ No

**Behavior**: Kills player on contact, ends run

**Sprite**: Bright red animated tile (spriteX: 64, spriteY: 0)

**Use Case**: World termination zone below final terrain band

---

### BLOCK_TYPES.GRASS (9)
**Purpose**: Surface grass layer
**Properties**:
- HP: 1 (200ms dig time)
- Traversable: ❌ No
- Diggable: ✅ Yes

**Sprite**: Grass-topped block (spriteX: 0, spriteY: 0)

**Use Case**: Top surface visual layer (gridY = 2-3)

---

## API Functions

### `getBlock(blockId)`
Retrieves full block property object.

**Parameters**:
- `blockId` (number): Block type ID from BLOCK_TYPES

**Returns**: Object with properties { hp, traversable, diggable, color, name, spriteX, spriteY }

**Example**:
```javascript
import { getBlock, BLOCK_TYPES } from './terrain/block-registry.js';

const rockProps = getBlock(BLOCK_TYPES.ROCK);
console.log(rockProps.hp); // Infinity
console.log(rockProps.diggable); // false
```

---

### `isDiggable(blockId)`
Checks if player can dig/destroy this block.

**Parameters**:
- `blockId` (number): Block type ID

**Returns**: boolean

**Example**:
```javascript
isDiggable(BLOCK_TYPES.MUD_LIGHT); // true
isDiggable(BLOCK_TYPES.ROCK); // false
isDiggable(BLOCK_TYPES.EMPTY); // false
```

---

### `isTraversable(blockId)`
Checks if player can pass through this block (air/void).

**Parameters**:
- `blockId` (number): Block type ID

**Returns**: boolean

**Example**:
```javascript
isTraversable(BLOCK_TYPES.EMPTY); // true
isTraversable(BLOCK_TYPES.LAVA); // true (lethal but passable)
isTraversable(BLOCK_TYPES.MUD_LIGHT); // false
```

---

### `isSolid(blockId)`
Checks if block is solid (opposite of traversable).

**Parameters**:
- `blockId` (number): Block type ID

**Returns**: boolean

**Example**:
```javascript
isSolid(BLOCK_TYPES.MUD_LIGHT); // true
isSolid(BLOCK_TYPES.EMPTY); // false
```

---

## Adding New Block Types

### Step 1: Define Block ID
Add entry to `BLOCK_TYPES` enum:
```javascript
export const BLOCK_TYPES = {
  // ... existing types
  SPIKE: 10,
};
```

### Step 2: Register Properties
Add entry to `REGISTRY` object:
```javascript
[BLOCK_TYPES.SPIKE]: {
  hp: Infinity,
  traversable: true, // Player can fall into it (lethal)
  diggable: false,
  color: '#FFD700',
  name: 'spike',
  spriteX: 80, // New sprite position in atlas
  spriteY: 0,
},
```

### Step 3: Update Sprite Atlas (if needed)
Add 16x25px sprite to `Sprite/sprite.png` at specified coordinates.

### Step 4: Integrate Behavior
- **Falling solid**: Add to [`FallingBlocksComponent`](../src/components/falling-blocks.component.js) gravity system
- **Lethal collision**: Add check in [`PlayerComponent`](../src/components/player.component.js) update loop
- **Procedural generation**: Add to [`TerrainGenerator`](../src/terrain/terrain-generator.js) noise distribution

---

## HP System & Digging Mechanics

### Dig Timing
Each HP point consumes `DIG_INTERVAL_MS` (default: 200ms).

**Examples**:
- MUD_LIGHT (HP=1): 200ms
- MUD_CORE (HP=5): 1000ms (5 × 200ms)
- RED_FRAME (HP=5): 1000ms

### Progressive Damage
Player digs blocks incrementally:
1. Player targets adjacent block
2. Every `DIG_INTERVAL_MS`, block HP decreases by 1
3. Visual indicator shows white outline around target
4. When HP reaches 0, block converts to EMPTY
5. `block:destroyed` event fires for falling blocks system

### Dig Direction
- **Downward**: Auto-dig with 150ms coyote time delay before moving
- **Lateral**: Immediate movement after block destroyed
- **Inside block**: Emergency dig at current position (edge case recovery)

---

## Collision Rules

### Solid Blocks
- Block movement when player attempts to enter
- Navigation triangles only appear adjacent to diggable solids
- Falling solids (ROCK) kill player on contact

### Traversable Blocks
- EMPTY: Safe passage
- LAVA: Lethal passage (triggers death event)

### Edge Cases
- **Player inside solid**: Auto-dig current position (recovery mechanism)
- **Unsupported ROCK**: Gravity system triggers fall, lethal to player below

---

## Sprite Atlas Integration

### Atlas Layout
Blocks are rendered from `Sprite/sprite.png` (128x32px atlas):
- **spriteX**: X offset in pixels (16px increments)
- **spriteY**: Y offset in pixels (usually 0 for first row)

### Tile Dimensions
- **Collision box**: 16x16px (square base)
- **Visual sprite**: 16x25px (includes 9px fake-3D cap)

### Rendering Order
Terrain rendered bottom-to-top to handle fake-3D overlaps.

---

## Event Integration

### block:destroyed
Fired when block HP reaches 0 in [`PlayerComponent._digInDirection()`](../src/components/player.component.js:354).

**Payload**: `{ x: number, y: number }`

**Subscribers**:
- `FallingBlocksComponent`: Checks if blocks above need to fall

**Example**:
```javascript
import { eventBus } from './utils/event-bus.js';

eventBus.on('block:destroyed', ({ x, y }) => {
  console.log(`Block destroyed at (${x}, ${y})`);
});
```

---

## Performance Considerations

### Registry Lookup
All lookups are O(1) hash map operations - no performance concerns.

### Sprite Caching
Sprite sheet loaded once at initialization ([`TerrainComponent.init()`](../src/components/terrain.component.js:26)).

### Block Type Distribution
Procedural generation uses stratified bands - no need for weighted random selection at runtime.

---

## Future Extensibility

### Planned Block Types (Spec References)
- **SPIKE**: Stationary lethal hazard (traversable: true, kills on contact)
- **CHEST**: Collectible container (HP=1, drops score items)
- **RARE_MINERAL**: High-value diggable (HP=3, unique sprite)

### Hook System
Future chain-reaction system will allow blocks to trigger multi-block destruction patterns (see [API_CHAIN_REACTIONS.md](./API_CHAIN_REACTIONS.md)).

---

## Testing & Validation

### Unit Test Checklist
- [ ] `getBlock()` returns correct properties for all BLOCK_TYPES
- [ ] `isDiggable()` matches registry `diggable` flag
- [ ] `isTraversable()` matches registry `traversable` flag
- [ ] Invalid block IDs return EMPTY properties (safe fallback)

### Integration Test Scenarios
1. Dig through MUD_LIGHT → MUD_CORE progression (verify timing)
2. Attempt to dig ROCK (verify blocked, no HP reduction)
3. Fall into LAVA (verify death event)
4. Destroy block supporting ROCK (verify falling solid behavior)

---

## Related Documentation
- [Chain-Reaction Hooks API](./API_CHAIN_REACTIONS.md)
- [Dev Tools Guide](./DEV_TOOLS.md)
- [Game Specification](./GAME_SPEC.md)
