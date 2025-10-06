# Digger 2 Iterative Development Plan

> Target devices: mobile and web (mobile-friendly aspect ratio). Desktop remains optional.

**Status**: All milestones complete as of 2025-10-06. See [TOKEN_ESTIMATES.md](TOKEN_ESTIMATES.md) for development tracking.

---

## Milestone 0 – Pure Mud Sandbox ✅ COMPLETE
- ✅ Project setup: repo, build pipeline, linting, asset wiring
- ✅ Core loop: 60 Hz update, touch/keyboard input (left/right), camera follow
- ✅ Rendering: sky/mountains/sun, surface grass, underground black background, HP=1 `mud_light` grid using `sprite.png` fake-3D tiles
- ✅ Player prototype: auto-dig cadence, white-outline fade, gravity, free-fall
- ✅ Debug tooling: camera de-zoom toggle for full-chunk view
- **Outcome**: Mobile/web build for pure mud playtest

**Key Achievements**: Background scrolling, smooth fade transitions, fake-3D tile rendering (16x25px sprites with 16x16px collision)

---

## Milestone 1 – Navigation & Safety ✅ COMPLETE
- ✅ Directional guidance: white triangles (400ms delay, instant hide on movement, fall warnings)
- ✅ Falling solids: rock drop system, lethal collisions
- ✅ Input polish: gate lateral digs to diggable blocks, ignore empty targets
- ✅ Death detection and game over state
- **Outcome**: Safe pure-mud slice with reliable guidance

**Key Achievements**: Navigation triangle system, falling block physics, collision detection

---

## Milestone 2 – Terrain Variants ✅ COMPLETE
- ✅ Block roster: mud HP tiers (1→5), `red_frame` (HP=5), rare falling rocks
- ✅ Chunk generation: stratified noise, escape heuristics, 8x6 red torus rings, lava termination zone
- ✅ Streaming: on-demand chunk creation, caching, deterministic seeds
- ✅ ECS architecture: BlockFactory, component-based blocks
- **Outcome**: Endless descent with progressive terrain variety

**Key Achievements**: Full terrain generation system, ECS refactor, unified directional digging, lava death

---

## Milestone 3 – Visual & UX Polish ✅ COMPLETE
- ✅ Art polish: Chess Pursuit palette, mountain silhouettes, organic HP-based darkness
- ✅ HUD: Score display, pause overlay
- ✅ Player animation: 4-frame Pac-Man eating animation
- ✅ Camera: Smooth depth-based zoom with ease-in curve
- ✅ Surface generation: Grass blocks (HP=1)
- **Outcome**: MVP presentation matching art direction

**Key Achievements**: Animated player sprite, depth-based zoom, shadow/grid overlays, pause system

---

## Milestone 4 – Stabilization & Stretch ✅ COMPLETE
- ✅ Bug fixes: Mountain parallax, gravity physics overhaul, falling collision detection
- ✅ Touch UI: Swipe gesture controls with visual feedback
- ✅ HP-based darkness: Replaced transparency system with gradient darkness
- ✅ Rendering order: DigIndicatorComponent for proper layering
- ✅ Physics refinement: Continuous gravity acceleration, smooth falling
- ✅ ECS cleanup: Unified gravity system, renamed components (LethalComponent), deleted legacy files
- **Outcome**: Release candidate with polished mechanics

**Key Achievements**: GravitySystem unification, swipe controls, eating animation fixes, complete ECS compliance

---

## Post-Milestone: ECS Architecture Refactor ✅ COMPLETE

### Major Changes
1. **Deleted**: `block-registry.js` (replaced by ECS component checks)
2. **Deleted**: Standalone entity classes (`chest.js`, `protective-block.js`)
3. **Renamed**: `component.base.js` → `lifecycle-component.js` (clarity)
4. **Renamed**: `LavaComponent` → `LethalComponent` (generic reusability)
5. **Created**: `GravitySystem` (unified falling physics for player and rocks)
6. **Unified**: Player now uses `FallableComponent` (composition over inheritance)

### Component Architecture
- **LifecycleComponent**: Game loop systems (player, camera, terrain, HUD)
- **Component**: ECS data containers for block entities
- **BlockFactory**: Single source of truth for block entity creation

See [ECS_CLEANUP.md](ECS_CLEANUP.md) for full refactor documentation.

---

## Continuous Practices (Ongoing)
- **Testing**: Unit tests for halo-generator, component validation
- **Tooling**: Debug overlays (chunk bounds, HP heatmap), dat.GUI controls
- **Documentation**: Updated ECS architecture docs, removed obsolete files

---

## Future Extensibility

### Potential Features (Not Scheduled)
- Audio system (background music, dig sounds, rock impacts)
- Collectibles (chests with loot already implemented)
- Expanded touch UI (virtual buttons, gesture controls)
- Chain-reaction system (multi-block destruction patterns)
- Performance optimizations (tile batching, WebGL rendering)

---

## Related Documentation
- [Token Estimates](TOKEN_ESTIMATES.md) - Development tracking and costs
- [ECS Cleanup](ECS_CLEANUP.md) - Architecture refactor details
- [Dev Tools](DEV_TOOLS.md) - Debugging and testing utilities
- [Game Spec](GAME_SPEC.md) - Original design document
