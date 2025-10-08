# Coin Effect Implementation Plan

## Feature Goal
Spawn a short-lived coin visual when a chest is destroyed. The coin should appear centered on the destroyed chest, render above the player, float upward while fading out, then disappear. When the effect triggers, the score increases by 1.

## ECS Additions
- **Coin effect entity**
  - `RenderComponent`: uses atlas frame `(48, 50, 16, 16)` with layer `RenderLayer.EFFECTS`.
  - `LootEffectComponent` (new): stores world position, vertical velocity, alpha, lifetime timer, and removal flag.
  - `CollectableComponent` (new): declares score payload `{ score: 1 }` for systems that react to collectibles.

## Systems & Events
- **CoinEffectSystem** (new lifecycle component)
  - Subscribes to `eventBus.on('block:loot')` and spawns coin effect entities when loot items include `{ type: 'coin' }`.
  - Updates coin entities each frame: move upward, reduce alpha, mark for removal once lifetime ends.
  - Emits `eventBus.emit('score:add', { amount: collectable.score })` when the effect spawns (or at fade completion).
  - Queues render commands for active coins using the camera transform.
- **HUDComponent** update
  - Subscribe to `score:add` events in `init()` and increment the displayed score.

## Implementation Checklist
1. Create `CollectableComponent` and `LootEffectComponent` under `src/components/blocks/` (extend base `Component`).
2. Add `CoinEffectSystem` under `src/systems/` with lifecycle hooks and event subscriptions.
3. Provide a factory/helper in `CoinEffectSystem` (or dedicated module) to build the coin effect entity with the components above.
4. Update `HUDComponent` to listen for `score:add` and adjust `this.score`.
5. Wire the new system into the game bootstrap (ensure it is created and added to the component list).
6. Verify rendered layering (coin draws over player) and timing by running the game and destroying a chest.

## Notes
- `LootableComponent` continues to emit `block:loot` events instead of spawning entities to keep digging logic decoupled; the new system is the consumer that turns loot data into visuals and score updates.
- Keep component data minimal—behaviour lives in the system; components remain simple data bags.
