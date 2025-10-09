/**
 * @file npc-state.component.js
 * @description Stores direction and spawn linkage for an NPC.
 */

import { Component } from '../../core/component.js';

export class NpcStateComponent extends Component {
  constructor({ direction, spawn }) {
    super({ direction, spawn });
  }

  init() {
    this.syncSpawn();
  }

  syncSpawn() {
    if (this.spawn) {
      this.spawn.direction = this.direction;
    }
  }
}
