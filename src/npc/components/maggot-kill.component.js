/**
 * @file maggot-kill.component.js
 * @description Kills the player on contact with the maggot.
 */

import { Component } from '../../core/component.js';
import { eventBus } from '../../utils/event-bus.js';
import { MaggotPositionComponent } from './maggot-position.component.js';

const HITBOX_WIDTH = 16;
const HITBOX_HEIGHT = 9;

export class MaggotKillComponent extends Component {
  update(entity, _deltaTime, { game }) {
    if (!game) {
      return;
    }

    const player = game.components.find((component) => component.constructor.name === 'PlayerComponent');
    if (!player || player.dead) {
      return;
    }

    const position = entity.get(MaggotPositionComponent);
    if (!position) {
      return;
    }

    const maggotLeft = position.x;
    const maggotRight = maggotLeft + HITBOX_WIDTH;
    const maggotTop = position.y + (16 - HITBOX_HEIGHT);
    const maggotBottom = maggotTop + HITBOX_HEIGHT;

    const playerLeft = player.x - 8;
    const playerRight = player.x + 8;
    const playerTop = player.y - 8;
    const playerBottom = player.y + 8;

    const overlaps = maggotLeft < playerRight
      && maggotRight > playerLeft
      && maggotTop < playerBottom
      && maggotBottom > playerTop;

    if (overlaps) {
      eventBus.emit('player:death', { cause: 'maggot' });
    }
  }
}
