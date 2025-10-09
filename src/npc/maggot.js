/**
 * @file maggot.js
 * @description Composes maggot NPC entity from behaviour components.
 */

import { NPC } from '../entities/npc.entity.js';
import { MaggotPositionComponent } from './components/maggot-position.component.js';
import { MaggotStateComponent } from './components/maggot-state.component.js';
import { MaggotEaterComponent } from './components/maggot-eater.component.js';
import { MaggotWalkerComponent } from './components/maggot-walker.component.js';
import { MaggotRenderComponent } from './components/maggot-render.component.js';
import { MaggotSpawnComponent } from './components/maggot-spawn.component.js';
import { MaggotFallComponent } from './components/maggot-fall.component.js';
import { MaggotKillComponent } from './components/maggot-kill.component.js';

export function createMaggot(spawn) {
  if (!spawn) {
    throw new Error('createMaggot requires spawn metadata');
  }

  const gridX = typeof spawn.worldX === 'number'
    ? spawn.worldX
    : (typeof spawn.localX === 'number' ? spawn.localX : 0);
  const gridY = typeof spawn.worldY === 'number'
    ? spawn.worldY
    : (typeof spawn.localY === 'number' ? spawn.localY : 0);
  const direction = typeof spawn.direction === 'number' ? spawn.direction : -1;

  spawn.worldX = gridX;
  spawn.worldY = gridY;
  spawn.direction = direction;

  const npc = new NPC([
    new MaggotSpawnComponent({ spawn }),
    new MaggotPositionComponent({ gridX, gridY, spawn }),
    new MaggotStateComponent({ direction, spawn }),
    new MaggotEaterComponent({ spawn }),
    new MaggotFallComponent(),
    new MaggotWalkerComponent(),
    new MaggotKillComponent(),
    new MaggotRenderComponent(),
  ]);

  return npc;
}
