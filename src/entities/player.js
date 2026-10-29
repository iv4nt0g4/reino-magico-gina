// Jugador: posición, cámara y física (gravedad, salto y colisiones AABB
// contra los bloques), con las sensaciones del género: salto de 1,25
// bloques, caminar ~4,3 b/s, correr ~5,6 b/s, agacharse sin caer por bordes
// y, en modo creativo, volar con doble Espacio.

import { BLOCKS, IS_LIQUID } from '../blocks/registry.js';

const WIDTH = 0.6;
const HEIGHT = 1.8;
const EYE_HEIGHT = 1.62;
const HALF = WIDTH / 2;
const EPS = 1e-4;
const SNEAK_PROBE = 0.6; // al agacharse, profundidad máxima que se permite bajar

export class Player {
  constructor(settings) {
    this.settings = settings;
    this.position = { x: 0.5, y: 80, z: 0.5 }; // centro de los pies
    this.previous = { ...this.position }; // para interpolar el dibujado
    this.velocity = { x: 0, y: 0, z: 0 };
    this.yaw = 0; // 0 = mirando hacia -Z
    this.pitch = 0;
    this.onGround = false;
    this.sneaking = false;
    this.sprinting = false;
    this.flying = false;
    this.inWater = false; // el cuerpo está en el agua
    this.headInWater = false; // la cámara está bajo el agua
    this.hitWall = false; // en el último paso chocó de lado con algo
    this.canFly = true; // modo creativo (la "Aventura suave" llega en la fase 8)
    this.eyeOffset = EYE_HEIGHT;
    this.stepDistance = 0; // recorrido desde el último paso
    this.events = []; // { type: 'step' | 'land', block, speed? } para los sonidos
  }

  spawnAt(x, y, z) {
    this.position = { x, y, z };
    this.previous = { x, y, z };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.flying = false;
  }

  // Girar un ángulo dado (en radianes), por ejemplo con las flechas.
  turn(dYaw, dPitch) {
    this.yaw += dYaw;
    this.pitch = Math.max(-Math.PI / 2 + 0.001, Math.min(Math.PI / 2 - 0.001, this.pitch + dPitch));
  }

  look(dx, dy) {
    const s = this.settings.mouseSensitivity;
    this.yaw -= dx * s;
    this.pitch = Math.max(-Math.PI / 2 + 0.001, Math.min(Math.PI / 2 - 0.001, this.pitch - dy * s));
  }

  // Un paso fijo de física.
  step(dt, input, world) {
    const S = this.settings;
    this.previous = { ...this.position };

    // --- Estado de movimiento ---
    if (input.flyToggle && this.canFly) {
      this.flying = !this.flying;
      this.velocity.y = 0;
    }
    this.sneaking = input.sneak && !this.flying; // volando, Shift sirve para bajar
    if (input.sprint && input.forward > 0 && !this.sneaking) this.sprinting = true;
    if (input.forward <= 0 || this.sneaking) this.sprinting = false;
    let speed = this.sneaking ? S.sneakSpeed : this.sprinting ? S.sprintSpeed : S.walkSpeed;
    if (this.flying) speed = this.sprinting ? S.flySprintSpeed : S.flySpeed;
    else if (this.inWater) speed *= S.swimSpeedFactor;
    const swimming = this.inWater && !this.flying;

    // --- Velocidad horizontal deseada según la orientación ---
    let fx = 0, fz = 0;
    if (input.forward || input.strafe) {
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      // Adelante = (-sin, -cos); derecha = (cos, -sin)
      fx = -sin * input.forward + cos * input.strafe;
      fz = -cos * input.forward - sin * input.strafe;
      const len = Math.hypot(fx, fz);
      fx = (fx / len) * speed;
      fz = (fz / len) * speed;
    }
    const control = this.flying ? S.flyControl : swimming ? S.swimControl : this.onGround ? S.groundControl : S.airControl;
    const k = 1 - Math.exp(-control * dt);
    this.velocity.x += (fx - this.velocity.x) * k;
    this.velocity.z += (fz - this.velocity.z) * k;

    // --- Gravedad y salto (o subir/bajar volando) ---
    let dy;
    if (this.flying) {
      const vertical = ((input.jump ? 1 : 0) - (input.sneak ? 1 : 0)) * S.flyVerticalSpeed;
      this.velocity.y += (vertical - this.velocity.y) * k;
      dy = this.velocity.y * dt;
    } else if (swimming) {
      // Nadar: Espacio sube, si no se hunde despacio. Saltando contra la orilla, sale del agua.
      if (input.jump && this.hitWall) {
        this.velocity.y = Math.max(this.velocity.y, S.swimExitSpeed);
      } else {
        const target = input.jump ? S.swimUpSpeed : -S.sinkSpeed;
        this.velocity.y += (target - this.velocity.y) * k;
      }
      dy = this.velocity.y * dt;
    } else {
      if (input.jump && this.onGround) {
        this.velocity.y = Math.sqrt(2 * S.gravity * S.jumpHeight);
        this.onGround = false;
      }
      const vy0 = this.velocity.y;
      this.velocity.y = Math.max(-S.terminalVelocity, vy0 - S.gravity * dt);
      // Media de la velocidad inicial y final: trayectoria exacta (salto de 1,25 justos).
      dy = ((vy0 + this.velocity.y) / 2) * dt;
    }

    // --- Movimiento con colisiones, eje a eje ---
    let dx = this.velocity.x * dt;
    let dz = this.velocity.z * dt;

    // Agachado en el suelo: no dejar que se salga de un borde.
    if (this.sneaking && this.onGround) [dx, dz] = this.#clampToEdge(dx, dz, world);

    const wasOnGround = this.onGround;
    const fallSpeed = -this.velocity.y;
    const movedY = this.#sweep(1, dy, world);
    this.position.y += movedY;
    this.onGround = dy < 0 && movedY > dy;
    if (movedY !== dy) this.velocity.y = 0;

    if (this.onGround) {
      this.flying = false; // al tocar el suelo se deja de volar, como en el original
      const below = this.blockBelow(world);
      if (!wasOnGround && !this.inWater) {
        this.events.push({ type: 'land', block: below, speed: fallSpeed });
        // Rebote en la nube (agachada no rebota, para poder quedarse encima).
        if (BLOCKS[below]?.bounce && !this.sneaking && fallSpeed > S.minBounceSpeed) {
          this.velocity.y = fallSpeed * S.bounceFactor;
          this.onGround = false;
        }
      }
    }

    const movedX = this.#sweep(0, dx, world);
    this.position.x += movedX;
    if (movedX !== dx) this.velocity.x = 0;

    const movedZ = this.#sweep(2, dz, world);
    this.position.z += movedZ;
    if (movedZ !== dz) this.velocity.z = 0;

    this.hitWall = movedX !== dx || movedZ !== dz;

    // ¿En el agua? (pies o cintura, y la cámara para teñir la vista)
    const wasInWater = this.inWater;
    const p = this.position;
    const liquidAt = (y) => IS_LIQUID[Math.max(0, world.getBlock(Math.floor(p.x), Math.floor(y), Math.floor(p.z)))] === 1;
    this.inWater = liquidAt(p.y + 0.1) || liquidAt(p.y + 0.9);
    this.headInWater = liquidAt(p.y + this.eyeOffset);
    if (this.inWater && !wasInWater && fallSpeed > 3) this.events.push({ type: 'splash', speed: fallSpeed });

    // Pasos: un sonido cada cierta distancia caminada por el suelo.
    if (this.onGround && !this.inWater) {
      this.stepDistance += Math.hypot(movedX, movedZ);
      if (this.stepDistance > S.stepDistance) {
        this.stepDistance = 0;
        this.events.push({ type: 'step', block: this.blockBelow(world), quiet: this.sneaking });
      }
    }

    // Chocar de frente contra una pared corta la carrera.
    if (this.sprinting && (movedX !== dx || movedZ !== dz) && Math.hypot(movedX, movedZ) < 0.5 * Math.hypot(dx, dz)) {
      this.sprinting = false;
    }

    // Cámara: baja suavemente al agacharse.
    const targetEye = EYE_HEIGHT - (this.sneaking ? S.sneakEyeDrop : 0);
    this.eyeOffset += (targetEye - this.eyeOffset) * (1 - Math.exp(-20 * dt));
  }

  // Bloque sobre el que está de pie (0 si ninguno).
  blockBelow(world) {
    const id = world.getBlock(Math.floor(this.position.x), Math.floor(this.position.y - 0.05), Math.floor(this.position.z));
    return Math.max(0, id);
  }

  // ¿El jugador ocupa la celda (x, y, z)? Para no colocar bloques dentro de él.
  intersectsBlock(x, y, z) {
    const [x0, y0, z0, x1, y1, z1] = this.#box();
    return x0 < x + 1 && x1 > x && y0 < y + 1 && y1 > y && z0 < z + 1 && z1 > z;
  }

  // Caja del jugador desplazada (dx, dy, dz).
  #box(dx = 0, dy = 0, dz = 0) {
    const p = this.position;
    return [p.x - HALF + dx, p.y + dy, p.z - HALF + dz, p.x + HALF + dx, p.y + HEIGHT + dy, p.z + HALF + dz];
  }

  // ¿Hay algún bloque sólido dentro de la caja?
  #collides(box, world) {
    const [x0, y0, z0, x1, y1, z1] = box;
    for (let y = Math.floor(y0 + EPS); y <= Math.floor(y1 - EPS); y++) {
      for (let z = Math.floor(z0 + EPS); z <= Math.floor(z1 - EPS); z++) {
        for (let x = Math.floor(x0 + EPS); x <= Math.floor(x1 - EPS); x++) {
          if (world.isSolid(x, y, z)) return true;
        }
      }
    }
    return false;
  }

  // Cuánto puede moverse en un eje antes de chocar (devuelve el desplazamiento permitido).
  #sweep(axis, delta, world) {
    if (delta === 0) return 0;
    const box = this.#box();
    const lo = box[axis], hi = box[axis + 3];
    // Celdas a recorrer en el eje del movimiento.
    const from = delta > 0 ? Math.floor(hi - EPS) + 1 : Math.floor(lo + EPS) - 1;
    const to = delta > 0 ? Math.floor(hi + delta - EPS) : Math.floor(lo + delta + EPS);
    const dir = delta > 0 ? 1 : -1;
    // Celdas cubiertas en los otros dos ejes.
    const a1 = (axis + 1) % 3, a2 = (axis + 2) % 3;
    const r1 = [Math.floor(box[a1] + EPS), Math.floor(box[a1 + 3] - EPS)];
    const r2 = [Math.floor(box[a2] + EPS), Math.floor(box[a2 + 3] - EPS)];
    const cell = [0, 0, 0];

    for (let c = from; dir > 0 ? c <= to : c >= to; c += dir) {
      cell[axis] = c;
      for (let i = r1[0]; i <= r1[1]; i++) {
        cell[a1] = i;
        for (let j = r2[0]; j <= r2[1]; j++) {
          cell[a2] = j;
          if (world.isSolid(cell[0], cell[1], cell[2])) {
            // Detenerse justo en la cara del bloque.
            return dir > 0 ? c - hi : c + 1 - lo;
          }
        }
      }
    }
    return delta;
  }

  // Reduce el movimiento horizontal hasta que quede suelo bajo los pies.
  #clampToEdge(dx, dz, world) {
    const STEP = 0.05;
    const hasGround = (ox, oz) => this.#collides(this.#box(ox, -SNEAK_PROBE, oz), world);
    const shrink = (v) => (Math.abs(v) < STEP ? 0 : v - Math.sign(v) * STEP);
    while (dx !== 0 && !hasGround(dx, 0)) dx = shrink(dx);
    while (dz !== 0 && !hasGround(0, dz)) dz = shrink(dz);
    while (dx !== 0 && dz !== 0 && !hasGround(dx, dz)) {
      dx = shrink(dx);
      dz = shrink(dz);
    }
    return [dx, dz];
  }

  // Posición de la cámara interpolada entre los dos últimos pasos de física.
  eyePosition(alpha) {
    const p = this.position, q = this.previous;
    return {
      x: q.x + (p.x - q.x) * alpha,
      y: q.y + (p.y - q.y) * alpha + this.eyeOffset,
      z: q.z + (p.z - q.z) * alpha,
    };
  }
}
