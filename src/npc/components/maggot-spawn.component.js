/**
 * @file maggot-spawn.component.js
 * @description Handles spawn metadata bookkeeping for maggot NPCs.
 */

import { Component } from '../../core/component.js';

export class MaggotSpawnComponent extends Component {
  constructor({ spawn }) {
    super({ spawn });
  }

  init(_entity, _context) {
    if (this.spawn) {
      this.spawn.active = true;
      this.spawn.npc = _entity;
    }
  }

  destroy(_entity, _context) {
    if (this.spawn) {
      this.spawn.active = false;
      this.spawn.npc = null;
    }
  }
}
