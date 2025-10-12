# Gravity/Falling Refactor Plan

## Goal
Establish a consistent falling pipeline so blocks, NPCs, and the player share one gravity system without ambiguous APIs or mid-loop mutations. The new design must keep gameplay behavior (falling rocks crush the player) while making future changes predictable and testable.

## Phase 1 – Stabilize the Fallable Component
- Bind each `FallableComponent` instance to its owning entity when it is attached.
  - Update all creation sites so the component immediately receives the owning entity reference.
  - Add a unit-style assertion (or runtime `console.assert`) to catch missing owners during development.
- Expose a clear, entity-agnostic interface: `start(gridX, gridY)`, `tick(deltaMs)`, `land()`, `reset()`.
  - Rename old methods and delete overloads that accept the entity parameter.
  - Update every caller (terrain, gravity, NPC systems, player) in the same commit to prevent the half-converted state.
- Internally track block state (grid and pixel positions) while reading actor positions through their existing components.
  - Blocks store `pixelY`, `gridX`, `gridY` inside the component.
  - Actors read/write through `PositionComponent` accessors only—no direct mutation from gravity.
- Acceptance criteria
  - Lint/test pass.
  - Rocks fall visually as they do today.
  - Manual smoke test: dig under a rock, ensure it drops instead of disappearing.

## Phase 2 – Refine the Gravity System
- Iterate all fallable entities and drive only the shared methods from Phase 1.
  - Replace direct `terrain.setBlock`/`getBlock` manipulations in the hot loop with action objects.
- Detect collisions and landings, but queue the outcomes (`move block`, `remove block`, `kill player`) instead of mutating terrain during the loop.
  - Use a simple array of `{ type: 'move' | 'destroy' | 'kill-player', payload }`.
  - Apply queued actions after the iteration ends (still within the same frame).
- Emit focused events such as `block:landed`, `block:crushed-player`, freeing other systems to respond.
  - Prefer `eventBus.emit` to keep wiring consistent with the rest of the codebase.
- Acceptance criteria
  - Gravity loop no longer mutates terrain/player state directly.
  - Instrumentation (temporary console log or unit test) shows actions are queued/applied in order.
  - Manual smoke test: stack two rocks, dig the bottom block, confirm the top rock respects gravity and player collision.

## Phase 3 – Integrate and Verify
- Update terrain, player, and NPC systems to consume the queued actions or events.
  - Terrain applies `move`/`destroy` operations after gravity runs.
  - Player listens for `block:crushed-player` and executes death logic (single handler path).
- Remove legacy gravity hooks and dead code related to the previous implicit API.
  - Delete fallback code in components that attempted to guess ownership.
  - Remove gravity-specific code paths from player updates now handled centrally.
- Refresh documentation/tests, run lint + gameplay checks to confirm no regressions (rocks fall, stack, and kill the player properly).
  - Update docs: `Docs/ARCHITECTURE.md` gravity section + this plan marked as completed.
  - If integration tests exist, add one for “falling rock kills player”.
  - Final manual checklist: spawn, dig, fall, collide, restart scenarios.
