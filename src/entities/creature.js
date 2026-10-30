// Base común de los seres que pasean por el mundo (Brotis, animalitos y el
// compañero de Gina): andar en la dirección en la que miran, subir escalones
// de un bloque con un saltito, no caerse por precipicios ni meterse en el
// agua (salvo los que nadan), gravedad y flotar al nadar.

import * as THREE from 'three';
import { IS_LIQUID } from '../blocks/registry.js';

const GRAVITY = 25;
const MAX_FALL = 20;
const HOP_SPEED = 7; // para subir un escalón

export class Creature {
  // opts: radius (medio ancho), height, swims (puede nadar), avoidCliffs
  constructor(x, y, z, { radius = 0.35, height = 1.8, swims = false, avoidCliffs = true } = {}) {
    this.position = new THREE.Vector3(x, y, z);
    this.vy = 0;
    this.heading = Math.random() * Math.PI * 2; // hacia dónde mira (0 = -z)
    this.goal = null; // ángulo hacia el que quiere ir, o null
    this.onGround = false;
    this.inWater = false;
    this.walkPhase = 0;
    this.blocked = false; // en el último paso se topó con algo
    Object.assign(this, { radius, height, swims, avoidCliffs });
  }

  // ¿Bloque sólido en esta celda? (lo no cargado cuenta como sólido: no se va allí)
  static solid(world, x, y, z) {
    return world.isSolid(Math.floor(x), Math.floor(y), Math.floor(z));
  }

  static liquid(world, x, y, z) {
    const id = world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    return id >= 0 && IS_LIQUID[id] === 1;
  }

  // Girar poco a poco hacia `goal`.
  turn(dt, rate = 5) {
    if (this.goal === null) return;
    const diff = Math.atan2(Math.sin(this.goal - this.heading), Math.cos(this.goal - this.heading));
    this.heading += diff * Math.min(1, dt * rate);
  }

  // Un paso de movimiento: avanzar `speed` bloques/s hacia donde mira y aplicar gravedad.
  move(dt, world, speed) {
    const p = this.position;
    const S = Creature.solid;
    this.blocked = false;
    if (speed > 0) {
      const dx = -Math.sin(this.heading) * speed * dt;
      const dz = -Math.cos(this.heading) * speed * dt;
      const r = this.radius;
      const ahead = { x: p.x + Math.sign(dx) * r + dx, z: p.z + Math.sign(dz) * r + dz };
      const feet = p.y + 0.05;
      const wall = S(world, ahead.x, feet, ahead.z);
      const tooHigh = S(world, ahead.x, feet + 1, ahead.z) || S(world, ahead.x, feet + 2, ahead.z);
      const cliff = this.avoidCliffs && !this.inWater && !S(world, ahead.x, feet - 1, ahead.z) && !S(world, ahead.x, feet - 2, ahead.z) && !Creature.liquid(world, ahead.x, feet - 1, ahead.z);
      const water = !this.swims && Creature.liquid(world, ahead.x, feet - 1, ahead.z);
      if (wall && !tooHigh && (this.onGround || this.inWater)) {
        this.vy = HOP_SPEED; // escalón de un bloque (o salir del agua): saltito
      } else if (wall || cliff || water) {
        this.blocked = true;
      }
      if (!this.blocked || wall) {
        if (!S(world, p.x + dx, feet, p.z) && !S(world, p.x + dx, feet + 1, p.z)) p.x += dx;
        if (!S(world, p.x, feet, p.z + dz) && !S(world, p.x, feet + 1, p.z + dz)) p.z += dz;
      }
      this.walkPhase += dt * speed * 6;
    }

    // Nadar: flotar en la superficie del agua.
    this.inWater = Creature.liquid(world, p.x, p.y + 0.2, p.z);
    if (this.inWater && this.swims) {
      const surface = Math.floor(p.y + 0.2) + (Creature.liquid(world, p.x, p.y + 1.2, p.z) ? 1 : 0) + 0.75;
      if (this.vy <= 0) {
        this.vy = 0;
        p.y += (surface - p.y) * Math.min(1, dt * 4);
        this.onGround = false;
        return;
      }
    }

    // Gravedad, recorriendo todas las celdas por las que pasa al caer
    // (para no atravesar el suelo aunque el paso sea largo).
    this.vy = Math.max(-MAX_FALL, this.vy - GRAVITY * dt);
    const ny = p.y + this.vy * dt;
    if (this.vy <= 0) {
      let landed = false;
      for (let cell = Math.floor(p.y - 0.001); cell >= Math.floor(ny); cell--) {
        if (S(world, p.x, cell, p.z)) {
          p.y = cell + 1;
          landed = true;
          break;
        }
      }
      if (landed) this.vy = 0;
      else p.y = ny;
      this.onGround = landed;
    } else if (S(world, p.x, ny + this.height, p.z)) {
      this.vy = 0; // se da con la cabeza
    } else {
      p.y = ny;
      this.onGround = false;
    }
  }
}

// Los fotogramas largos se dividen en pasos de este tamaño como mucho.
export const MAX_STEP = 1 / 30;
