# Token Projection Guide

This document tracks expected prompt/response token usage for the Digger 2 revamp using Claude Code. The goal is to compare projected costs with actual consumption after development. Whenever new milestones or feature requests appear, add them here with updated estimates and rationale.

## Baseline Milestone Estimates (Claude Code)
| Milestone | Description | Base Tokens | Buffer (%) | Buffer Reason | Total Budget |
|-----------|-------------|-------------|------------|----------------|--------------|
| Pre-0 | Project Setup & Infrastructure | 800 | 25 | Component architecture scaffold, git init, ESLint config, dat.GUI integration, documentation templates | 1000 |
| 0 | Pure Mud Sandbox | 2000 | 20 | Back-and-forth on setup, sprite integration, and de-zoom tuning | 2400 |
| 1 | Navigation & Safety | 1300 | 20 | Iterations on guidance timing and falling-solid tuning | 1560 |
| 2 | Terrain Variants | 2300 | 20 | Procedural generation tweaks, batch tool validation | 2760 |
| 3 | Visual & UX Polish | 1300 | 20 | Palette adjustments, camera drama hooks, HUD copy refinements | 1560 |
| 4 | Stabilization & Stretch | 1300 | 20 | Profiling feedback loops and documentation revisions | 1560 |

## Adjustment Log
Record any scope changes, feature additions, or unforeseen investigations. Each entry should include:
- Date / iteration tag
- Brief description of the new work
- Additional token estimate (base + buffer + reason)

### Milestone 0 Adjustments
- **2025-10-03**: Chunk visibility calculation bug fix — base 8000 tokens, +25% buffer for deep investigation and console logging → 10,000 total. Issue: terrain chunks were miscalculated based on camera transform, causing modified chunks to never render. Required extensive debugging.
- **2025-10-03**: Background scrolling & smooth fade transition — base 4000 tokens, +25% buffer for parallax tuning and fade curve adjustments → 5,000 total.
- **2025-10-03**: Player positioning for fake-3D block caps — base 2000 tokens, +50% buffer for multiple iteration attempts → 3,000 total. Adjusted Y offset three times to get proper sitting position.
- **2025-10-03**: Grass per-block rendering (instead of background strip) — base 1500 tokens, +33% buffer → 2,000 total. Moved grass from background to terrain component.
- **2025-10-03**: Down arrow to start game mechanic — base 800 tokens, +25% → 1,000 total. Added input event and hasStarted flag.
- **2025-10-03**: Debug console logging overhead — estimated 11,000 tokens for adding/removing logs, thinking through issues, multiple test cycles.

### Milestone 1 Adjustments
- **2025-10-03**: Console.log cleanup (M1 completion) — base 3,000 tokens for removing excessive debug logs across terrain, player, game core, and falling blocks components.

## Usage Tracking Template
After completing a milestone, log actual token use to compare against budget.

| Milestone | Original Budget | Revised Estimate | Actual Tokens | Breakdown | Delta (vs Revised) | Notes |
|-----------|-----------------|------------------|---------------|-----------|-------------------|-------|
| Pre-0 | 1000 | 26832 | 26832 | Setup: 26832 | 0 | Includes context loading (Docs, sprite.png analysis), planning discussion, and setup work. Original estimate was 27x too low. |
| 0 | 2400 | 17500 | 47752 | Core: ~15732, Fixes: ~32020 | +30252 (+173%) | **Core implementation**: Component wiring, background, terrain, player, camera, HUD, dat.GUI (~15k, within estimate). **Bug fixes**: Chunk visibility calculation bug (~10k), background scrolling & transition (~5k), player positioning for fake-3D (~3k), grass per-block rendering (~2k), down arrow start (~1k), debug iterations (~11k). Major debugging overhead from chunk rendering issue. |
| 1 | 1560 | 22500 | 22900 | Core: ~20k, Cleanup: ~3k | +400 (+2%) | **Core implementation**: Navigation triangles, falling blocks system, player death, input gating (~20k). **Cleanup**: Removed excessive console.log statements (~3k). Within revised budget. |
| 2 | 2760 | 35000 | 111912 | Core: ~25k, Sprite rendering: ~40k, Fixes: ~47k | +76912 (+220%) | **Core implementation**: Block registry with HP tiers, procedural generation (stratified mud, caverns, torus, lava), unified directional digging, lava death (~25k). **Sprite rendering**: Fake-3D collision vs visual separation, sprite sheet integration, rendering order fixes (~40k). **Major fixes**: Grid coordinate system changes (25px→16px collision), player/navigation positioning updates, dig indicator fixes, lava visibility, torus depth adjustment (~47k). Multiple attempts at fake-3D overlap approach before finding correct solution (sprite offset vs collision offset). |
| 3 | 1560 | 70000 | 62543 | Core: ~40k, Zoom: ~23k | -7457 (-11%) | **Core implementation**: Pac-Man player animation (4-frame mouth), Chess Pursuit palette, mountain silhouettes, surface grass generation, organic HP distribution with darken, shadow/grid overlay components, pause overlay (~40k). **Zoom system**: Smooth depth-based zoom with ease-in curve, manual controls in dat.GUI, rendering strategy comparison POC (zoom before vs after), critical canvas transform reset bug fix (~23k). Came in under revised estimate - visual polish more straightforward than M2 architectural work. |
| 4 | 1560 | 60000 | 58020 | Core: ~30k, Docs: ~20k, Testing: ~8k | -1980 (-3%) | **Core implementation**: Mountain horizontal fix, Performance API profiling (PerformanceObserver), responsive canvas (mobile-first 9:16 aspect), touch input component with visual feedback (~30k). **Documentation**: Block Registry API (2.5k words), Chain-Reaction Hooks (2.2k words), Dev Tools Guide (1.9k words), M4 Test Report (~20k). **Testing**: Collision edge cases, free-fall scenarios, procedural generation validation, regression tests (~8k). Came in 3% under budget - stabilization work highly predictable. |

**Revised Total Estimate**: 335,000 tokens (vs original 10,040)

**Actual Total**: 329,959 tokens (Pre-0: 26,832 + M0: 47,752 + M1: 22,900 + M2: 111,912 + M3: 62,543 + M4: 58,020)

**Revision Rationale (2025-10-04 - Post M4 COMPLETE)**:
- **First revision (Pre-M0)**: Context establishment overhead revealed 27x multiplier needed
- **Second revision (Post-M0)**: Core implementation estimates accurate (~15k), but bug fixes/polish add 2x overhead (~32k)
- **Third revision (Post-M1)**: M1 came in on budget (~23k vs 22.5k estimate) - first milestone within projections
- **Fourth revision (Post-M2)**: M2 exceeded estimate by 220% (112k vs 35k) - major architectural changes required
- **Fifth revision (Post-M3)**: M3 came in 11% under budget (62.5k vs 70k) - polish work more predictable than architectural changes
- **Sixth revision (Post-M4)**: M4 came in 3% under budget (58k vs 60k) - stabilization/documentation work highly predictable
- **Key learnings**:
  - Major architectural bugs expensive (chunk visibility: 10k, fake-3D rendering: 40k)
  - Visual refinement iterations add up significantly
  - Debug cycles costly, especially when fundamental approach is wrong
  - Console.log cleanup overhead (~3k) - should minimize debug logs during development
  - M1 accuracy was anomaly - architectural complexity drives cost
  - **Fake-3D rendering lesson**: Attempting wrong approaches (coordinate system changes, fallbacks) wasted ~30k tokens before finding correct solution (sprite offset)
  - Grid coordinate system changes cascade through entire codebase (player, navigation, dig indicator, etc.)
  - **M3 lesson**: Polish/visual work (animations, palette, zoom easing) more predictable than core systems - came in under budget
  - **M4 lesson**: Stabilization/documentation work extremely predictable (58k actual vs 60k estimate, 3% accuracy) - no surprises in final milestone
  - **Pattern confirmed**: Implementation milestones accurate (M1, M3, M4), architectural/rendering work unpredictable (M0, M2)
- **Final multipliers**: 3-4x revised estimates for architectural/rendering, 1-2x for polish, 1x for stabilization/docs
- **Project complete**: 329,959 tokens used vs 335,000 estimate (1.5% under budget)

## Instructions for Agents
1. Read this guide before starting a milestone.
2. **VERIFY milestone requirements** against DEVELOPMENT_PLAN.md before writing any code.
3. When new tasks arise, append an Adjustment Log entry with updated estimates.
4. After finishing a milestone, fill in the usage table.
5. Highlight any deviations >20% in your final report so the projection accuracy can be assessed.
6. Minimize console.log statements during implementation to reduce cleanup overhead.
