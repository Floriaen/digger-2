# Developer Tools Guide

## Overview

Digger 2 includes several debugging and development utilities to streamline testing, terrain validation, and performance analysis.

---

## 1. Debug Overlay Component

**Location**: [`src/components/debug.component.js`](../src/components/debug.component.js)

### Features
- **Chunk Boundaries**: Visual grid showing 32x32 chunk divisions
- **HP Heatmap**: Color-coded block HP visualization (lighter = weaker)
- **Grid Coordinates**: Overlay showing block grid positions

### Activation
Toggle via [`config.js`](../src/utils/config.js) flags:

```javascript
export const DEBUG_MODE = true;           // Master toggle
export const SHOW_CHUNK_BOUNDS = false;   // Chunk boundary lines
export const SHOW_HP_HEATMAP = false;     // HP color overlay
```

### Visual Reference
- **Chunk bounds**: White dashed lines at chunk edges
- **HP heatmap**: Alpha overlay (HP=1 → light, HP=5 → dark)
- **Grid overlay**: Semi-transparent grid lines every 16px

### Usage Tips
- Enable `SHOW_CHUNK_BOUNDS` to debug chunk loading/caching issues
- Enable `SHOW_HP_HEATMAP` to visualize stratified terrain generation
- Disable all in production builds for performance

---

## 2. dat.GUI Control Panel

**Library**: [dat.GUI](https://github.com/dataarts/dat.gui) (included in `node_modules/`)

### Available Controls

#### Camera Folder
- **Follow Player** (boolean): Toggle auto-follow camera
- **Zoom Level** (0.5 - 2.0): Manual zoom control
- **Manual Camera X/Y**: Direct camera position override

#### Performance Folder (Milestone 4)
- **Enable Profiling** (boolean): Activate Performance API monitoring
- **FPS** (read-only): Current frames per second
- **Frame Time** (ms): Total frame duration (update + render)
- **Update Time** (ms): Component update loop timing
- **Render Time** (ms): Rendering pass timing
- **Chunk Gen Time** (ms): Procedural generation cost per chunk
- **Dig Time** (ms): Block destruction operation timing
- **Memory (MB)**: JavaScript heap usage
- **Warnings**: Frame drop alerts (>16.67ms)

#### Terrain Folder (if exposed)
- **Seed**: Procedural generation seed (requires reload)
- **Pure Mud Mode**: Generate only HP=1 blocks for testing
- **Show Grid**: Toggle grid overlay component

### Opening dat.GUI
- Automatically opens on page load
- Click folder headers to expand/collapse
- Close panel via X button (top-right)

### Adding Custom Controls
**Example** (in [`main.js`](../src/main.js)):
```javascript
const gui = new dat.GUI();
const testFolder = gui.addFolder('Testing');

const testData = { playerSpeed: 1.0 };
testFolder.add(testData, 'playerSpeed', 0.1, 5.0).name('Player Speed').onChange((value) => {
  player.speedMultiplier = value;
});

testFolder.open();
```

---

## 3. Batch Generator Tool

**Location**: [`tools/batch-tool.html`](../tools/batch-tool.html)

### Purpose
Generate 10x10 chunk composite images for procedural terrain validation without running the full game.

### Features
- **Seed Control**: Test specific seeds for deterministic output
- **Chunk Range Selection**: Generate custom X/Y chunk ranges
- **Visual Output**: Rendered composite image (320x320px @ 10x10 chunks)
- **JSON Metadata**: Block type distribution, HP statistics, chunk coordinates
- **Download**: Save PNG image + JSON data for documentation

### Workflow
1. Open `tools/batch-tool.html` in browser
2. Set seed (e.g., `12345` for default game seed)
3. Configure chunk range:
   - Start X/Y: Top-left chunk coordinate
   - Chunk count: Number of chunks (default: 10x10)
4. Click **Generate Terrain**
5. Review visual output and metadata
6. Click **Download PNG** to save composite

### Use Cases
- **Pre-release validation**: Verify no unwinnable terrain pockets
- **Seed testing**: Compare multiple seeds for quality
- **Documentation**: Generate terrain screenshots for spec
- **Regression testing**: Store reference images for visual diff

### Technical Details
- Uses same `TerrainGenerator` class as game
- Renders at 1px per block (no sprites, just base colors)
- Does NOT include player, camera, or falling blocks systems
- Runs entirely client-side (no backend required)

---

## 4. Performance Monitor (Milestone 4)

**Location**: [`src/utils/performance-monitor.js`](../src/utils/performance-monitor.js)

### Native Performance API Integration
Uses browser `PerformanceObserver` to track:
- Custom marks (`performance.mark()`)
- Custom measures (`performance.measure()`)
- Memory usage (`performance.memory` - Chrome only)

### Tracked Operations
| Operation     | Mark Name  | Description                              |
|---------------|------------|------------------------------------------|
| Frame Total   | `frame`    | Full update + render cycle               |
| Update Loop   | `update`   | All component `update()` calls           |
| Render Loop   | `render`   | All component `render()` calls           |
| Chunk Gen     | `chunkGen` | Procedural noise + block placement       |
| Dig Operation | `dig`      | Block HP reduction + destruction event   |

### Accessing Metrics
```javascript
const metrics = game.performanceMonitor.getMetrics();
console.log(`FPS: ${metrics.fps.toFixed(0)}`);
console.log(`Frame Time: ${metrics.frameTime.avg}ms`);
console.log(`Memory: ${metrics.memoryUsage.current}MB`);
```

### Frame Drop Warnings
Automatically logs warnings when frame time exceeds 16.67ms (60 FPS threshold).

**View in dat.GUI**: Performance folder → Warnings field

### Optimization Workflow
1. Enable profiling in dat.GUI
2. Play game normally for 30-60 seconds
3. Review metrics:
   - High `chunkGen` → Optimize noise function or reduce chunk size
   - High `renderTime` → Batch rendering or reduce visible chunks
   - High `memoryUsage` → Investigate chunk cache eviction
4. Check warnings for specific frame drops
5. Profile again after changes to verify improvement

---

## 5. Browser DevTools Integration

### Console Commands

#### Pause Game
```javascript
game.pause();
```

#### Resume Game
```javascript
game.resume();
```

#### Manual Chunk Load
```javascript
const terrain = game.components.find(c => c.constructor.name === 'TerrainComponent');
terrain.cache.getChunk(5, 10); // Force load chunk at (5, 10)
```

#### Clear Performance Data
```javascript
game.performanceMonitor.reset();
game.performanceMonitor.clearEntries();
```

#### Teleport Player
```javascript
const player = game.components.find(c => c.constructor.name === 'PlayerComponent');
player.gridX = 20;
player.gridY = 50;
player.x = player.gridX * 16 + 8;
player.y = player.gridY * 16 + 8;
```

### Chrome DevTools Performance Tab
1. Open DevTools (F12) → Performance tab
2. Click Record
3. Play game for 10-30 seconds
4. Stop recording
5. Analyze:
   - **Main thread**: Look for long tasks (>50ms)
   - **Scripting**: JavaScript execution time
   - **Rendering**: Layout/paint operations
   - **GPU**: Canvas draw calls

---

## 6. Keyboard Shortcuts (Debug Mode)

### Current Shortcuts
| Key       | Action                    |
|-----------|---------------------------|
| Left/Right Arrow | Move player          |
| Down Arrow | Start game / Dig down   |
| Space     | Toggle pause              |
| ESC       | Toggle pause              |

### Proposed Debug Shortcuts (Future)
| Key | Action                          |
|-----|---------------------------------|
| `G` | Toggle grid overlay             |
| `H` | Toggle HP heatmap               |
| `C` | Toggle chunk boundaries         |
| `F` | Toggle FPS counter              |
| `T` | Teleport player to cursor       |
| `R` | Reload terrain (new seed)       |

---

## 7. Mobile Testing Tools

### Responsive Canvas
Canvas automatically resizes to fit viewport (9:16 aspect ratio for portrait phones).

**Test different sizes**:
```javascript
// Simulate iPhone 12 Pro (390x844)
window.resizeTo(390, 844);

// Simulate iPad (768x1024)
window.resizeTo(768, 1024);
```

### Touch Input Debug
Enable touch zone visualization in [`TouchInputComponent`](../src/components/touch-input.component.js):

```javascript
const touchInput = game.components.find(c => c.constructor.name === 'TouchInputComponent');
touchInput.forceShow = true; // Show zone boundaries even on desktop
```

### Remote Debugging
- **iOS Safari**: Settings → Safari → Advanced → Web Inspector
- **Android Chrome**: chrome://inspect on desktop Chrome

---

## 8. Terrain Validation Utilities

### Escape Heuristics Test
Verify player can always dig out of generated terrain.

**Manual Test**:
1. Open batch generator
2. Generate 10x10 chunk grid
3. Visually scan for isolated pockets (all sides rock)
4. If found, note seed and coordinates for bug report

**Automated Test** (ECS-compliant):
```javascript
import { PhysicsComponent } from '../components/blocks/physics.component.js';
import { DiggableComponent } from '../components/blocks/diggable.component.js';

function validateChunkEscapability(chunk) {
  for (let y = 0; y < CHUNK_SIZE; y++) {
    for (let x = 0; x < CHUNK_SIZE; x++) {
      const block = chunk.getBlock(x, y);

      // Skip empty blocks
      if (!block.has(PhysicsComponent)) continue;

      const physics = block.get(PhysicsComponent);
      const isDiggable = block.has(DiggableComponent);

      // If block is solid and not diggable, check if trapped
      if (physics.isCollidable() && !isDiggable) {
        const neighbors = [
          chunk.getBlock(x - 1, y),
          chunk.getBlock(x + 1, y),
          chunk.getBlock(x, y - 1),
          chunk.getBlock(x, y + 1),
        ];

        const escapable = neighbors.some(n =>
          n.has(DiggableComponent) || !n.get(PhysicsComponent)?.isCollidable()
        );

        if (!escapable) {
          console.error(`Unescapable block at (${x}, ${y})`);
          return false;
        }
      }
    }
  }
  return true;
}
```

---

## 9. Save/Load System (Future)

### Planned Features
- **Save current run**: Serialize player position, terrain chunks, score
- **Load previous run**: Restore exact game state
- **Run replay**: Record input sequence, play back deterministically

### LocalStorage Schema (Proposed)
```javascript
{
  "seed": 12345,
  "playerX": 12,
  "playerY": 150,
  "score": 0,
  "modifiedChunks": [
    { "chunkX": 0, "chunkY": 0, "data": [...] },
    // Only save modified chunks (digging creates diffs from generated state)
  ]
}
```

---

## 10. Testing Checklist

### Pre-Release Validation
- [ ] Enable `SHOW_HP_HEATMAP` → Verify stratification (light → dark with depth)
- [ ] Generate 5 random seeds in batch tool → No unescapable pockets
- [ ] Enable profiling → Play 5 minutes → FPS stays >55
- [ ] Test on mobile device → Touch zones respond correctly
- [ ] Resize browser window → Canvas scales without artifacts
- [ ] Dig to lava layer → Death event fires correctly
- [ ] Create unsupported rock → Falls and kills player

### Performance Benchmarks
| Metric           | Target | Acceptable | Warning |
|------------------|--------|------------|---------|
| FPS              | 60     | 55-60      | <55     |
| Frame Time       | <16ms  | <18ms      | >20ms   |
| Chunk Gen        | <5ms   | <10ms      | >15ms   |
| Memory Usage     | <100MB | <150MB     | >200MB  |

---

## Related Documentation
- [ECS Cleanup](./ECS_CLEANUP.md) - Architecture refactor documentation
- [Chain-Reaction Hooks](./API_CHAIN_REACTIONS.md)
- [Game Specification](./GAME_SPEC.md)
- [Development Plan](./archive/DEVELOPMENT_PLAN.md) - Archived milestone specifications
