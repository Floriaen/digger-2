# Architecture Analysis & Simplification Proposal

## Current State Assessment

### What You Have (Hybrid Architecture)

Your codebase mixes **two different architectural patterns**:

1. **Pure ECS** (Entity-Component-System) for **blocks and NPCs**
   - ✅ Entities: `Block`, `NPC` (pure containers)
   - ✅ Components: Data + behavior (in `/components/blocks/`, `/npc/components/`)
   - ✅ Systems: `GravitySystem`, `NPCSystem`, `CoinEffectSystem`, `InputSystem`

2. **Game Loop Components** for **game systems**
   - ❓ All extend `LifecycleComponent` (which is NOT an ECS component)
   - ❓ Named "Component" but behave like systems/managers
   - ❓ Live in `/components/` mixed with true systems

### The Confusion

```
/src
  /core
    component.js          → ECS Component (base for block/NPC components)
    lifecycle-component.js → Game Loop System (misnamed!)
    game.js               → Game Engine

  /components             → ❌ MIXED: Game systems + block components
    player.component.js   → Really a SYSTEM (extends LifecycleComponent)
    terrain.component.js  → Really a SYSTEM (extends LifecycleComponent)
    camera.component.js   → Really a SYSTEM (extends LifecycleComponent)
    /blocks/              → ✅ TRUE ECS components
      health.component.js
      physics.component.js

  /systems                → ✅ TRUE ECS systems
    gravity.system.js     → Extends LifecycleComponent
    npc.system.js         → Extends LifecycleComponent

  /npc
    /components/          → ✅ TRUE ECS components
      npc-position.component.js
      npc-render.component.js

  /entities               → ✅ ECS entity containers
    block.entity.js       → Pure ECS entity
    npc.entity.js         → Pure ECS entity
```

---

## Core Problems

### 1. **Naming Collision: "Component" means TWO different things**

| Current Name | Actual Role | Should Be Named |
|-------------|------------|-----------------|
| `Component` (core) | ECS component base | ✅ Keep as `Component` |
| `LifecycleComponent` (core) | Game system base | ❌ Rename to `System` |
| `PlayerComponent` | Game system | ❌ Rename to `PlayerSystem` |
| `TerrainComponent` | Game system | ❌ Rename to `TerrainSystem` |
| `CameraComponent` | Game system | ❌ Rename to `CameraSystem` |
| `HealthComponent` (blocks) | ECS component | ✅ Correctly named |

### 2. **Directory Structure Confusion**

```
/components/
  player.component.js       ← System (game loop)
  terrain.component.js      ← System (game loop)
  camera.component.js       ← System (game loop)
  /blocks/
    health.component.js     ← Component (ECS)
    physics.component.js    ← Component (ECS)
```

**Problem**: `/components/` mixes systems and components.

### 3. **"Core" is vague**

What is "core"?
- Game engine primitives? → `engine/`
- Base classes? → `base/`
- Framework? → Keep as `core/` but clarify purpose

---

## Proposed Architecture (Clean ECS)

### 1. **Rename Base Classes**

```javascript
// src/core/component.js (ECS component - NO CHANGE)
export class Component {
  constructor(data = {}) {
    Object.assign(this, data);
  }
}

// src/core/system.js (RENAMED from lifecycle-component.js)
export class System {
  constructor(game) {
    this.game = game;
  }
  init() {}
  update(deltaTime) {}
  render(ctx) {}
  destroy() {}
}

// src/core/entity.js (NEW - unified base)
export class Entity {
  constructor(components = []) {
    this.components = new Map();
    components.forEach((c) => this.add(c));
  }
  add(component) {
    this.components.set(component.constructor.name, component);
  }
  get(ComponentClass) {
    return this.components.get(ComponentClass.name);
  }
  has(ComponentClass) {
    return this.components.has(ComponentClass.name);
  }
}
```

### 2. **Unified Directory Structure**

```
/src
  /core                    → Engine primitives (game loop, base classes)
    game.js                → Game engine (loop, lifecycle orchestration)
    system.js              → Base class for all game systems
    component.js           → Base class for all ECS components
    entity.js              → Base class for all ECS entities

  /systems                 → Game loop systems (update/render logic)
    player.system.js       → Player movement, digging, input
    terrain.system.js      → Chunk management, procedural generation
    camera.system.js       → Camera tracking, viewport
    gravity.system.js      → Falling physics for all entities
    npc.system.js          → NPC lifecycle management
    input.system.js        → Input capture and event dispatch
    hud.system.js          → UI rendering
    background.system.js   → Background rendering
    debug.system.js        → Debug overlays
    coin-effect.system.js  → Coin animations
    navigation.system.js   → Navigation indicators
    dig-indicator.system.js→ Dig target rendering
    shadow.system.js       → Shadow rendering
    touch-input.system.js  → Mobile touch handling

  /components              → ECS components (data + behavior for entities)
    /block                 → Block entity components
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
    /npc                   → NPC entity components
      position.component.js
      render.component.js
      state.component.js
      fall.component.js
      walker.component.js
      eater.component.js
      kill.component.js
      spawn.component.js

  /entities                → Entity classes (containers for components)
    block.entity.js        → Block entity
    npc.entity.js          → NPC entity

  /factories               → Entity creation
    block.factory.js       → Block entity assembly
    npc.factory.js         → NPC entity assembly (NEW if needed)

  /terrain                 → Terrain generation subsystem
    terrain-generator.js
    chunk-cache.js
    terrain-chunk.js

  /rendering               → Rendering subsystem
    sprite-atlas.js
    render-queue.js
    render-layer.js

  /utils                   → Utilities
    event-bus.js
    config.js
    math.js
    noise.js
    performance-monitor.js
```

### 3. **Clear Terminology**

| Term | Definition | Location | Base Class |
|------|-----------|----------|------------|
| **System** | Game loop managers (update/render) | `/systems/` | `System` |
| **Component** | ECS data + behavior for entities | `/components/` | `Component` |
| **Entity** | Container for components | `/entities/` | `Entity` |
| **Factory** | Assembles entities from components | `/factories/` | None |

---

## Migration Plan

### Phase 1: Rename Base Class (Low Risk)
1. Rename `lifecycle-component.js` → `system.js`
2. Rename `LifecycleComponent` class → `System`
3. Update all imports (25 files estimated)

### Phase 2: Rename Game Systems (Medium Risk)
1. Move + rename files:
   - `components/player.component.js` → `systems/player.system.js`
   - `components/terrain.component.js` → `systems/terrain.system.js`
   - `components/camera.component.js` → `systems/camera.system.js`
   - `components/hud.component.js` → `systems/hud.system.js`
   - `components/background.component.js` → `systems/background.system.js`
   - `components/debug.component.js` → `systems/debug.system.js`
   - `components/shadow.component.js` → `systems/shadow.system.js`
   - `components/navigation.component.js` → `systems/navigation.system.js`
   - `components/dig-indicator.component.js` → `systems/dig-indicator.system.js`
   - `components/touch-input.component.js` → `systems/touch-input.system.js`
   - `components/grid-overlay.component.js` → `systems/grid-overlay.system.js`

2. Rename classes:
   - `PlayerComponent` → `PlayerSystem`
   - `TerrainComponent` → `TerrainSystem`
   - etc.

3. Update all references (main.js, cross-system lookups)

### Phase 3: Reorganize Components (Low Risk)
1. Move block components:
   - `components/blocks/` → `components/block/`

2. Move NPC components:
   - `npc/components/npc-*.component.js` → `components/npc/*.component.js`
   - Remove `npc-` prefix: `npc-position.component.js` → `position.component.js`

3. Delete empty directories

### Phase 4: Unify Entity Base (Optional)
- Move `Block` and `NPC` to both extend unified `Entity` base class
- They're already identical except method signatures

---

## Benefits of This Refactor

### 1. **Conceptual Clarity**
- **System** = game loop manager (one instance)
- **Component** = entity behavior (many instances)
- **Entity** = component container
- No more "LifecycleComponent" confusion

### 2. **Directory Mirrors Concepts**
```
/systems/     → All game systems
/components/  → All ECS components
/entities/    → All entity containers
```

### 3. **Easier Onboarding**
- New developers immediately understand the architecture
- Naming matches ECS literature

### 4. **Future-Proof**
- Adding new systems? → Drop into `/systems/`
- Adding new components? → Drop into `/components/block/` or `/components/npc/`
- Clear separation of concerns

---

## Open Questions

### 1. What is `/core/` for?

**Option A: Engine Primitives (Recommended)**
- `game.js` - Game loop orchestrator
- `system.js` - Base class for systems
- `component.js` - Base class for components
- `entity.js` - Base class for entities

**Option B: Rename to `/engine/`**
- More explicit about purpose
- Signals "don't touch unless you know what you're doing"

**Option C: Split into `/base/` and `/engine/`**
- `/base/` - Base classes (System, Component, Entity)
- `/engine/` - Game loop (Game class)

### 2. Should `PlayerSystem` manage player as an entity?

**Current**: `PlayerSystem` has direct properties (x, y, state, etc.)

**ECS-pure approach**: Player should be an `Entity` with components:
- `PositionComponent`
- `StateComponent`
- `InputComponent`
- `RenderComponent`

**Question**: Is this over-engineering for a single player, or would it unify the architecture?

### 3. Should systems live in `/systems/` or domain folders?

**Option A: All systems in `/systems/`** (Current + proposed)
- Single location for all game loop logic
- Easy to find

**Option B: Domain-based** (e.g., `/terrain/terrain.system.js`)
- Groups related code (terrain generator + terrain system)
- Risk of scattered architecture

---

## Recommendation

**I recommend a 2-phase approach:**

### Phase 1: Quick Win (Minimal Risk)
1. Rename `LifecycleComponent` → `System`
2. Update imports

**Impact**: Eliminates naming confusion immediately
**Risk**: Low (automated refactor)
**Time**: 1 hour

### Phase 2: Full Restructure (If you want architectural purity)
1. Move all game systems to `/systems/`
2. Reorganize components under `/components/block/` and `/components/npc/`
3. Update documentation

**Impact**: Architecture matches ECS patterns perfectly
**Risk**: Medium (many file moves, import updates)
**Time**: 3-4 hours

---

## Next Steps

Let me know:
1. **Do you want to proceed with Phase 1 (rename `LifecycleComponent` → `System`)?**
2. **Do you want the full Phase 2 restructure?**
3. **What should `/core/` represent? (Engine primitives, base classes, or split?)**
4. **Should player become a true Entity with components?**

I can execute any combination of these changes systematically with minimal breakage.
