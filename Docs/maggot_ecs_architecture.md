# Maggot ECS Architecture (Draft)

## 1. Goals
- Introduce maggots as autonomous NPCs without breaking ECS consistency.
- Reuse existing block components where possible (e.g., `FallableComponent`).
- Provide hooks for future NPC types (shared registry, rendering, behaviour systems).

## 2. High-Level Components
- **NPCRegistry**: central lifecycle manager for autonomous NPCs.
- **NPCFactory**: builds maggot NPC entities by composing reusable components.
- **MaggotSpawnPipeline**: terrain chunk integration that replaces some pause-crystal spots with maggots.
- **Behaviour Components**:
  - `PositionComponent` / `VelocityComponent`
  - `NPCRenderComponent` (queues sprite draw)
  - `CollisionComponent` (AABB for player interaction)
  - `FallableComponent` (existing block gravity)
  - `WalkerAIComponent` (horizontal crawl state)
  - `EaterComponent` (consumes diggable blocks instantly)
  - `KillOnTouchComponent` (fires player death event)

## 3. Lifecycle Flow
1. **Terrain generation**
   - `_collectSpecialPlacements` identifies candidate mud tiles.
   - `_determineSpecialType` sometimes returns `'maggot'` (e.g., 1/3 of pause-crystal chance).
   - `_placeMaggotSpecial` clears the tile and appends `{ id, gridX, gridY, direction }` to `chunk.maggotSpawns`.
2. **Chunk streaming**
   - When a chunk loads, the streamer iterates `chunk.maggotSpawns` / persisted state and calls `NPCRegistry.spawn('maggot', spawnData)`.
3. **Instantiation**
   - `NPCRegistry` uses `NPCFactory` to build the NPC entity, registers it, and seeds per-chunk state.
4. **Per-frame update**
   - `NPCRegistry.update(deltaTime, context)` performs visibility culling and invokes behaviour hooks (`Walker`, `Eater`, `Fallable`, `KillOnTouch`).
5. **Rendering**
   - After terrain rendering, `NPCRegistry.render(renderQueue, transform)` queues draws for NPCs with `NPCRenderComponent`.
6. **Destruction**
   - Gravity/terrain systems call `NPCRegistry.crushAt(gridX, gridY)` when a falling block lands; the registry despawns the maggot and updates chunk state.

## 4. System Responsibilities
- **NPCRegistry**
  - Maintain entity set keyed by unique IDs.
  - Provide `spawn`, `despawn`, `update`, `render`, `crushAt` APIs.
  - Pass shared context objects (terrain, player, eventBus) to component updates.
- **NPCFactory**
  - Compose components with data (sprite coordinates, movement speed, etc.).
  - Optionally attaches behaviour functions directly to components.
- **Behaviour Modules** (can be components with methods or small systems invoked by registry):
  - Walker: update position, flip on collision, start falling when unsupported.
  - Eater: detect diggable block ahead, consume and move into space.
  - KillOnTouch: AABB check against player, emit death event.
  - Gravity: reuse `FallableComponent` for vertical movement.

## 5. Integration Points
- `src/core/game.js`: instantiate `NPCRegistry`, call `npcRegistry.update` and `npcRegistry.render` inside main loop.
- `src/terrain/terrain-generator.js`: record maggot spawn metadata.
- `src/systems/gravity.system.js`: call `npcRegistry.crushAt` when falling block lands.
- `src/main.js`: add any bootstrap systems (if needed) but maggots ideally run entirely via registry.

## 6. Open Questions / Next Steps
1. Finalize component update contract (method signature, context).
2. Decide whether behaviour lives on components or dedicated systems invoked by registry.
3. Define serialization format for NPC state inside chunks.
4. Determine spawn balancing rules (probability, depth constraints).
5. Implement tests for NPC lifecycle (spawn, update, render, crush).

---
_Last updated: TODO_
