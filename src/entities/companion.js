// El compañero de Gina: un capibara con una mandarina en la cabeza que la
// sigue por todo el reino. Va a su lado, nada con ella, se sienta cuando
// ella se para, la saluda con corazones al reencontrarse y, si se queda muy
// atrás (o Gina vuela lejos), aparece de nuevo junto a ella. Lleva su nombre
// encima (se cambia en config/gina.js).

import * as THREE from 'three';
import { Creature, MAX_STEP } from './creature.js';
import { SPECIES, capybaraParts, animate } from './animals.js';
import { buildModel } from './models.js';
import { GINA } from '../config/gina.js';

const NEAR = 2.6; // a esta distancia se queda tranquilo
const RUN = 6; // velocidad máxima corriendo para alcanzarla
const TELEPORT = 26; // más lejos, aparece junto a Gina
const STUCK_TIME = 2.5; // segundos atascado antes de aparecer junto a ella
const SIT_AFTER = 3; // segundos quieto antes de sentarse
const COLOR = [156, 108, 68];

// Cartelito con el nombre, para ponerlo encima de la cabeza.
export function nameTag(name) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = 'bold 44px "Trebuchet MS", sans-serif';
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(name).width) + 36;
  canvas.width = w;
  canvas.height = 64;
  ctx.font = font;
  ctx.fillStyle = 'rgba(60, 30, 90, 0.55)';
  ctx.beginPath();
  ctx.roundRect(0, 0, w, 64, 24);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, w / 2, 34);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthWrite: false }));
  sprite.scale.set((w / 64) * 0.32, 0.32, 1);
  return sprite;
}

export class Companion extends Creature {
  constructor(scene, sounds) {
    super(0, 0, 0, { radius: 0.4, height: 1.2, swims: true, avoidCliffs: false });
    this.scene = scene;
    this.sounds = sounds;
    this.kind = 'capibara';
    this.sp = SPECIES.capibara;
    this.materialCache = new Map();
    this.model = buildModel(capybaraParts(COLOR, true), this.materialCache);
    this.tag = nameTag(GINA.companero.nombre);
    this.tag.position.set(0, 1.55, 0);
    this.model.root.add(this.tag);
    this.placed = false;
    this.stuckTime = 0;
    this.stillTime = 0;
    this.wasFar = false;
    this.greetCooldown = 0;
    this.lookAt = null;
  }

  // Aparece junto a Gina, en un sitio con suelo y hueco (o encima de ella si no hay).
  #appearNear(world, gina, heading) {
    const bx = Math.floor(gina.x), by = Math.floor(gina.y), bz = Math.floor(gina.z);
    const behind = [[Math.round(Math.sin(heading) * 2), Math.round(Math.cos(heading) * 2)], [2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, -1]];
    for (const [dx, dz] of behind) {
      for (let dy = 1; dy >= -3; dy--) {
        const x = bx + dx, y = by + dy, z = bz + dz;
        if (world.isSolid(x, y - 1, z) && !world.isSolid(x, y, z) && !world.isSolid(x, y + 1, z)) {
          this.position.set(x + 0.5, y, z + 0.5);
          this.vy = 0;
          return true;
        }
      }
    }
    return false;
  }

  update(dt, world, player, light, sparkles) {
    if (!this.placed) {
      if (!this.#appearNear(world, player.position, player.yaw)) return;
      this.placed = true;
      this.scene.add(this.model.root);
    }
    const l = Math.max(0.35, light);
    for (const m of this.materialCache.values()) m.color.setScalar(l);
    const steps = Math.ceil(dt / MAX_STEP);
    for (let i = 0; i < steps; i++) this.#step(dt / steps, world, player, sparkles);
  }

  #step(dt, world, player, sparkles) {
    const gina = player.position;
    const p = this.position;
    const dx = gina.x - p.x, dz = gina.z - p.z;
    const flat = Math.hypot(dx, dz);
    const dist = Math.hypot(dx, dz, gina.y - p.y);
    this.greetCooldown -= dt;

    // Muy lejos (o atascado un rato): aparece junto a Gina cuando ella pisa suelo.
    const canAppear = player.onGround || player.inWater;
    if ((dist > TELEPORT || this.stuckTime > STUCK_TIME) && canAppear) {
      if (this.#appearNear(world, gina, player.yaw)) {
        this.stuckTime = 0;
        sparkles.burst(p.x, p.y + 1, p.z, 10, ['estrella']);
      }
    }

    // Seguirla: más deprisa cuanto más lejos está.
    let speed = 0;
    this.lookAt = Math.atan2(-dx, -dz);
    this.goal = this.lookAt;
    if (flat > NEAR) {
      speed = Math.min(RUN, 1.5 + (flat - NEAR) * 1.2);
      this.stillTime = 0;
      if (flat > 8) this.wasFar = true;
    } else {
      this.stillTime += dt;
      // Reencuentro: corazones y su sonidito.
      if (this.wasFar && this.greetCooldown <= 0) {
        this.wasFar = false;
        this.greetCooldown = 6;
        if (this.onGround) this.vy = 4.5;
        sparkles.burst(p.x, p.y + 1.3, p.z, 8, ['corazon']);
        this.sounds.animal('capibara', 1);
      }
    }

    const before = p.clone();
    this.turn(dt, 6);
    this.move(dt, world, speed);
    // ¿Atascado? (quiere moverse pero apenas avanza)
    const moved = before.distanceTo(p);
    this.stuckTime = speed > 0 && moved < speed * dt * 0.2 ? this.stuckTime + dt : Math.max(0, this.stuckTime - dt);

    // De vez en cuando, estando sentado a su lado, hace un ruidito feliz.
    const sitting = this.stillTime > SIT_AFTER && this.onGround;
    if (sitting && Math.random() < dt * 0.03) this.sounds.animal('capibara', 0.6);
    animate(this, dt, speed, { sitting });
  }
}
