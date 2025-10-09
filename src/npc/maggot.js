/**
 * @file maggot.js
 * @description Composes maggot NPC entity from behaviour components.
 */

import { NPC } from '../entities/npc.entity.js';
import { NpcPositionComponent } from './components/npc-position.component.js';
import { NpcStateComponent } from './components/npc-state.component.js';
import { NpcEaterComponent } from './components/npc-eater.component.js';
import { NpcWalkerComponent } from './components/npc-walker.component.js';
import { NpcRenderComponent } from './components/npc-render.component.js';
import { NpcSpawnComponent } from './components/npc-spawn.component.js';
import { NpcFallComponent } from './components/npc-fall.component.js';
import { NpcKillComponent } from './components/npc-kill.component.js';

export function createMaggot(spawn) {
  if (!spawn) {
    throw new Error('createMaggot requires spawn metadata');
  }

  let gridX = 0;
  if (typeof spawn.worldX === 'number') {
    gridX = spawn.worldX;
  } else if (typeof spawn.localX === 'number') {
    gridX = spawn.localX;
  }

  let gridY = 0;
  if (typeof spawn.worldY === 'number') {
    gridY = spawn.worldY;
  } else if (typeof spawn.localY === 'number') {
    gridY = spawn.localY;
  }
  const direction = typeof spawn.direction === 'number' ? spawn.direction : -1;

  spawn.worldX = gridX;
  spawn.worldY = gridY;
  spawn.direction = direction;

  const npc = new NPC([
    new NpcSpawnComponent({ spawn }),
    new NpcPositionComponent({ gridX, gridY, spawn }),
    new NpcStateComponent({ direction, spawn }),
    new NpcEaterComponent({ spawn }),
    new NpcFallComponent(),
    new NpcWalkerComponent(),
    new NpcKillComponent(),
    new NpcRenderComponent(),
  ]);

  return npc;
}
