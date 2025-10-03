# Digger 2 Specification

## 1. Vision
- Deliver a polished reimagining of the classic red-ball digging concept while preserving the minimalist aesthetic described in this spec (orange sky, black mountains, green surface strip).
- Focus on tight digging mechanics, readable terrain, and a meditative flow where players carve paths through layered earth.

## 2. Core Gameplay Loop
1. Player character (red ball) automatically digs downward, consuming the block directly below at a fixed interval.
2. Player steers left or right when adjacent blocks are traversable; white triangles only appear when the ball is stationary (run start or halted by an undiggable block) to hint at valid directions.
3. Collectibles (future scope) and score systems reward efficient digging; for MVP the on-screen score counter remains but always shows zero.
4. Hazards and advanced block types will be added post-MVP; current release emphasizes traversal and terrain variety.

## 3. Player Character
- Representation: solid red circle with subtle shadow.
- States:
  - Idle (standing on solid support).
  - Digging (removing the block below or beside the ball).
  - Falling (no supporting block).
- Movement:
  - Automatic downward digging cadence: 1 block per `dig_interval_ms` (target 600 ms, configurable).
  - Lateral digs trigger only when the adjacent cell is diggable; the block's HP is consumed during the move and the ball occupies the cell once HP reaches zero.
  - Movement is blocked if the destination is indestructible, already empty, or outside bounds.
- Collision:
  - Rock blocks and map borders stop movement.
  - When the support block disappears the ball enters free-fall until it hits the next diggable block or solid surface.

## 4. Controls
- Desktop: `Left Arrow` to move left, `Right Arrow` to move right.
- Touch: left/right on-screen zones (optional future addition).
- Controller (future scope): D-pad/analog horizontal axis.
- Input rules:
  - Ignore input unless the destination block is diggable.
  - Apply movement only when the ball crosses a tile boundary.

## 5. Terrain System
### 5.1 Map Structure
- Infinite-feel vertical world delivered via procedurally generated chunks, each 32x32 cells.
- Surface layer: grass strip with horizon backdrop matching the described palette (orange sky, beige sun, black mountains).
- Subsurface: stratified bands of mud variants (light HP=1 near surface progressing to HP=5 deeper), occasional empty caverns, and pre-baked red torus formations sized 8x6 blocks, ending in a finite abyss with a lava lake.
- Coordinate system: integer grid, origin at surface entry point.

### 5.2 Block Types (MVP)
| ID | Name       | Color Palette                            | Behavior |
|----|------------|-------------------------------------------|----------|
| 0  | `empty`    | Transparent; white triangle markers       | Passable |
| 1  | `mud_light`| Light brown                               | HP=1 |
| 2  | `mud_medium`| Mid-tone brown                           | HP=2 |
| 3  | `mud_dark` | Deep brown                                | HP=3 |
| 4  | `mud_dense`| Very dark brown with granular texture     | HP=4 |
| 5  | `mud_core` | Nearly black brown                        | HP=5 |
| 6  | `rock`     | Light gray clusters                       | Indestructible (rare pockets only); falls when unsupported |
| 7  | `red_frame`| Saturated red, outlines torus formations  | HP=5 |

- Future expansion placeholders: `spike`, `chest`, `rare_mineral`.

### 5.3 Digging Logic
- Digging consumes block HP (mud variants scale from 1→5 with depth; `red_frame` HP=5 but diggable).
- Dig animation: overlay a white square outline on the target block while it progressively fades out; no debris particles.
- Outline persists across dig ticks to show progress; when HP reaches zero the block vanishes immediately.
- Rock blocks ignore damage and trigger a bounce animation/sound when struck.
- Unsupported solid blocks (rock and future heavy types) fall if their support is removed; collision with a falling solid kills the player.
- Destroyed blocks convert to `empty`. The player cannot move sideways into fresh empty cells—only gravity moves the ball downward.
- World termination: below the final terrain band the map transitions to empty void and then a lava lake (bright red plane with vertical spark lines). Contact kills the player and locks camera scrolling at the floor.

### 5.4 Procedural Generation
- Use layered noise (Perlin/Simplex) blended with stratified bands:
  - Global strata define dominant block types per depth band (e.g., light → medium mud 0-40, medium → dark 40-120, dense variants 120-200, mud_core/red_frame/rock 200+), tapering into sparse terrain, then void, then the lava lake.
  - Local variation selects between mud tiers and sprinkles rare rock pockets while guaranteeing at least one diggable neighbor.
  - Escape heuristics evaluate the player's vicinity to avoid unwinnable layouts.
  - Debug toggle: generate "pure mud" chunks (all `mud_light`) to validate core digging before enabling tougher blocks.
  - Caverns: thresholded negative noise values carve void clusters.
  - Red torus structures: deterministic seeded placement of 8x6 hollow rectangles with `red_frame` borders and empty interiors.
- Seed handling:
  - Deterministic seed per run, optional override for testing.
  - Generate chunks on demand as the player descends; cache recently visited chunks.
  - Batch generator utility outputs a 10x10 chunk preview without entering gameplay.

## 6. Navigation Aids
- After 400 ms of inactivity (at run start or when blocked) display white triangle overlays on adjacent diggable cells; flash them if a solid block above is about to fall.
- Indicators point toward the allowed direction (left/right/down) and disappear instantly once the ball moves.

## 7. User Interface
- HUD elements anchored to top-left:
  - Gold coin icon and numeric score (future use).
- Pause menu overlay (future milestone): resume, restart, settings.
- No additional UI clutter to maintain focus on terrain.

## 8. Visual Style Guidelines
- Note: Development agents do not have access to the original screenshots; rely solely on the descriptions below.
- Background: orange gradient sky, silhouetted black mountains, beige sun disc per this description (no external reference assets). Once the camera follows the ball beneath the surface, switch to a solid black backdrop to emphasize underground darkness.
- Mountains use a subtle parallax layer: fixed horizontally when the player is centred, drifting slightly left/right with lateral movement and nudging upward as the player digs deeper.
- Surface: layered green bands (light top, darker mid, shadow line).
- Blocks: fake-3D look with darker top edge (16x9px cap over a 16x25px tile) to suggest depth, plus flat colors and subtle pixel clusters for texture; maintain 1px inner border for definition.
- Lava lake: saturated red plane with animated vertical spark strips and subtle glow; sits beneath last terrain and fills entire screen width.
- Lighting: no dynamic shadows; rely on color values.
- Maintain crisp edges when scaling (integer pixel scaling where possible). Provide hooks for scripted zoom/de-zoom events to support dramatic reveals.

## 9. Audio (Future Scope)
- Digging: soft granular crunch.
- Rock impact: muted thud.
- Ambient background track with slow tempo.
- For MVP, stub audio manager with configurable channels.

## 10. Performance & Technical Targets
- Target platforms: mobile (iOS/Android) and web (mobile-first layout); desktop builds optional later.
- Frame rate: 60 FPS.
- Tile size: base 16x25px (width x height) to match existing textures, with fake-3D top cap occupying the upper 16x9px.
- Physics/update tick: 60 Hz; digging cadence decoupled via timer.
- Memory budget: <256 MB runtime.

## 11. Extensibility Hooks
- Block registry for adding new block types with behaviors (HP, collision, drop tables).
- Event system broadcasting block destruction and movement for future pickups or enemies.
- Save system placeholder for deep runs.
- Provide hooks for terrain chain reactions (e.g., explosions clearing cross-shaped regions) so future hazards can remove multiple blocks in patterned bursts.
- Developer utilities: camera de-zoom inspection mode and batch map generation harnesses.

## 12. MVP Acceptance Criteria
- Initial playable build supports a pure mud terrain option (all HP=1) so digging can be validated before enabling tougher strata.
- Developer tooling exposes a full-map de-zoom view and a 10x10 chunk batch preview for testing.
- Player can dig through progressively tougher mud variants (HP 1→5) with appropriate timing.
- Rock blocks force lateral navigation while red frame blocks demand extended digging effort, yet generation rules ensure the player always has at least one viable dig path (no permanent traps). Falling solid blocks can defeat careless players, so warnings must telegraph the risk.
- Procedural terrain creates natural-looking strata with occasional caverns and torus structures.
- White directional markers appear at run start and when the ball is halted by an obstacle, guiding the player toward adjacent diggable cells.
- Visual presentation matches the palette and compositions detailed in Section 8 without relying on external image references.
- World bottom behaves as designed: void transition followed by lava lake that ends the run without further camera scrolling.
