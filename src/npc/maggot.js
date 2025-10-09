/**
 * @file maggot.js
 * @description Composes maggot NPC entity from behaviour components.
 */

import { NPC } from '../entities/npc.entity.js';
import { PositionComponent } from '../components/npc/position.component.js';
import { StateComponent } from '../components/npc/state.component.js';
import { EaterComponent } from '../components/npc/eater.component.js';
import { WalkerComponent } from '../components/npc/walker.component.js';
import { RenderComponent } from '../components/npc/render.component.js';
import { SpawnComponent } from '../components/npc/spawn.component.js';
import { FallComponent } from '../components/npc/fall.component.js';
import { KillComponent } from '../components/npc/kill.component.js';

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
    new SpawnComponent({ spawn }),
    new PositionComponent({ gridX, gridY, spawn }),
    new StateComponent({ direction, spawn }),
    new EaterComponent({ spawn }),
    new FallComponent(),
    new WalkerComponent(),
    new KillComponent(),
    new RenderComponent(),
  ]);

  return npc;
}
