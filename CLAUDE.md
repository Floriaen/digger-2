# Claude Development Guide

Project instructions for AI-assisted development of Digger 2.

---

## Architecture Overview

**Hybrid ECS** (Entity-Component-System) architecture combining pure ECS for entities with game loop systems for managers.

### Core Principles

1. **ECS Pattern**: Pure ECS for game entities (blocks, NPCs)
2. **YAGNI / DRY / KISS**: Build only what's needed, avoid repetition, keep it simple
3. **Two Base Classes**:
   - **System** (`src/core/system.js`): Game loop managers (player, camera, terrain, gravity, etc.)
   - **Component** (`src/core/component.js`): ECS components (data + behavior for entities)
4. **Factory Pattern**: BlockFactory is the ONLY way to create block entities
5. **Event-driven**: Event bus for decoupled system communication
6. **No Fallbacks**: Errors surface immediately during development

### Directory Structure

```
/src
  /core             → Engine primitives (Game, System, Component, Entity)
  /systems          → Game loop systems (player, terrain, camera, gravity, NPC, etc.)
  /components       → ECS components
    /block          → Block entity components (health, physics, diggable, etc.)
    /npc            → NPC entity components (position, walker, eater, etc.)
  /entities         → Entity classes (Block, NPC)
  /factories        → Entity factories (BlockFactory)
  /terrain          → Procedural generation, chunk management
  /rendering        → Sprite atlas, tile rendering, render queue
  /utils            → Event bus, math helpers, config
```

---

## Known Architectural Inconsistency ⚠️

**Two patterns exist for component logic**:

### Pattern 1: System-Driven (Block components) ❌ NOT DESIRED

- **Example**: `FallableComponent` — Logic split between component and `GravitySystem`
- System iterates entities, calls component methods
- **Problem**: Tight coupling, harder to reuse

### Pattern 2: Component-Owned (NPC components) ✅ DESIRED

- **Example**: `WalkerComponent` — Component owns ALL logic
- System just calls `component.update(entity, deltaTime)`
- **Benefit**: Self-contained, reusable, loosely coupled

**Migration needed**: Block components should adopt Pattern 2 for architectural consistency.

See [ARCHITECTURE.md](Docs/ARCHITECTURE.md) Section 5 for detailed analysis and migration plan.

---

## Naming Conventions

- **Files**: `kebab-case.js`
- **Classes**: `PascalCase`
- **Functions/variables**: `camelCase`
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Private members**: `_prefixedUnderscore`

---

## Development Guidelines

### Before Implementing Features

When proposing new features:

1. **Describe**: What the feature does and why it's needed
2. **Design**: How it fits into the architecture
3. **Impact**: Files affected, dependencies, risk level

### Code Quality Standards

- Follow existing patterns (see [ARCHITECTURE.md](Docs/ARCHITECTURE.md))
- Use ESLint (`npm run lint` must pass)
- **Run tests** (`npm test` must pass) - **CRITICAL: Always run before committing!**
- Prefer component-owned logic (Pattern 2)
- Use factories for entity creation
- Event bus for cross-system communication

### Testing Requirements ⚠️

**IMPORTANT**: This project has comprehensive test coverage (208+ tests). You MUST:

1. **Run `npm test` before any commit** - All tests must pass
2. **Ask before updating tests** when changing player behavior, shadow rendering, or game mechanics
3. **Add tests** for new features (follow existing patterns in `src/test/`)
4. **Check test output** - 208 passing, 5 skipped is expected

Test suites:
- `src/test/unit/player-system.test.js` - 100 tests for PlayerSystem
- `src/test/unit/shadow-system.test.js` - 22 tests for shadow rendering
- `src/test/integration/player-system-integration.test.js` - 35 integration tests
- `src/test/e2e/player-behavior.test.js` - 36 end-to-end behavior tests

**If tests fail**: Investigate why before proceeding. Tests document expected behavior.

---

## Related Documentation

- **[ARCHITECTURE.md](Docs/ARCHITECTURE.md)** — Complete architecture guide (READ THIS FIRST)
- **[GAME_SPEC.md](Docs/GAME_SPEC.md)** — Game design document
- **[DEV_TOOLS.md](Docs/DEV_TOOLS.md)** — Debugging and testing tools
- **[TOKEN_ESTIMATES.md](Docs/TOKEN_ESTIMATES.md)** — Historical token usage data
- **[ECS_CLEANUP.md](Docs/ECS_CLEANUP.md)** — ECS refactor documentation

---

## Quick Reference

### Creating a New Block Type

```javascript
// In src/factories/block.factory.js
static createMyBlock(x, y) {
  return new Block([
    new HealthComponent({ health: 3 }),
    new PhysicsComponent({ collidable: true }),
    new RenderComponent({ sprite: 'myblock', x, y }),
  ]);
}
```

### Creating a New Component

```javascript
// In src/components/block/my.component.js
import { Component } from '../../core/component.js';

export class MyComponent extends Component {
  constructor({ value = 0 } = {}) {
    super();
    this.value = value;
  }

  update(entity, deltaTime) {
    // Component owns its logic (Pattern 2)
    this.value += deltaTime;
  }
}
```

### Creating a New System

```javascript
// In src/systems/my.system.js
import { System } from '../core/system.js';

export class MySystem extends System {
  init() {
    // Setup
  }

  update(deltaTime) {
    // Game loop logic
  }

  render(ctx) {
    // Rendering
  }
}
```

### Using Event Bus

```javascript
// Emit event
import { eventBus } from '../utils/event-bus.js';
eventBus.emit('event:name', { data: 'value' });

// Listen to event
eventBus.on('event:name', ({ data }) => {
  console.log(data);
});
```

---

**For complete architecture details, see [ARCHITECTURE.md](Docs/ARCHITECTURE.md)**
