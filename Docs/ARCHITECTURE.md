# Architecture Documentation

**Digger 2** — A procedural digging game built with a hybrid ECS (Entity-Component-System) architecture

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Philosophy](#architecture-philosophy)
3. [Core Concepts](#core-concepts)
4. [Directory Structure](#directory-structure)
5. [Architectural Patterns](#architectural-patterns)
6. [Game Loop Flow](#game-loop-flow)
7. [Communication Patterns](#communication-patterns)
8. [Key Systems Explained](#key-systems-explained)
9. [Entity & Component Design](#entity--component-design)
10. [Rendering Pipeline](#rendering-pipeline)
11. [Terrain Generation](#terrain-generation)
12. [Code Examples](#code-examples)

---

## Overview

Digger 2 uses a **hybrid architecture** that combines:

- **Pure ECS** for game entities (blocks, NPCs)
- **Game Loop Systems** for global managers (player, camera, terrain)
- **Event-driven communication** for decoupled systems
- **Factory pattern** for entity creation

This hybrid approach balances ECS purity with pragmatic game development needs.

---

## Architecture Philosophy

### Design Principles

1. **YAGNI** (You Aren't Gonna Need It) — Build only what's needed now
2. **DRY** (Don't Repeat Yourself) — Avoid code duplication
3. **KISS** (Keep It Simple, Stupid) — Simple solutions over complex ones
4. **No Fallbacks** — Errors surface immediately during development

### Why Hybrid ECS?

**Pure ECS** works great for:
- Blocks (thousands of entities with varied components)
- NPCs (multiple instances with shared behaviors)

**Game Loop Systems** work better for:
- Singletons (one player, one camera, one terrain manager)
- Cross-cutting concerns (input, rendering, debug)

This pragmatic split avoids over-engineering singletons as ECS entities.

---

## Core Concepts

### 1. **System** (Game Loop Manager)

Base class: `src/core/system.js`

**Purpose**: Manages game loop responsibilities (update/render/destroy)

**Characteristics**:
- Extends `System` base class
- Lives in `/systems/` directory
- One instance per game
- Named with `*System` suffix

**Examples**:
- `PlayerSystem` — Player input, movement, state
- `CameraSystem` — Viewport tracking
- `TerrainSystem` — Chunk loading/unloading
- `GravitySystem` — Physics for fallable entities
- `NPCSystem` — NPC lifecycle management

### 2. **Component** (ECS Component)

Base class: `src/core/component.js`

**Purpose**: Data + behavior for game entities

**Characteristics**:
- Extends `Component` base class
- Lives in `/components/` directory
- Attached to entities (many instances)
- Named with `*Component` suffix

**Examples**:
- `HealthComponent` — Block durability
- `PhysicsComponent` — Collision properties
- `FallableComponent` — Gravity behavior
- `PositionComponent` — NPC position data

### 3. **Entity** (ECS Entity Container)

**Purpose**: Container for components

**Characteristics**:
- Simple class with component map
- Lives in `/entities/` directory
- No game logic (just component storage)

**Types**:
- `Block` — Block entities (terrain, rocks, coins, lava)
- `NPC` — Non-player characters (maggots, etc.)

### 4. **Factory** (Entity Builder)

**Purpose**: Assembles entities from components

**Characteristics**:
- Lives in `/factories/` directory
- Centralizes entity creation logic
- Ensures consistent component configuration

**Example**:
```javascript
// BlockFactory.createRock() creates:
Block + HealthComponent + PhysicsComponent + RenderComponent + FallableComponent
```

---

## Directory Structure

```
/src
  /core                    → Engine primitives
    game.js                → Game loop orchestrator
    system.js              → Base class for game systems
    component.js           → Base class for ECS components

  /systems                 → Game loop systems (17 systems)
    player.system.js       → Player controller
    terrain.system.js      → Chunk management
    camera.system.js       → Viewport tracking
    gravity.system.js      → Falling physics
    npc.system.js          → NPC lifecycle
    input.system.js        → Input capture
    hud.system.js          → UI rendering
    background.system.js   → Background rendering
    debug.system.js        → Debug overlays
    shadow.system.js       → Shadow rendering
    navigation.system.js   → Navigation UI
    dig-indicator.system.js→ Dig target UI
    coin-effect.system.js  → Coin animations
    physics.system.js      → Physics queries
    touch-input.system.js  → Touch controls
    grid-overlay.system.js → Debug grid
    halo-generator.js      → Sprite halos

  /components              → ECS components
    /block                 → Block entity components (11 components)
      health.component.js
      physics.component.js
      diggable.component.js
      lootable.component.js
      fallable.component.js
      lethal.component.js
      render.component.js
      darkness.component.js
      collectable.component.js
      loot-effect.component.js
      pause-on-destroy.component.js
    /npc                   → NPC entity components (8 components)
      position.component.js
      render.component.js
      state.component.js
      fall.component.js
      walker.component.js
      eater.component.js
      kill.component.js
      spawn.component.js

  /entities                → Entity containers
    block.entity.js        → Block entity class
    npc.entity.js          → NPC entity class

  /factories               → Entity factories
    block.factory.js       → Block entity assembly

  /terrain                 → Terrain generation subsystem
    terrain-generator.js   → Procedural generation
    chunk-cache.js         → Chunk loading/caching
    terrain-chunk.js       → Chunk data structure (32x32 blocks)

  /rendering               → Rendering subsystem
    sprite-atlas.js        → Texture atlas management
    render-queue.js        → Render order sorting
    render-layer.js        → Layer enumeration

  /utils                   → Utilities
    event-bus.js           → Event system
    config.js              → Game constants
    math.js                → Math helpers
    noise.js               → Perlin noise
    performance-monitor.js → Perf tracking
    batch-generator.js     → Chunk batching

  /npc                     → NPC entity definitions
    maggot.js              → Maggot NPC configuration

  main.js                  → Entry point
```

---

## Architectural Patterns

### 1. **Hybrid ECS**

**What**: Mix of pure ECS (entities) and game loop systems (managers)

**Why**:
- ECS shines for **many similar entities** (blocks, NPCs)
- Systems work better for **singletons** (player, camera, terrain)

**Trade-off**: Slightly less pure ECS, but more pragmatic

---

### 2. **Event-Driven Communication**

**What**: Systems communicate via event bus (`event-bus.js`)

**Why**: Decouples systems (no direct references)

**Examples**:
```javascript
// PlayerSystem emits event
eventBus.emit('player:dig', { x: 10, y: 20, block });

// TerrainSystem listens
eventBus.on('player:dig', ({ x, y, block }) => {
  this.handleDig(x, y, block);
});
```

**Common Events**:
- `player:dig` — Player digs a block
- `player:death` — Player dies
- `block:destroyed` — Block removed from world
- `coin:collected` — Coin picked up

---

### 3. **Factory Pattern**

**What**: Centralized entity creation via factories

**Why**:
- Ensures consistent component setup
- Avoids scattered entity construction logic
- Single source of truth for block types

**Example**:
```javascript
// ❌ BAD: Manual entity construction
const rock = new Block();
rock.add(new HealthComponent({ health: 3 }));
rock.add(new PhysicsComponent({ collidable: true }));
rock.add(new RenderComponent({ sprite: 'rock' }));
rock.add(new FallableComponent());

// ✅ GOOD: Factory
const rock = BlockFactory.createRock(x, y);
```

---

### 4. **Component-Based Behavior**

**What**: Components contain behavior, not just data

**Why**: Keeps related logic together (e.g., `FallableComponent` handles falling physics)

**Example**:
```javascript
// FallableComponent has methods
class FallableComponent extends Component {
  checkSupport(block, terrain, x, y) { /* ... */ }
  startFalling(x, y) { /* ... */ }
  updateFalling(deltaTime) { /* ... */ }
  stopFalling() { /* ... */ }
}
```

This is a **pragmatic deviation** from pure ECS (where components are data-only and systems have all logic). We chose behavior-rich components for simplicity.

---

## Game Loop Flow

```
┌─────────────────────────────────────────────────┐
│                   Game.loop()                   │
│            (60 FPS RequestAnimationFrame)       │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│         1. Update Phase (deltaTime)             │
├─────────────────────────────────────────────────┤
│  InputSystem.update()                           │
│    → Capture keyboard/touch input               │
│                                                 │
│  PlayerSystem.update()                          │
│    → Move player, handle digging                │
│    → Emit events (player:dig, player:death)     │
│                                                 │
│  GravitySystem.update()                         │
│    → Update falling blocks (FallableComponent)  │
│    → Update falling player                      │
│                                                 │
│  NPCSystem.update()                             │
│    → Update NPC components (walker, eater, etc) │
│    → Check visibility culling                   │
│                                                 │
│  TerrainSystem.update()                         │
│    → Load/unload chunks based on player pos     │
│                                                 │
│  CameraSystem.update()                          │
│    → Smooth follow player                       │
│                                                 │
│  CoinEffectSystem.update()                      │
│    → Animate coin collection effects            │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│         2. Render Phase (ctx)                   │
├─────────────────────────────────────────────────┤
│  BackgroundSystem.render()                      │
│    → Draw sky gradient                          │
│                                                 │
│  TerrainSystem.render()                         │
│    → Render visible chunks                      │
│    → Use RenderQueue for depth sorting          │
│                                                 │
│  ShadowSystem.render()                          │
│    → Draw shadows for solid blocks              │
│                                                 │
│  PlayerSystem.render()                          │
│    → Draw player sprite                         │
│                                                 │
│  NPCSystem.render()                             │
│    → Draw visible NPCs                          │
│                                                 │
│  CoinEffectSystem.render()                      │
│    → Draw coin animations                       │
│                                                 │
│  DigIndicatorSystem.render()                    │
│    → Show dig target cursor                     │
│                                                 │
│  NavigationSystem.render()                      │
│    → Draw navigation arrows                     │
│                                                 │
│  HUDSystem.render()                             │
│    → Draw score, depth, etc.                    │
│                                                 │
│  DebugSystem.render()                           │
│    → Overlays (FPS, chunk borders, etc.)        │
└─────────────────────────────────────────────────┘
```

---

## Communication Patterns

### 1. **System ↔ System** (Event Bus)

```javascript
// PlayerSystem
eventBus.emit('player:dig', { x, y, block });

// TerrainSystem
eventBus.on('player:dig', ({ x, y, block }) => {
  this.setBlock(x, y, BlockFactory.createEmpty());
});
```

### 2. **System → Entity/Component** (Direct Access)

```javascript
// GravitySystem accessing block components
const fallable = block.get(FallableComponent);
if (fallable.isFalling) {
  fallable.updateFalling(deltaTime);
}
```

### 3. **Component → System** (via `this.game`)

```javascript
// DiggableComponent finding TerrainSystem
class DiggableComponent extends Component {
  onDig(game, x, y) {
    const terrain = game.components.find(c => c.constructor.name === 'TerrainSystem');
    terrain.setBlock(x, y, BlockFactory.createEmpty());
  }
}
```

### 4. **System → System** (Direct Reference via `this.game`)

```javascript
// GravitySystem finding TerrainSystem
update(deltaTime) {
  const terrain = this.game.components.find(c => c.constructor.name === 'TerrainSystem');
  const player = this.game.components.find(c => c.constructor.name === 'PlayerSystem');
  // ...
}
```

---

## Key Systems Explained

### PlayerSystem

**Responsibility**: Player controller (movement, digging, state machine)

**State Machine**:
- `idle` — Standing on solid ground
- `falling` — Free fall (gravity applied)
- `dead` — Game over

**Key Methods**:
- `update()` — Handle input, move player, dig blocks
- `handleLanding()` — Process landing on different block types
- `die()` — Trigger death sequence

---

### TerrainSystem

**Responsibility**: Infinite procedural terrain via chunk streaming

**Key Features**:
- 32x32 block chunks
- LRU cache for chunk management
- Procedural generation via Perlin noise
- Block get/set by world coordinates

**Key Methods**:
- `getBlock(gridX, gridY)` — Get block at world position
- `setBlock(gridX, gridY, block)` — Set block at world position
- `update()` — Load/unload chunks based on player position

---

### GravitySystem

**Responsibility**: Apply gravity to all fallable entities

**How It Works**:
1. Iterate all chunks
2. Find blocks with `FallableComponent`
3. Check if they have support below
4. If no support → start falling
5. Update falling animation
6. Check for landing

**Also Handles**: Player falling (if `PlayerSystem.fallable` exists)

---

### NPCSystem

**Responsibility**: NPC lifecycle management

**How It Works**:
1. Track all NPCs in world
2. Update visible NPCs (within viewport)
3. Delegate to NPC components:
   - `PositionComponent` — Position tracking
   - `WalkerComponent` — Horizontal movement
   - `FallComponent` — Gravity
   - `EaterComponent` — Dig blocks
   - `RenderComponent` — Sprite rendering
   - `KillComponent` — Kill player on touch

**Visibility Culling**: Only updates NPCs near camera

---

### CameraSystem

**Responsibility**: Smooth camera following

**Features**:
- Lerp smoothing (configurable factor)
- Vertical offset (player above center)
- Zoom level (fixed at 3.0x)

---

### RenderQueue (Subsystem)

**Responsibility**: Depth sorting for fake 3D effect

**How It Works**:
1. Collect all blocks in visible chunks
2. Sort by Y position (higher Y = drawn later = appears in front)
3. Render in sorted order

This creates the illusion of depth without a Z-axis.

---

## Entity & Component Design

### Block Entity

**Structure**:
```javascript
class Block {
  constructor(components = []) {
    this.components = new Map();
    components.forEach(c => this.add(c));
  }

  add(component) { /* ... */ }
  get(ComponentClass) { /* ... */ }
  has(ComponentClass) { /* ... */ }
}
```

**Common Component Combinations**:

| Block Type | Components |
|-----------|------------|
| Mud | `HealthComponent`, `PhysicsComponent`, `DiggableComponent`, `RenderComponent` |
| Rock | All mud components + `FallableComponent` |
| Coin | `CollectableComponent`, `RenderComponent`, `LootEffectComponent` |
| Lava | `LethalComponent`, `PhysicsComponent`, `RenderComponent`, `DarknessComponent` |
| Empty | None (just empty `Block`) |

### NPC Entity

**Structure**: Same as `Block` (both extend `Entity` conceptually)

**Common Component Combinations**:

| NPC Type | Components |
|---------|------------|
| Maggot | `PositionComponent`, `WalkerComponent`, `EaterComponent`, `FallComponent`, `RenderComponent`, `KillComponent`, `StateComponent`, `SpawnComponent` |

---

## Rendering Pipeline

### 1. Sprite Atlas

**File**: `src/rendering/sprite-atlas.js`

**Purpose**: Load sprite sheet and provide sprite lookup

**Usage**:
```javascript
const spriteAtlas = new SpriteAtlas();
await spriteAtlas.load('assets/sprites.png');
const sprite = spriteAtlas.getSprite('mud');
```

### 2. Render Layers

**File**: `src/rendering/render-layer.js`

**Purpose**: Z-order enumeration

**Layers** (back to front):
1. `BACKGROUND` — Sky
2. `TERRAIN_BACK` — Background blocks
3. `TERRAIN_MID` — Mid-layer blocks
4. `TERRAIN_FRONT` — Foreground blocks
5. `ENTITIES` — Player, NPCs
6. `EFFECTS` — Coins, particles
7. `UI` — HUD, debug overlays

### 3. Render Queue

**File**: `src/rendering/render-queue.js`

**Purpose**: Sort blocks by Y for depth illusion

**Algorithm**:
```javascript
// Collect blocks
blocks.forEach(block => {
  const render = block.get(RenderComponent);
  if (render) queue.push({ block, y: render.y, layer: render.layer });
});

// Sort (higher Y = drawn later = appears closer)
queue.sort((a, b) => a.y - b.y);

// Render
queue.forEach(({ block }) => {
  const render = block.get(RenderComponent);
  render.render(ctx, spriteAtlas);
});
```

---

## Terrain Generation

### Procedural Algorithm

**File**: `src/terrain/terrain-generator.js`

**Steps**:
1. **Surface Height** — Perlin noise determines ground level
2. **Strata Layers** — Different materials at different depths (mud, rock, lava)
3. **Ore Distribution** — Random coins/gems
4. **Chunk Assembly** — Generate 32x32 block grid

**Key Parameters**:
```javascript
SURFACE_HEIGHT = 100;       // Ground level
MUD_DEPTH = 20;             // Mud layer thickness
ROCK_START = 120;           // Rock layer start
LAVA_START = 200;           // Lava layer start
COIN_RARITY = 0.02;         // 2% coin spawn chance
```

### Chunk Streaming

**File**: `src/terrain/chunk-cache.js`

**How It Works**:
1. Player moves
2. `TerrainSystem` checks nearby chunks
3. Load missing chunks (generate or fetch from cache)
4. Unload distant chunks (LRU eviction)
5. Cache limit: 50 chunks (~51,200 blocks in memory)

---

## Code Examples

### Creating a New Block Type

```javascript
// 1. Define factory method (src/factories/block.factory.js)
static createGem(x, y) {
  return new Block([
    new PhysicsComponent({ collidable: false }),
    new RenderComponent({ sprite: 'gem', x, y }),
    new CollectableComponent({ points: 100 }),
    new LootEffectComponent({ floatSpeed: 30, glowIntensity: 1.5 }),
  ]);
}

// 2. Add sprite to sprite sheet (assets/sprites.png)

// 3. Use in terrain generator (src/terrain/terrain-generator.js)
if (Math.random() < 0.001) {
  return BlockFactory.createGem(x, y);
}
```

### Creating a New Component

```javascript
// 1. Create component file (src/components/block/glow.component.js)
import { Component } from '../../core/component.js';

export class GlowComponent extends Component {
  constructor({ intensity = 1.0, color = '#ffff00' } = {}) {
    super();
    this.intensity = intensity;
    this.color = color;
  }

  render(ctx, x, y) {
    ctx.shadowBlur = this.intensity * 20;
    ctx.shadowColor = this.color;
  }
}

// 2. Add to block via factory
import { GlowComponent } from '../components/block/glow.component.js';

static createGlowingRock(x, y) {
  return new Block([
    new HealthComponent({ health: 3 }),
    new PhysicsComponent({ collidable: true }),
    new RenderComponent({ sprite: 'rock', x, y }),
    new GlowComponent({ intensity: 2.0, color: '#00ffff' }),
  ]);
}
```

### Creating a New System

```javascript
// 1. Create system file (src/systems/particle.system.js)
import { System } from '../core/system.js';

export class ParticleSystem extends System {
  constructor(game) {
    super(game);
    this.particles = [];
  }

  init() {
    // Setup
  }

  update(deltaTime) {
    this.particles.forEach(p => {
      p.y -= p.velocity * deltaTime;
      p.life -= deltaTime;
    });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  render(ctx) {
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 2, 2);
    });
  }

  spawn(x, y, color) {
    this.particles.push({ x, y, color, velocity: 50, life: 1000 });
  }
}

// 2. Register in main.js
import { ParticleSystem } from './systems/particle.system.js';

game.addComponent(new ParticleSystem(game));
```

### Emitting/Listening to Events

```javascript
// Emit (from PlayerSystem)
import { eventBus } from '../utils/event-bus.js';

eventBus.emit('player:collect', { type: 'coin', points: 10 });

// Listen (in HUDSystem)
eventBus.on('player:collect', ({ points }) => {
  this.score += points;
});
```

---

## Summary

### Key Takeaways

1. **Hybrid ECS**: Pure ECS for entities, game systems for managers
2. **Two Base Classes**: `System` (game loop) vs `Component` (ECS)
3. **Event-Driven**: Systems communicate via event bus
4. **Factory Pattern**: Centralized entity creation
5. **Component Behaviors**: Components have methods, not just data
6. **Pragmatic Design**: YAGNI/DRY/KISS over architectural purity

### When to Use What

| Pattern | Use Case |
|---------|----------|
| **System** | Singletons (player, camera, input, terrain) |
| **Component** | Reusable entity behaviors (health, physics, falling) |
| **Entity** | Game objects with components (blocks, NPCs) |
| **Factory** | Creating entities with predefined component sets |
| **Event Bus** | Decoupled cross-system communication |

---

## Further Reading

- [ECS Cleanup Documentation](./ECS_CLEANUP.md)
- [Token Usage Tracking](./TOKEN_ESTIMATES.md)
- [Development Plan](./archive/DEVELOPMENT_PLAN.md)
- [Game Specification](./GAME_SPEC.md)
- [Dev Tools Guide](./DEV_TOOLS.md)

---

**Last Updated**: 2025-10-09
**Architecture Version**: Clean ECS v1.0 (post-refactor)
