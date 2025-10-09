# Maggot ECS Architecture (Draft)

**Principles**: YAGNI, DRY, KISS.

## 1. Goals
- Introduce maggots as autonomous NPCs without breaking ECS consistency.
- Reuse existing block components where possible (e.g., `FallableComponent`).
- Provide hooks for future NPC types (shared registry, rendering, behaviour systems).

## 2. High-Level Components
- **NPCList**: thin container that stores active NPCs and iterates them during update/render.
- **MaggotSpawner**: terrain chunk integration that replaces some pause-crystal spots with maggots.
- **Behaviour Components** (self-contained data + logic on each NPC):
  - `PositionComponent` / `VelocityComponent`
  - `NPCRenderComponent` (queues sprite draw)
  - `CollisionComponent` (AABB for player interaction)
  - `FallableComponent` (handles falling)
  - `WalkerComponent` (horizontal crawl state)
  - `EaterComponent` (consumes diggable blocks instantly)
  - `KillOnTouchComponent` (fires player death event)

## 3. Lifecycle Flow
1. **Terrain generation**
   - `_collectSpecialPlacements` identifies candidate mud tiles.
   - `_determineSpecialType` sometimes returns `'maggot'` (e.g., 1/3 of pause-crystal chance).
   - `_placeMaggotSpecial` clears the tile and appends `{ id, gridX, gridY, direction }` to `chunk.maggotSpawns`.
2. **Chunk streaming**
   - When a chunk loads, the streamer iterates `chunk.maggotSpawns` / persisted state and constructs maggot NPCs directly, pushing them into `NPCList`.
3. **Instantiation**
   - NPC creation composes the required components (position, render, behaviours) and lets each component manage its own state.
4. **Per-frame update**
   - The list loops through visible NPCs and calls `npc.update(deltaTime, sharedContext)`; components perform their own logic (walker, eater, fall, kill-on-touch).
5. **Rendering**
   - The list calls `npc.render(ctx, sharedContext)` and the render component enqueues the sprite.
6. **Destruction**
   - When a falling block lands or behaviour triggers removal, the responsible component notifies the list so it can drop the NPC; no global lifecycle controller required.

## 4. System Responsibilities
- **NPCList**
  - Maintain an array of NPC objects with tiny `add`, `update`, `render`, `remove` helpers.
  - Forward a minimal shared context (`game`, `terrain`, `eventBus`) while iterating NPCs.
- **MaggotSpawner**
  - Translate chunk spawn metadata into concrete NPC instances.
  - Re-add maggots when chunks stream back in and remove them when chunks unload.
- **Behaviour Components**
- Walker: update position, flip direction on collision, trigger falling when unsupported.
- Eater: detect diggable block ahead and consume it instantly.
  - KillOnTouch: AABB check against player, emit death event.
  - Fallable: reuse existing component for gravity and trigger removal when crushed.

## 5. Integration Points
- `src/core/game.js`: add the NPC list component so it updates/renders alongside existing systems.
- `src/terrain/terrain-generator.js`: record maggot spawn metadata and create NPC instances when chunks load.
- `src/systems/gravity.system.js`: notify affected maggot components when a falling block lands so they can mark themselves for removal.
- `src/main.js`: bootstrap the NPC list after terrain so spawn events can populate it immediately.

## 6. Open Questions / Next Steps
1. Finalize component update contract (method signature, context).
2. Confirm component signature for `update`/`render` so the NPC list stays generic.
3. Define serialization format for NPC state inside chunks.
4. Determine spawn balancing rules (probability, depth constraints).
5. Implement tests for NPC lifecycle (spawn, update, render, crush).

---
_Last updated: TODO_
