// La mascota de verdad de Gina (en config/gina.js): vive en el jardín de su
// casa, da saltitos por allí con su nombre encima y, cuando Gina llega, va a
// saludarla con corazones. No se aleja de casa.

import { Creature, MAX_STEP } from './creature.js';
import { SPECIES, animate } from './animals.js';
import { buildModel } from './models.js';
import { nameTag } from './companion.js';
import { GINA } from '../config/gina.js';
import { CITY_LEVEL } from '../world/terrain.js';

export const PET_HOME = { x: -26.5, z: 59.5 }; // jardín de la casa de Gina
const HOME_RADIUS = 6; // no se aleja más de esto de casa
const ACTIVE = 70; // solo está cuando Gina anda cerca
const NOTICE = 7;

export class Pet extends Creature {
  constructor(scene, sounds) {
    const kind = GINA.mascota.animal;
    const sp = SPECIES[kind] ?? SPECIES.conejo;
    super(PET_HOME.x, CITY_LEVEL + 1, PET_HOME.z, { radius: 0.3, height: sp.headY });
    Object.assign(this, { scene, sounds, kind, sp });
    this.materialCache = new Map();
    this.model = buildModel(sp.parts(GINA.mascota.color, {}), this.materialCache);
    const tag = nameTag(GINA.mascota.nombre);
    tag.position.set(0, sp.headY + 0.45, 0);
    this.model.root.add(tag);
    this.timer = 0;
    this.greetCooldown = 0;
    this.lookAt = null;
    this.shown = false;
  }

  update(dt, world, gina, light, sparkles) {
    const near = Math.hypot(gina.x - PET_HOME.x, gina.z - PET_HOME.z) < ACTIVE;
    if (near !== this.shown) {
      this.shown = near;
      if (near) this.scene.add(this.model.root);
      else this.scene.remove(this.model.root);
    }
    if (!near) return;
    for (const m of this.materialCache.values()) m.color.setScalar(Math.max(0.35, light));
    const steps = Math.ceil(dt / MAX_STEP);
    for (let i = 0; i < steps; i++) this.#step(dt / steps, world, gina, sparkles);
  }

  #step(dt, world, gina, sparkles) {
    const p = this.position;
    const dx = gina.x - p.x, dz = gina.z - p.z;
    const dist = Math.hypot(dx, dz, (gina.y - p.y) * 0.5);
    const fromHome = Math.hypot(p.x - PET_HOME.x, p.z - PET_HOME.z);
    this.greetCooldown -= dt;
    this.lookAt = null;
    let speed = 0;

    if (dist < NOTICE && Math.hypot(gina.x - PET_HOME.x, gina.z - PET_HOME.z) < HOME_RADIUS + NOTICE) {
      // Gina está en casa: va hacia ella y la saluda.
      this.lookAt = Math.atan2(-dx, -dz);
      if (dist > 1.6 && fromHome < HOME_RADIUS + 2) {
        this.goal = this.lookAt;
        speed = this.sp.speed * 1.2;
      }
      if (dist < 2.6 && this.greetCooldown <= 0) {
        this.greetCooldown = 6;
        if (this.onGround) this.vy = 5;
        sparkles.burst(p.x, p.y + this.sp.headY + 0.3, p.z, 7, ['corazon']);
        this.sounds.animal(this.kind, 1);
      }
    } else if (fromHome > HOME_RADIUS) {
      // Demasiado lejos: vuelve a casa.
      this.goal = Math.atan2(-(PET_HOME.x - p.x), -(PET_HOME.z - p.z));
      speed = this.sp.speed;
    } else {
      // Paseíto por el jardín.
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = 1.5 + Math.random() * 3;
        this.goal = Math.random() < 0.4 ? null : Math.random() * Math.PI * 2;
      }
      if (this.goal !== null) speed = this.sp.speed * 0.6;
    }

    if (this.sp.hops && speed > 0 && this.onGround) this.vy = 4.2;
    this.turn(dt);
    this.move(dt, world, speed);
    if (this.blocked) {
      this.goal = this.heading + Math.PI * (0.5 + Math.random());
      this.timer = 1;
    }
    animate(this, dt, speed);
  }
}
