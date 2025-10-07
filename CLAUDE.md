# Claude Development Journal

This document tracks AI-assisted development sessions for Digger 2, including token usage, architectural decisions, and feature estimates.

## Project Status

**All milestones complete** (M0-M4) as of 2025-10-06. See [TOKEN_ESTIMATES.md](Docs/TOKEN_ESTIMATES.md) for detailed breakdown.

**Total tokens used**: 371,448 (vs original estimate of 10,040 - 37x multiplier due to architectural complexity)

---

## Current Architecture (Post-ECS Refactor)

### Core Principles
1. **ECS (Entity-Component-System)**: Blocks are entities composed of components (data + behavior)
2. **Two Component Types**:
   - **LifecycleComponent** (`src/core/lifecycle-component.js`): Game loop systems (player, camera, terrain, HUD)
   - **Component** (`src/core/component.js`): ECS data containers for block entities
3. **Factory Pattern**: BlockFactory is the ONLY way to create block entities
4. **Event-driven communication**: Event bus for decoupled systems
5. **NO FALLBACKS**: Errors surface immediately during development
6. **YAGNI / DRY / KISS**: Build only what’s needed now, avoid repetition, keep solutions simple

### Directory Structure
```
/src
  /components       → Game systems (player, terrain, camera, HUD, etc.)
    /blocks         → Block ECS components (health, physics, diggable, etc.)
  /systems          → Cross-entity orchestration (gravity, input, score)
  /factories        → BlockFactory (entity composition)
  /terrain          → Procedural generation, chunk management
  /rendering        → Sprite atlas, tile rendering
  /core             → Base classes (LifecycleComponent, Component, Entity)
  /utils            → Event bus, math helpers, config
```

### Key Architectural Changes
- **Deleted**: `block-registry.js` (replaced by ECS component checks)
- **Deleted**: Standalone entity classes (`chest.js`, `protective-block.js`)
- **Unified**: Player and rocks use same `FallableComponent` via `GravitySystem`
- **Renamed**: `LavaComponent` → `LethalComponent` (generic reusability)

See [ECS_CLEANUP.md](Docs/ECS_CLEANUP.md) for full refactor details.

---

## Naming Conventions

- **Files**: `kebab-case.js`
- **Classes**: `PascalCase`
- **Functions/variables**: `camelCase`
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Private members**: `_prefixedUnderscore`

---

## Token Usage Commitment

**Before implementing any new feature or milestone**:
1. Provide token estimate (base + buffer with reasoning)
2. Log estimate in [TOKEN_ESTIMATES.md](Docs/TOKEN_ESTIMATES.md)
3. Track actual usage after completion
4. Highlight deviations >20% for accuracy assessment

---

## Development Milestones Summary

All milestones completed. See [DEVELOPMENT_PLAN.md](Docs/DEVELOPMENT_PLAN.md) for specifications.

| Milestone | Status | Token Budget | Actual | Delta |
|-----------|--------|--------------|--------|-------|
| Pre-M0 | ✅ Complete | 1,000 | 26,832 | +2583% |
| M0: Pure Mud Sandbox | ✅ Complete | 2,400 | 47,752 | +1890% |
| M1: Navigation & Safety | ✅ Complete | 1,560 | 22,900 | +1368% |
| M2: Terrain Variants | ✅ Complete | 2,760 | 111,912 | +3956% |
| M3: Visual & UX Polish | ✅ Complete | 1,560 | 62,543 | +3909% |
| M4: Stabilization | ✅ Complete | 1,560 | 99,509 | +6279% |

**Key Learnings**:
- Architectural/rendering work: 3-4x revised estimates
- Polish work: 1-2x revised estimates
- Stabilization/docs: 1x revised estimates (most predictable)
- Major bugs expensive (chunk visibility: 10k, fake-3D rendering: 40k tokens)

---

## Feature Addition Template

When proposing new features not in the original spec, use this format:

### Feature: [Name]
**Proposed Date**: YYYY-MM-DD
**Rationale**: Why this feature enhances the game
**Token Estimate**:
- Base: XXX tokens
- Buffer: XX% (reason)
- Total: XXX tokens

**Impact**:
- Files affected: [list]
- Dependencies: [list]
- Risk level: Low/Medium/High

**Approval Status**: Pending / Approved / Rejected

---

## Related Documentation

- [Development Plan](Docs/archive/DEVELOPMENT_PLAN.md) - Milestone specifications (archived)
- [Token Estimates](Docs/TOKEN_ESTIMATES.md) - Detailed usage tracking
- [ECS Cleanup](Docs/ECS_CLEANUP.md) - Architecture refactor documentation
- [Dev Tools](Docs/DEV_TOOLS.md) - Debugging and testing utilities
- [Game Spec](Docs/GAME_SPEC.md) - Original game design document
