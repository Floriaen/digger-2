# Digger 2 Iterative Development Plan

> Target devices: mobile and web (mobile-friendly aspect ratio). Desktop remains optional.

## Milestone 0 – Pure Mud Sandbox
- Project setup: repo, build pipeline, linting, asset wiring.
- Core loop: 60 Hz update, touch/keyboard input (left/right), camera follow.
- Rendering: sky/mountains/sun, surface strip, underground black background, HP=1 `mud_light` grid using `sprite.png` fake-3D tiles.
- Player prototype: auto-dig cadence, white-outline fade, gravity, free-fall.
- Debug tooling: camera de-zoom toggle for full-chunk view.
- Outcome: mobile/web build for pure mud playtest.

## Milestone 1 – Navigation & Safety
- Directional guidance: white triangles (400 ms delay, instant hide on movement, fall warnings).
- Falling solids: rock drop system, lethal collisions, telegraph cues.
- Input polish: gate lateral digs to diggable blocks, ignore empty targets.
- QA utilities: run recording, seed overrides, mobile perf logging.
- Outcome: safe pure-mud slice with reliable guidance.

## Milestone 2 – Terrain Variants
- Block roster: enable mud HP tiers (1→5), `red_frame` (HP=5), rare falling rocks.
- Chunk generation: stratified noise, escape heuristics, 8x6 red torus rings, void-to-lava termination zone.
- Streaming: on-demand chunk creation, caching, deterministic seeds.
- Batch generator: offline 10x10 chunk composite (images/JSON) for review.
- Outcome: endless descent with progressive terrain variety.

## Milestone 3 – Visual & UX Polish
- Art polish: palette tuning, mountain parallax adjustments, lava glow.
- HUD: score icon/text, pause overlay stub.
- Feedback: rock impact audio, fall-warning timing, block fade tweaks.
- Camera: smooth follow, utility de-zoom controls, scripted zoom/de-zoom hooks.
- Outcome: MVP presentation matching art direction.

## Milestone 4 – Stabilization & Stretch
- Bug triage: resolve collision seams, free-fall edge cases, perf spikes.
- Profiling: generation cost, tile batching, memory footprint on long runs.
- Documentation: block registry API, chain-reaction hooks, dev-tool guides.
- Stretch: audio bed, expanded touch UI, placeholder collectibles, replayable seed list.
- Outcome: release candidate and prioritized backlog.

## Continuous Practices
- Testing: unit tests (block HP, free-fall, falling solids), integration tests (chunk seams, escape heuristics), mobile-browser smoke runs.
- Tooling: debug overlays (chunk bounds, HP heatmap), automated 10x10 batch tests, device telemetry dashboards.
- Review: weekly playtests and retrospectives to decide when to roll tougher content to testers.
