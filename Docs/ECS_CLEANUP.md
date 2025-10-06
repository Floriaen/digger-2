# ECS Architecture Cleanup

## Introduction

This document outlines a critical cleanup phase to eliminate architectural inconsistencies introduced during the initial ECS (Entity-Component System) refactor. The codebase currently contains a **mix of object-oriented and ECS patterns**, leading to confusion, duplication, and bugs.

### Current Problems

1. **Inconsistent Physics**: Player uses custom falling logic while rocks use FallableComponent
2. **Legacy Entity Files**: `src/entities/chest.js` and `src/entities/protective-block.js` still exist despite having BlockFactory
3. **Legacy Block Registry**: `src/terrain/block-registry.js` contains pre-ECS functions (`isSolid()`, `isTraversable()`, `BLOCK_TYPES`)
4. **Poor Component Naming**: `LavaComponent` is too specific - should be `LethalComponent` (reusable for spikes, poison, etc.)
5. **Code Duplication**: `DigIndicatorComponent` and `HUDComponent` have duplicate indicator rendering logic
6. **Missing System**: FallingBlocksComponent was deleted but falling block physics logic was never integrated into a proper system

### ECS Architecture Principles (RULES)

**Golden Rule**: ALL game objects MUST be composed of components. NO standalone entity classes outside the factory pattern.

#### Component Guidelines

1. **Components contain BOTH data AND behavior**
   - BAD: Component with only properties, logic elsewhere
   - GOOD: Component with properties + methods that operate on those properties

2. **Components are self-contained**
   - A component should not directly manipulate other components
   - Use component methods, not direct property access from outside

3. **Use generic, reusable component names**
   - BAD: `LavaComponent` (too specific)
   - GOOD: `LethalComponent` (reusable for any deadly block)

4. **One component, one responsibility**
   - PhysicsComponent: collision only
   - HealthComponent: HP tracking only
   - DiggableComponent: digging behavior only

#### System Guidelines

1. **Systems orchestrate component interactions**
   - Systems find entities with specific components
   - Systems call component methods (not inline logic)
   - Systems handle cross-entity behavior (e.g., falling blocks hitting player)

2. **Systems should be in `src/systems/`**
   - NOT in `src/components/` if they manage multiple entities

#### Factory Guidelines

1. **BlockFactory is the ONLY way to create Block entities**
   - NO standalone entity classes
   - NO inline `new Block([...])` calls outside factory
   - Factory methods compose components to create block types

2. **Factory methods should be descriptive**
   - `BlockFactory.createMud(hp, variant)`
   - `BlockFactory.createChest(loot)`
   - `BlockFactory.createLethalBlock(spriteX, spriteY)` (for lava, spikes, etc.)

---

## Cleanup Plan

### Phase 1: Remove Legacy Files ✓ (Priority: Critical)

**Goal**: Delete all pre-ECS artifact files

**Tasks**:
1. ✓ Delete `src/entities/chest.js`
2. ✓ Delete `src/entities/protective-block.js`
3. ✓ Delete `src/terrain/block-registry.js`
4. ✓ Search codebase for any imports of these files
5. ✓ Remove all imports and replace with BlockFactory usage

**Validation**:
- `src/entities/` directory should be empty (or deleted)
- No references to `BLOCK_TYPES`, `isSolid()`, `isTraversable()` from block-registry
- All block creation uses BlockFactory

---

### Phase 2: Rename LavaComponent → LethalComponent ✓ (Priority: High)

**Goal**: Use generic naming for reusable components

**Tasks**:
1. ✓ Rename `src/components/blocks/lava.component.js` → `lethal.component.js`
2. ✓ Rename class `LavaComponent` → `LethalComponent`
3. ✓ Update all imports across codebase
4. ✓ Update `BlockFactory.createLava()` to use LethalComponent
5. ✓ Update player.component.js lava detection
6. ✓ Update terrain-generator.js lava detection

**Files to Update**:
- `src/components/blocks/lava.component.js` (rename file)
- `src/factories/block.factory.js`
- `src/components/player.component.js`
- `src/terrain/terrain-generator.js`
- `src/rendering/tile-renderer.js`

**Validation**:
- No references to `LavaComponent` remain
- All lethal block detection uses `block.has(LethalComponent)`

---

### Phase 3: Unify Falling Physics ✓ (Priority: Critical)

**Goal**: Player and rocks use the same FallableComponent for gravity

**Current State**:
- Player has custom falling logic in PlayerComponent (`_applyGravity()`, `_updateFalling()`)
- Rocks should use FallableComponent but system was deleted
- No consistent physics system

**Tasks**:

#### 3.1: Create GravitySystem
1. ✓ Create `src/systems/gravity.system.js`
2. ✓ System finds all entities with FallableComponent
3. ✓ System calls `fallable.updateFalling(deltaTime)` for each
4. ✓ System checks ground collision and stops falling
5. ✓ System handles falling block → player collision (lethal)

#### 3.2: Update PlayerComponent
1. ✓ Add FallableComponent to player in PlayerComponent.init()
2. ✓ Remove custom `_applyGravity()` method
3. ✓ Remove custom `_updateFalling()` method
4. ✓ Remove `this.velocityY`, `this.isFalling`, `this.pixelY` properties
5. ✓ Update movement code to use `fallable.startFalling()` / `fallable.stopFalling()`

#### 3.3: Update FallableComponent
1. ✓ Add `checkGroundCollision(terrain, gridX, gridY)` method
2. ✓ Ensure component is fully self-contained

#### 3.4: Integrate GravitySystem
1. ✓ Import GravitySystem in main.js
2. ✓ Add to game components in correct order (after terrain, before rendering)

**Validation**:
- Player falls with same physics as rocks
- Player dies when hit by falling rock
- No duplicate gravity code in PlayerComponent

---

### Phase 4: Extract Shared Indicator Logic ✓ (Priority: Medium)

**Goal**: Remove code duplication between DigIndicatorComponent and HUDComponent

**Current Duplication**:
- Both render text/bars on screen
- Both calculate positions relative to camera
- Similar rendering boilerplate

**Tasks**:
1. ✓ Create `src/utils/indicator-renderer.js` utility
2. ✓ Add methods:
   - `renderProgressBar(ctx, x, y, width, height, progress, color)`
   - `renderText(ctx, x, y, text, fontSize, color, align)`
3. ✓ Update DigIndicatorComponent to use utility
4. ✓ Update HUDComponent to use utility

**Validation**:
- No duplicate rendering code
- Both indicators work as before

---

### Phase 5: Audit and Document ✓ (Priority: High)

**Goal**: Ensure codebase is fully ECS-compliant and documented

**Tasks**:

#### 5.1: Code Audit
1. ✓ Search for any remaining `new Block([...])` calls outside BlockFactory
2. ✓ Search for any direct component property access (should use methods)
3. ✓ Search for any logic in wrong places (e.g., system logic in components)
4. ✓ Verify all blocks created via BlockFactory

#### 5.2: Update Documentation
1. ✓ Update `ARCHITECTURE_REFACTOR.md` with "Cleanup Complete" status
2. ✓ Document all components in `Docs/COMPONENTS.md` (new file)
3. ✓ Document all systems in `Docs/SYSTEMS.md` (new file)
4. ✓ Update `CLAUDE.md` with ECS guidelines

#### 5.3: Add Code Comments
1. ✓ Ensure every component has JSDoc with purpose and usage
2. ✓ Ensure every system has JSDoc with responsibility
3. ✓ Ensure BlockFactory methods have JSDoc

**Validation**:
- All files have proper documentation
- ECS guidelines are clear and enforced
- No architectural violations remain

---

## Post-Cleanup Architecture

### Directory Structure

```
src/
├── components/
│   ├── blocks/           # Block components (data + behavior)
│   │   ├── darkness.component.js
│   │   ├── diggable.component.js
│   │   ├── fallable.component.js
│   │   ├── health.component.js
│   │   ├── lethal.component.js  # ✓ Renamed from lava
│   │   ├── lootable.component.js
│   │   ├── physics.component.js
│   │   ├── protective.component.js
│   │   └── render.component.js
│   ├── background.component.js
│   ├── camera.component.js
│   ├── debug.component.js
│   ├── dig-indicator.component.js
│   ├── grid-overlay.component.js
│   ├── hud.component.js
│   ├── navigation.component.js
│   ├── player.component.js       # ✓ Uses FallableComponent
│   ├── shadow.component.js
│   ├── terrain.component.js
│   └── touch-input.component.js
├── core/
│   ├── component.base.js
│   ├── entity.js                 # Block entity class
│   └── game.js
├── factories/
│   └── block.factory.js          # ✓ Only way to create blocks
├── systems/
│   ├── gravity.system.js         # ✓ NEW: Unified falling physics
│   ├── halo-generator.js
│   ├── input.system.js
│   └── score-system.js
├── terrain/
│   ├── terrain-chunk.js
│   └── terrain-generator.js
├── rendering/
│   └── tile-renderer.js
└── utils/
    ├── config.js
    ├── event-bus.js
    ├── indicator-renderer.js     # ✓ NEW: Shared rendering logic
    ├── math.js
    └── noise.js
```

### Component → System Mapping

| Component | Used By | Managed By System |
|-----------|---------|-------------------|
| FallableComponent | Player, Rock blocks | GravitySystem |
| PhysicsComponent | All solid blocks | Player movement, GravitySystem |
| DiggableComponent | Mud, Rock blocks | PlayerComponent |
| HealthComponent | Diggable blocks | DiggableComponent.dig() |
| LethalComponent | Lava, (future: spikes) | PlayerComponent |
| LootableComponent | Chests | DiggableComponent.dig() |
| RenderComponent | All blocks | TerrainComponent |
| DarknessComponent | Mud, Protective blocks | DarknessComponent.render() |
| ProtectiveComponent | Protective blocks | HaloGenerator |

---

## Success Criteria

- ✅ No files in `src/entities/`
- ✅ No references to `block-registry.js`
- ✅ All blocks created via BlockFactory
- ✅ Player uses FallableComponent for gravity
- ✅ LavaComponent renamed to LethalComponent
- ✅ No duplicate indicator rendering code
- ✅ All components documented
- ✅ All systems documented
- ✅ ECS guidelines in CLAUDE.md

---

## Known Issues to Address

1. **Terrain still uses chunk-based generation** - Works fine, but ensure it only uses BlockFactory
2. **Shadow component** - Verify it works with ECS Block entities
3. **Navigation component** - May need audit for ECS compliance

---

## Testing Checklist (After Cleanup)

- [ ] Player falls and lands correctly
- [ ] Rocks fall and kill player on collision
- [ ] Digging works (HP reduction, destruction)
- [ ] Chests spawn and drop loot
- [ ] Protective blocks have darkness gradient
- [ ] Lava kills player
- [ ] No console errors
- [ ] No architectural violations

---

## Notes for Future Development

**When adding new block types**:
1. Create components for unique behaviors
2. Add factory method in BlockFactory
3. Use generic component names (reusable)
4. Document in COMPONENTS.md

**When adding new systems**:
1. Create in `src/systems/`
2. System should orchestrate components
3. Add to main.js in correct order
4. Document in SYSTEMS.md

**NEVER**:
- Create standalone entity classes
- Add logic to components that belongs in systems
- Use sprite-based detection (use components!)
- Access component properties directly (use methods)
