# Camera System Refactor Plan

## Objective
- Replace the existing `CameraSystem` implementation with the behavior defined in `src/systems/camera2.system.js`, enabling smooth follow, canvas-transform based rendering, and explicit `applyTransform` / `resetTransform` usage in the main loop.
- Remove the reliance on `camera.getTransform()` so systems render directly in world coordinates or derive view bounds through dedicated helpers.

## Current Issues
- `CameraSystem.getTransform()` pushes translation responsibility onto every consumer, leading to duplicated math and inconsistencies.
- The camera jumps to the target instantly under fast movement and performs zoom snapping that conflicts with the desired smooth follow.
- Rendering code in `src/core/game.js` manually rebuilds transforms each frame, increasing complexity and introducing rounding artifacts.

## Target API & Behavior
- Align public methods with `camera2.system.js`: `follow(target, smoothing)`, `applyTransform(ctx, canvas)`, `resetTransform(ctx)`, `setZoom()`, `zoomIn()`, `zoomOut()`, and `clampToWorld(canvas)`.
- Maintain configurable world bounds and zoom limits; smoothing factor defaults to the value from config (currently `CAMERA_LERP_FACTOR`).
- Provide helper accessors for systems that need camera-derived bounds, e.g., `getViewBounds(canvas)` returning `{ left, right, top, bottom }` in world space.
- Game loop sequence:
  ```js
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  camera.follow(player, 0.1);  // smoothing factor from config
  camera.update(deltaTime);
  camera.applyTransform(ctx, canvas);
  drawWorld();
  drawPlayer();
  camera.resetTransform(ctx);
  ```

## Refactor Milestones & Review Checkpoints
1. **Design Alignment (this document)**  
   - Confirm API surface, smoothing expectations, and helper needs before touching code.
2. **CameraSystem Rewrite**  
   - Implement new internals in `src/systems/camera.system.js`, mirroring `camera2`, adding any world-bound helpers.  
   - Hold for review with focused unit tests or console logging demonstrating API usage.
3. **Core Loop Integration**  
   - Update `src/core/game.js` to adopt `follow`, `applyTransform`, `resetTransform`, and remove direct `getTransform()` calls.  
   - Revisit overlay rendering to ensure transforms reset appropriately. Pause for review.
4. **System Migration (batched)**  
   - Convert transform consumers (terrain, player, NPCs, overlays, indicators, effects) to rely on canvas transforms or new helpers.  
   - After each batch, run targeted smoke tests; provide delta summary for sign-off.
5. **Cleanup & Verification**  
   - Remove unused utilities, update documentation, and ensure no lingering `getTransform()` references.  
   - Perform final QA pass (runtime check, optional screenshots/logs) before closing the refactor.

## Open Questions
- Do we preserve any of the existing zoom auto-adjust logic or keep zoom constant for now?
- Should `follow` accept arbitrary targets (e.g., cinematics) or stay bound to the player only?
- Are additional editor/debug overlays expected to bypass camera transforms automatically?
