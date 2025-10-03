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

Example:
- 2024-05-01: Added lava particle system exploration — base 400 tokens, +20% buffer for visual tuning chats → 480 total.

## Usage Tracking Template
After completing a milestone, log actual token use to compare against budget.

| Milestone | Budgeted Tokens | Actual Tokens | Delta | Notes |
|-----------|-----------------|---------------|-------|-------|
| Pre-0 | 1000 | | | |
| 0 | 2400 | | | |
| 1 | 1560 | | | |
| 2 | 2760 | | | |
| 3 | 1560 | | | |
| 4 | 1560 | | | |

## Instructions for Agents
1. Read this guide before starting a milestone.
2. When new tasks arise, append an Adjustment Log entry with updated estimates.
3. After finishing a milestone, fill in the usage table.
4. Highlight any deviations >20% in your final report so the projection accuracy can be assessed.
