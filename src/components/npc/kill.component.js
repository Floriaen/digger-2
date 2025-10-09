/**
 * @file npc-kill.component.js
 * @description Kills the player on contact with the NPC.
 */

import { Component } from '../../core/component.js';
import { eventBus } from '../../utils/event-bus.js';
import { PositionComponent } from './position.component.js';

const HITBOX_WIDTH = 16;
const HITBOX_HEIGHT = 9;

export class KillComponent extends Component {
  update(entity, _deltaTime, { game }) {
    if (!game) {
      return;
    }

    const player = game.components.find(
      (component) => component.constructor.name === 'PlayerSystem',
    );
    if (!player || player.dead) {
      return;
    }

    const position = entity.get(PositionComponent);
    if (!position) {
      return;
    }

    const npcLeft = position.x;
    const npcRight = npcLeft + HITBOX_WIDTH;
    const npcTop = position.y + (16 - HITBOX_HEIGHT);
    const npcBottom = npcTop + HITBOX_HEIGHT;

    const playerLeft = player.x - 8;
    const playerRight = player.x + 8;
    const playerTop = player.y - 8;
    const playerBottom = player.y + 8;

    const overlaps = npcLeft < playerRight
      && npcRight > playerLeft
      && npcTop < playerBottom
      && npcBottom > playerTop;

    if (overlaps) {
      eventBus.emit('player:death', { cause: 'npc' });
    }
  }
}
