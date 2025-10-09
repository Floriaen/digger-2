/**
 * @file maggot-render.component.js
 * @description Rendering component for maggot NPCs.
 */

import { Component } from '../../core/component.js';
import { loadSpriteSheet } from '../../rendering/sprite-atlas.js';
import { TILE_HEIGHT } from '../../utils/config.js';
import { MaggotPositionComponent } from './maggot-position.component.js';
import { MaggotStateComponent } from './maggot-state.component.js';

const SPRITE = {
  x: 96,
  y: 25,
  width: 16,
  height: 9,
};

let spriteSheet = null;
let spriteSheetPromise = null;

function ensureSpriteSheetLoaded() {
  if (spriteSheet || spriteSheetPromise) {
    return;
  }

  spriteSheetPromise = loadSpriteSheet()
    .then((img) => {
      spriteSheet = img;
      return img;
    })
    .catch((error) => {
      console.error('Failed to load sprite sheet for maggot NPC', error);
    });
}

function getCamera(game) {
  return game.components.find((component) => component.constructor.name === 'CameraComponent') || null;
}

export class MaggotRenderComponent extends Component {
  init(_entity, context) {
    ensureSpriteSheetLoaded();
    this.game = context?.game || null;
  }

  render(entity, ctx, _context) {
    if (!this.game || !spriteSheet) {
      return;
    }

    const camera = getCamera(this.game);
    if (!camera) {
      return;
    }

    const position = entity.get(MaggotPositionComponent);
    const state = entity.get(MaggotStateComponent);
    if (!position || !state) {
      return;
    }

    const transform = camera.getTransform();
    const screenX = Math.floor(position.x + transform.x);
    const baseY = position.y + (TILE_HEIGHT - SPRITE.height);
    const screenY = Math.floor(baseY + transform.y);

    ctx.save();

    if (state.direction > 0) {
      ctx.scale(-1, 1);
      ctx.drawImage(
        spriteSheet,
        SPRITE.x,
        SPRITE.y,
        SPRITE.width,
        SPRITE.height,
        -screenX - SPRITE.width,
        screenY,
        SPRITE.width,
        SPRITE.height,
      );
    } else {
      ctx.drawImage(
        spriteSheet,
        SPRITE.x,
        SPRITE.y,
        SPRITE.width,
        SPRITE.height,
        screenX,
        screenY,
        SPRITE.width,
        SPRITE.height,
      );
    }

    ctx.restore();
  }

  destroy() {
    this.game = null;
  }
}
