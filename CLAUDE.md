# Claude Development Journal

This document tracks AI-assisted development sessions for Digger 2, including token usage, architectural decisions, and feature estimates.

## Token Usage Commitment

**Before implementing any new feature or milestone**, I will:
1. Provide a token estimate (base + buffer with reasoning)
2. Log the estimate in [TOKEN_ESTIMATES.md](Docs/TOKEN_ESTIMATES.md)
3. Track actual usage after completion
4. Highlight deviations >20% for accuracy assessment

---

## Development Sessions

### Session 1: Pre-Milestone 0 Setup
**Date**: 2025-10-03
**Milestone**: Pre-M0 Infrastructure
**Budgeted Tokens**: 1000

#### Objectives
- [x] Initialize git repository and link to remote
- [x] Create component-based architecture scaffold
- [x] Set up package.json with dat.gui dependency
- [x] Configure ESLint (Airbnb base)
- [x] Create base component class and event bus
- [x] Write README.md and CLAUDE.md
- [x] Create MIT LICENSE
- [x] Create .gitignore
- [x] Scaffold index.html and component stubs

#### Architectural Decisions
1. **Component-based architecture**: All game entities extend `Component` base class with lifecycle methods (`init`, `update`, `render`, `destroy`)
2. **Event-driven communication**: Lightweight pub/sub via `event-bus.js` for decoupled components
3. **Modular structure**: Separate directories for components, systems, terrain, rendering, utilities
4. **ES6 modules**: Native browser module support, no bundler initially
5. **Naming conventions**:
   - Files: `kebab-case.js`
   - Classes: `PascalCase`
   - Functions/variables: `camelCase`
   - Constants: `SCREAMING_SNAKE_CASE`
   - Private members: `_prefixedUnderscore`

#### Files Created
- `package.json` - Dependencies (dat.gui) and scripts
- `.eslintrc.json` - Airbnb style guide with browser env
- `src/core/component.base.js` - Abstract component class
- `src/utils/event-bus.js` - Pub/sub event system
- `src/utils/math.js` - lerp, clamp, distance helpers
- `README.md` - Project overview and setup instructions
- `CLAUDE.md` - This file
- `LICENSE` - MIT license
- `.gitignore` - Node/web project ignores

#### Token Usage
- **Budgeted**: 1000 tokens
- **Actual**: _[To be filled after session completion]_
- **Delta**: _[To be calculated]_

#### Notes
- Git repository initialized with remote `git@github.com:Floriaen/digger-2.git`
- User configured as "Floriaen"
- Component stubs pending (next task)

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

## Retrospective Notes

After each milestone, record:
- What went well
- What could be improved
- Unexpected challenges
- Token accuracy (vs. estimate)

---

## Next Steps

1. Complete Pre-M0 setup (component stubs, index.html)
2. Begin Milestone 0: Pure Mud Sandbox
3. Implement core game loop and rendering pipeline
4. Integrate sprite.png atlas
5. Build auto-dig mechanics and camera follow

**Estimated Start of M0**: After Pre-M0 completion and npm install
