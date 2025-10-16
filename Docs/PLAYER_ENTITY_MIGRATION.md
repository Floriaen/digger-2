# Player Entity Migration Plan

**Created**: 2025-10-16
**Branch**: `feature/player-entity-migration`
**Status**: Planning Complete, Ready for Implementation

---

## Executive Summary

This document outlines the migration of `PlayerSystem` from a monolithic System class to a proper ECS entity following the same pattern used by NPCs. This architectural change will improve consistency, testability, and maintainability while preserving all existing functionality and test coverage (219+ tests).

---

## Problem Statement

### Current Architecture Issues

**PlayerSystem** ([src/systems/player.system.js](src/systems/player.system.js)) - 903 lines:
- ❌ **Architectural inconsistency**: Player is a System (singleton manager) but behaves like an entity
- ❌ **Monolithic design**: All logic in one class (position, state, digging, movement, timer, input, rendering)
- ❌ **Tight coupling**: ShadowSystem, CameraSystem, GravitySystem all search for "PlayerSystem" by name
- ❌ **Not reusable**: Cannot have multiple players or player-like entities
- ❌ **Hard to test**: Monolithic class vs testable components
- ❌ **Violates DRY**: NPCs use proper ECS, player doesn't

### Why This Matters

1. **NPCs follow Pattern 2** (Component-Owned Logic):
   - `NPC` entity + `PositionComponent`, `WalkerComponent`, `StateComponent`, `RenderComponent`
   - Each component owns its `update(entity, deltaTime, context)` logic
   - `NPCSystem` just orchestrates entity lifecycle

2. **Player follows anti-pattern**:
   - `PlayerSystem` extends `System` (should be entity manager)
   - All logic inside System (should be distributed to components)
   - Direct property access (x, y, gridX, gridY, state, etc.)

3. **Documented architectural debt**:
   - [CLAUDE.md](CLAUDE.md) Section "Known Architectural Inconsistency" acknowledges this problem
   - [ARCHITECTURE.md](ARCHITECTURE.md) describes Pattern 2 as the desired approach

---

## Target Architecture

### New Structure

```
PlayerManagerSystem (extends System)
  └─── player: Player (entity - src/entities/player.entity.js)
       ├─── PositionComponent      (gridX, gridY, x, y, spawn points)
       ├─── StateComponent         (state machine, direction, dead, hasStarted, transitioning)
       ├─── TimerComponent         (timerMs, countdown, broadcast, add/reset logic)
       ├─── DiggingComponent       (digTimer, currentDigTarget, dig execution)
       ├─── MovementComponent      (movement interpolation, lerp, _beginMovement)
       ├─── InputComponent         (keyboard event subscriptions, direction requests)
       └─── RenderComponent        (Pac-Man rendering with mouth animation)
```

### Benefits

✅ **Architectural consistency**: Player uses same ECS pattern as NPCs and Blocks
✅ **Component reusability**: TimerComponent could be used by other entities
✅ **Better testability**: Test components in isolation + integration tests
✅ **Separation of concerns**: Each component has single responsibility
✅ **Loosely coupled**: Systems interact via entity interface, not PlayerSystem lookups
✅ **Maintainability**: 903 lines distributed into focused, maintainable components
✅ **Extensibility**: Easy to add new components (e.g., InventoryComponent, HealthComponent)

---

## Migration Strategy

### Approach: Parallel Implementation with Feature Flag

To preserve the comprehensive test suite (219 tests) and ensure zero regression, we'll:

1. Create new Player entity + components alongside existing PlayerSystem
2. Create PlayerManagerSystem that wraps the Player entity
3. Update dependent systems to use PlayerManagerSystem
4. Update tests to work with new architecture
5. Remove old PlayerSystem once all tests pass

**No feature flag needed** - we'll do a clean cut-over after testing.

---

## Implementation Phases

### Phase 1: Create Player Entity Foundation

**File**: `src/entities/player.entity.js`

```javascript
/**
 * Player Entity
 * Container for player components using ECS pattern (same as NPC/Block)
 */
export class Player {
  constructor(components = []) {
    this.components = new Map();
    components.forEach((component) => {
      this.add(component);
    });
  }

  add(component) {
    this.components.set(component.constructor.name, component);
    if (typeof component.attachOwner === 'function') {
      component.attachOwner(this);
    }
  }

  get(ComponentClass) {
    return this.components.get(ComponentClass.name) || null;
  }

  has(ComponentClass) {
    return this.components.has(ComponentClass.name);
  }

  init(context) {
    this.components.forEach((component) => {
      if (typeof component.init === 'function') {
        component.init(this, context);
      }
    });
  }

  update(deltaTime, context) {
    this.components.forEach((component) => {
      if (typeof component.update === 'function') {
        component.update(this, deltaTime, context);
      }
    });
  }

  render(ctx, context) {
    this.components.forEach((component) => {
      if (typeof component.render === 'function') {
        component.render(this, ctx, context);
      }
    });
  }

  destroy(context) {
    this.components.forEach((component) => {
      if (typeof component.destroy === 'function') {
        component.destroy(this, context);
      }
    });
  }
}
```

---

### Phase 2: Create Player Components

All components follow **Pattern 2: Component-Owned Logic** (like NPC components).

#### 2.1 PositionComponent

**File**: `src/components/player/position.component.js`

**Responsibilities**:
- Grid position (gridX, gridY)
- World position (x, y) in pixels
- Spawn points (spawnGridX, spawnGridY, spawnX, spawnY)
- Position sync helpers

**Migrated from PlayerSystem lines**: 48-70, 621-625

**Key methods**:
- `init(entity, context)` - Set initial position centered in world
- `resetToSpawn()` - Restore to spawn position
- `setPosition(gridX, gridY)` - Update grid + world position
- `translate(dx, dy)` - Move by pixel delta

---

#### 2.2 StateComponent

**File**: `src/components/player/state.component.js`

**Responsibilities**:
- State machine (IDLE, DIGGING, FALLING, MOVING, DIGGING_LATERAL)
- Direction tracking (digDirection, requestedDirection)
- Flags (dead, hasStarted, transitioning)
- Level transition state (timerBeforeTransition)

**Migrated from PlayerSystem lines**: 30-36, 77-99, 626-632, 851-887

**Key methods**:
- `init(entity, context)` - Initialize state to IDLE
- `setState(newState)` - Change state
- `requestDirection(dx, dy)` - Queue direction change
- `beginTransition()` - Start level transition
- `completeTransition()` - Finish level transition

---

#### 2.3 TimerComponent

**File**: `src/components/player/timer.component.js`

**Responsibilities**:
- Timer countdown (timerMs)
- Timer broadcast (emit 'timer:update' events)
- Add/reset timer
- Death on timer expiration

**Migrated from PlayerSystem lines**: 46, 84-86, 701-727

**Key methods**:
- `init(entity, context)` - Set initial 60 seconds
- `update(entity, deltaTime, context)` - Tick countdown, broadcast, trigger death at 0
- `reset()` - Reset to initial 60 seconds
- `addSeconds(seconds)` - Add time (from loot)
- `preserve(timerMs)` - Preserve timer (level transition)

---

#### 2.4 DiggingComponent

**File**: `src/components/player/digging.component.js`

**Responsibilities**:
- Dig timer (digTimer)
- Current dig target (currentDigTarget: {x, y, hp, maxHp})
- Dig execution logic (damage blocks, handle destruction)
- Direction validation (can dig in direction?)
- Directional digging (unified logic for all directions)

**Migrated from PlayerSystem lines**: 78-79, 199-200, 408-616, 729-738

**Key methods**:
- `update(entity, deltaTime, context)` - Auto-dig timer, directional digging
- `canDigDirection(terrain, dx, dy)` - Check if direction is diggable
- `digInDirection(entity, terrain, dx, dy)` - Execute dig with HP tracking
- `updateDirectionalDig(entity, terrain)` - Unified directional digging logic

---

#### 2.5 MovementComponent

**File**: `src/components/player/movement.component.js`

**Responsibilities**:
- Movement interpolation (smooth pixel movement between tiles)
- Movement state (active, duration, elapsed, start/target positions)
- Lerp calculation
- Movement chaining logic (chain into next dig after movement completes)

**Migrated from PlayerSystem lines**: 87-97, 740-817, 889-891

**Key methods**:
- `update(entity, deltaTime, context)` - Interpolate movement
- `beginMovement(targetGridX, targetGridY, durationMs)` - Start smooth movement
- `isMoving()` - Check if currently interpolating
- `lerp(start, end, t)` - Linear interpolation helper

---

#### 2.6 InputComponent

**File**: `src/components/player/input.component.js`

**Responsibilities**:
- Input event subscriptions (arrow keys, death, restart, loot, transition)
- Direction request handling
- Event cleanup on destroy

**Migrated from PlayerSystem lines**: 101-159, 354-370, 377-381

**Key methods**:
- `init(entity, context)` - Subscribe to input events
- `handleMoveLeft/Right/Up/Down()` - Process arrow key inputs
- `handleDeath()` - Process death event
- `handleRestart()` - Process restart event
- `handleLoot()` - Process loot event (add timer)
- `handleTransitionComplete()` - Process level transition
- `destroy(entity, context)` - Unsubscribe all events

---

#### 2.7 RenderComponent

**File**: `src/components/player/render.component.js`

**Responsibilities**:
- Pac-Man rendering with animated mouth
- Clipping (when block above player)
- Mouth direction based on dig direction
- 3D fake offset (-5px Y)

**Migrated from PlayerSystem lines**: 264-352

**Key methods**:
- `render(entity, ctx, context)` - Draw player with Pac-Man mouth animation
- `_shouldClip(entity, terrain)` - Check if block above requires clipping
- `_getMouthAngle(entity)` - Calculate animated mouth angle (4-frame cycle)
- `_getDirectionAngle(entity)` - Get mouth direction based on dig direction

---

### Phase 3: Create PlayerManagerSystem

**File**: `src/systems/player-manager.system.js`

**Responsibilities**:
- Manage player entity lifecycle (init, update, render, destroy)
- Provide accessor methods for backward compatibility during migration
- Expose player entity to other systems

**Pattern**: Exactly like `NPCSystem` but for a single Player entity

```javascript
export class PlayerManagerSystem extends System {
  init() {
    // Create player entity with all components
    this.player = new Player([
      new PositionComponent({ worldWidthTiles: this._getWorldWidth() }),
      new StateComponent(),
      new TimerComponent(),
      new DiggingComponent(),
      new MovementComponent(),
      new InputComponent(),
      new RenderComponent(),
    ]);

    this.player.init({ game: this.game });
  }

  update(deltaTime) {
    const terrain = this._getTerrain();
    this.player.update(deltaTime, { game: this.game, terrain });
  }

  render(ctx) {
    const terrain = this._getTerrain();
    const camera = this._getCamera();
    this.player.render(ctx, { game: this.game, terrain, camera });
  }

  destroy() {
    this.player.destroy({ game: this.game });
  }

  // Backward compatibility accessors (delegate to player.get(PositionComponent))
  get x() { return this.player.get(PositionComponent).x; }
  get y() { return this.player.get(PositionComponent).y; }
  get gridX() { return this.player.get(PositionComponent).gridX; }
  get gridY() { return this.player.get(PositionComponent).gridY; }
  get state() { return this.player.get(StateComponent).state; }
  // ... more accessors as needed during migration
}
```

---

### Phase 4: Update Dependent Systems

#### 4.1 Update ShadowSystem

**File**: `src/systems/shadow.system.js`

**Change**: Find `PlayerManagerSystem` instead of `PlayerSystem`, access `playerManager.player`

```javascript
render(ctx) {
  const playerManager = this.game.components.find((c) => c.constructor.name === 'PlayerManagerSystem');
  const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainSystem');

  if (!playerManager || !terrain) return;

  const player = playerManager.player;
  const position = player.get(PositionComponent);

  // ... rest of shadow rendering logic using position.x, position.gridX, etc.
}
```

#### 4.2 Update GravitySystem

**File**: `src/systems/gravity.system.js`

**Change**: Find `PlayerManagerSystem`, access `playerManager.player`, check `FallableComponent`

```javascript
update(deltaTime) {
  const playerManager = this.game.components.find((c) => c.constructor.name === 'PlayerManagerSystem');
  const terrain = this.game.components.find((c) => c.constructor.name === 'TerrainSystem');

  if (!playerManager || !terrain) return;

  const player = playerManager.player;
  const position = player.get(PositionComponent);
  const state = player.get(StateComponent);
  const fallable = player.get(FallableComponent); // If we add FallableComponent to player

  // ... gravity logic
}
```

#### 4.3 Update CameraSystem (if needed)

**File**: `src/systems/camera.system.js`

**Change**: Same pattern - find `PlayerManagerSystem`, access player position

#### 4.4 Update main.js

**File**: `src/main.js`

**Change**: Replace `PlayerSystem` with `PlayerManagerSystem`

```javascript
import { PlayerManagerSystem } from './systems/player-manager.system.js';

// Replace this line:
// game.addComponent(new PlayerSystem());

// With this:
game.addComponent(new PlayerManagerSystem());
```

---

### Phase 5: Update Test Suite

#### 5.1 Update Test Mocks

**File**: `src/test/helpers/mocks.js`

**Changes**:
- Rename `createMockPlayer()` to `createMockPlayerManager()`
- Mock returns `PlayerManagerSystem` with `player` entity
- Player entity has component accessors

```javascript
export function createMockPlayerManager() {
  const mockPosition = { x: 808, y: 40, gridX: 50, gridY: 2, spawnGridX: 50, spawnGridY: 2 };
  const mockState = { state: 'idle', dead: false, hasStarted: true, digDirection: { dx: 0, dy: 1 } };

  const mockPlayer = {
    get: vi.fn((ComponentClass) => {
      if (ComponentClass.name === 'PositionComponent') return mockPosition;
      if (ComponentClass.name === 'StateComponent') return mockState;
      // ... more components
      return null;
    }),
    has: vi.fn((ComponentClass) => true),
    update: vi.fn(),
    render: vi.fn(),
  };

  return {
    constructor: { name: 'PlayerManagerSystem' },
    player: mockPlayer,
    // Backward compatibility accessors
    get x() { return mockPosition.x; },
    get gridX() { return mockPosition.gridX; },
    // ... etc
  };
}
```

#### 5.2 Update Test Files

**Files to update**:
- `src/test/unit/player-system.test.js` → Rename to `player-manager-system.test.js`
- `src/test/integration/player-system-integration.test.js` → Update imports
- `src/test/e2e/player-behavior.test.js` → Update imports
- `src/test/unit/shadow-system.test.js` → Update to use PlayerManagerSystem
- `src/test/unit/player-upward-empty.test.js` → Update imports

**Key changes**:
- Replace `PlayerSystem` with `PlayerManagerSystem`
- Access player properties via `playerManager.player.get(PositionComponent).x`
- Keep all test assertions identical (behavior should not change)

#### 5.3 Add Component Unit Tests (New)

Create new test files for isolated component testing:

- `src/test/unit/components/player-position.test.js` - Test PositionComponent
- `src/test/unit/components/player-state.test.js` - Test StateComponent
- `src/test/unit/components/player-timer.test.js` - Test TimerComponent
- `src/test/unit/components/player-digging.test.js` - Test DiggingComponent
- `src/test/unit/components/player-movement.test.js` - Test MovementComponent
- `src/test/unit/components/player-input.test.js` - Test InputComponent event handling
- `src/test/unit/components/player-render.test.js` - Test RenderComponent

These tests will improve coverage by testing components in isolation.

---

### Phase 6: Optional Enhancement - Shadow as Component

**Goal**: Remove `ShadowSystem` entirely, move shadow rendering into player entity

**File**: `src/components/player/shadow.component.js`

**Responsibilities**:
- Find first solid block below player
- Render shadow ellipse on ground
- Same logic as current ShadowSystem

**Benefits**:
- Shadow is part of player (architectural consistency)
- One less System in the game loop
- Shadow always renders with player (no lookup needed)

**Changes**:
- Add `ShadowComponent` to Player entity components
- Remove `ShadowSystem` from main.js
- Update shadow tests to test component instead of system

---

## Detailed File Manifest

### Files to Create (9 new files)

| File | Lines | Purpose |
|------|-------|---------|
| `src/entities/player.entity.js` | ~60 | Player entity container (ECS) |
| `src/components/player/position.component.js` | ~80 | Position data + spawn points |
| `src/components/player/state.component.js` | ~100 | State machine + direction tracking |
| `src/components/player/timer.component.js` | ~80 | Timer countdown + broadcast |
| `src/components/player/digging.component.js` | ~350 | Dig logic + directional digging |
| `src/components/player/movement.component.js` | ~150 | Movement interpolation + chaining |
| `src/components/player/input.component.js` | ~120 | Input event subscriptions |
| `src/components/player/render.component.js` | ~120 | Pac-Man rendering |
| `src/systems/player-manager.system.js` | ~100 | Player entity manager |
| **Total** | **~1160 lines** | (vs 903 in PlayerSystem - added structure/clarity) |

### Files to Modify (13 files)

| File | Changes |
|------|---------|
| `src/systems/shadow.system.js` | Update to find PlayerManagerSystem |
| `src/systems/gravity.system.js` | Update to find PlayerManagerSystem |
| `src/systems/camera.system.js` | Update to find PlayerManagerSystem (if needed) |
| `src/main.js` | Replace PlayerSystem with PlayerManagerSystem |
| `src/test/helpers/mocks.js` | Add createMockPlayerManager() |
| `src/test/unit/player-system.test.js` | Update to test PlayerManagerSystem |
| `src/test/unit/shadow-system.test.js` | Update mocks for PlayerManagerSystem |
| `src/test/unit/player-upward-empty.test.js` | Update imports |
| `src/test/integration/player-system-integration.test.js` | Update imports + mocks |
| `src/test/e2e/player-behavior.test.js` | Update imports + mocks |
| `CLAUDE.md` | Remove "Known Architectural Inconsistency" section |
| `ARCHITECTURE.md` | Update to reflect player now uses Pattern 2 |
| `README.md` | Update architecture section (if applicable) |

### Files to Delete (1 file)

| File | Lines | Reason |
|------|-------|--------|
| `src/systems/player.system.js` | 903 | Replaced by PlayerManagerSystem + components |

---

## Risk Assessment

### Low Risk Factors ✅

1. **Proven pattern**: Following established NPC architecture
2. **Comprehensive tests**: 219 tests will catch behavioral regressions
3. **Parallel implementation**: New code doesn't affect old code during development
4. **Clean rollback**: Can revert by switching back to PlayerSystem in main.js
5. **No API changes**: External systems use same interface via accessors

### Potential Challenges ⚠️

1. **Test update complexity**: 116 player tests + 35 integration + 36 e2e = ~187 tests to update
   - Mitigation: Update mocks first, then bulk find-replace imports
2. **Component interaction**: Logic split across components needs careful coordination
   - Mitigation: Components already coordinate via entity (proven in NPC pattern)
3. **Fallable component**: Player uses FallableComponent from block components
   - Mitigation: Keep FallableComponent attachment in PlayerManagerSystem for now

### Success Criteria ✅

- ✅ All 219 tests pass with new architecture
- ✅ `npm run lint` passes with no errors
- ✅ Game behavior identical to before migration (manual testing)
- ✅ Player movement, digging, falling, timer, death all work correctly
- ✅ Shadow renders correctly
- ✅ Level transitions work
- ✅ Input handling unchanged

---

## Testing Strategy

### Phase 1: Component Unit Tests
Test each component in isolation with mocked entity/context

```javascript
// Example: TimerComponent test
describe('TimerComponent', () => {
  it('should tick down timer and emit events', () => {
    const timer = new TimerComponent();
    const mockEntity = createMockEntity();
    const mockContext = { game: createMockGame() };

    timer.init(mockEntity, mockContext);
    expect(timer.timerMs).toBe(60000); // 60 seconds

    timer.update(mockEntity, 1000, mockContext); // 1 second elapsed
    expect(timer.timerMs).toBe(59000);
    // ... assert event emission
  });
});
```

### Phase 2: Integration Tests
Test PlayerManagerSystem with real components, mocked game/terrain

```javascript
describe('PlayerManagerSystem Integration', () => {
  it('should dig down when arrow down pressed', () => {
    const playerManager = new PlayerManagerSystem();
    const mockGame = createMockGame();
    playerManager.game = mockGame;
    playerManager.init();

    eventBus.emit('input:move-down');
    playerManager.update(100);

    const position = playerManager.player.get(PositionComponent);
    // ... assertions
  });
});
```

### Phase 3: E2E Tests
Test complete gameplay scenarios with PlayerManagerSystem + other systems

```javascript
describe('Player Behavior E2E', () => {
  it('should fall when digging into empty space', () => {
    // Full game setup with PlayerManagerSystem, TerrainSystem, GravitySystem
    // ... simulate digging, assert falling state
  });
});
```

### Phase 4: Manual Testing
- Start game, verify player spawns correctly
- Test all movement directions (up, down, left, right)
- Test digging, falling, timer countdown
- Test death scenarios (timer, lava, crush)
- Test level transitions (door)
- Test respawn
- Verify shadow renders below player

---

## Timeline Estimate

| Phase | Estimated Time | Tasks |
|-------|----------------|-------|
| **Phase 1**: Entity Foundation | 30 min | Create Player entity class |
| **Phase 2**: Components | 4 hours | Create 7 player components |
| **Phase 3**: PlayerManagerSystem | 1 hour | Create manager system + accessors |
| **Phase 4**: Update Systems | 1 hour | Update Shadow, Gravity, Camera, main.js |
| **Phase 5**: Update Tests | 2 hours | Update mocks + 187 tests |
| **Phase 6**: Validation | 1 hour | Run tests, manual testing, fixes |
| **Phase 7**: Documentation | 30 min | Update CLAUDE.md, ARCHITECTURE.md |
| **Total** | **~10 hours** | Full migration with testing |

---

## Rollback Plan

If issues arise during migration:

1. **Immediate rollback**: Revert commit, switch back to PlayerSystem in main.js
2. **Partial rollback**: Keep components, restore PlayerSystem temporarily, migrate gradually
3. **Forward fix**: Fix issues in new architecture (preferred if close to completion)

**Rollback command**:
```bash
git checkout main src/systems/player.system.js src/main.js
git checkout main src/test/ # Restore all tests
npm test # Verify rollback works
```

---

## Post-Migration Cleanup

After successful migration:

1. **Remove PlayerSystem**: Delete `src/systems/player.system.js`
2. **Remove backward compatibility accessors**: Clean up PlayerManagerSystem once all systems updated
3. **Update documentation**:
   - Remove "Known Architectural Inconsistency" from CLAUDE.md
   - Update ARCHITECTURE.md with player as example of Pattern 2
4. **Optional**: Migrate Shadow to component (Phase 6)
5. **Git cleanup**: Squash commits if needed for clean history

---

## Success Metrics

### Code Quality
- ✅ Reduced coupling (no more `game.components.find('PlayerSystem')` anti-pattern)
- ✅ Single Responsibility Principle (each component has one job)
- ✅ Open/Closed Principle (easy to add new components without modifying existing)
- ✅ Consistency (player matches NPC/Block patterns)

### Test Coverage
- ✅ 219+ tests passing (preserve all existing tests)
- ✅ +7 new component unit test files (~50+ new tests)
- ✅ Better isolation (can test components without full game setup)

### Maintainability
- ✅ 903 lines → ~1160 lines across 9 focused files (better than one 903-line monolith)
- ✅ Each component <350 lines (DiggingComponent is largest)
- ✅ Clear separation of concerns
- ✅ Easy to debug (component-level logging/breakpoints)

### Performance
- ⚠️ Slight overhead from component iteration (negligible - same as NPCs)
- ✅ No functional performance changes (same game loop logic)

---

## References

### Related Documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) - Section 5: Architectural Patterns
- [CLAUDE.md](CLAUDE.md) - Known Architectural Inconsistency (to be removed)
- [ECS_CLEANUP.md](ECS_CLEANUP.md) - Previous ECS refactoring work
- [GAME_SPEC.md](GAME_SPEC.md) - Player behavior specification

### Code References
- **Current Implementation**: [src/systems/player.system.js](src/systems/player.system.js)
- **NPC Pattern (reference)**: [src/systems/npc.system.js](src/systems/npc.system.js), [src/entities/npc.entity.js](src/entities/npc.entity.js)
- **Block Pattern (reference)**: [src/entities/block.entity.js](src/entities/block.entity.js)
- **Component Examples**: [src/components/npc/walker.component.js](src/components/npc/walker.component.js), [src/components/npc/position.component.js](src/components/npc/position.component.js)

### Test References
- **Current Tests**: [src/test/unit/player-system.test.js](src/test/unit/player-system.test.js) (116 tests)
- **Integration Tests**: [src/test/integration/player-system-integration.test.js](src/test/integration/player-system-integration.test.js) (37 tests)
- **E2E Tests**: [src/test/e2e/player-behavior.test.js](src/test/e2e/player-behavior.test.js) (39 tests)

---

## Approval & Execution

**Plan Status**: ✅ Complete and ready for execution

**Next Steps**:
1. Review this migration plan
2. Approve for execution
3. Execute phases 1-7 sequentially
4. Validate with test suite
5. Commit and push to `feature/player-entity-migration` branch
6. Create pull request for review

**Estimated Completion**: ~10 hours of focused development work

---

**Document Version**: 1.0
**Last Updated**: 2025-10-16
**Author**: Claude Code (AI Agent)