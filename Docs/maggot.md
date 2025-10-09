# Maggot NPC Overview

## Concept
- Hostile NPC that tunnels horizontally and consumes terrain.
- Spawned in place of some pause crystals to keep the world dynamic.
- Sprite reference: `Sprite/sprite.png` at `x:96, y:24, width:16, height:9`.

## Behaviour Summary
- Starts moving either left or right when spawned.
- Eats any diggable/destructible block instantly, regardless of HP tier.
- Falls when unsupported (shares gravity with existing fallable blocks) and resumes eating on landing.
- Kills the player on contact.
- Can be crushed by falling blocks.

## Spawn Rules
- Terrain generator marks special mud placements; 1/3 of pause crystal rolls become maggots.
- Spawn metadata stored per chunk so maggots respawn when the chunk streams back in.
