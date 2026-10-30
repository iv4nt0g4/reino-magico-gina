// Bloques en el suelo (Aventura suave): al romper un bloque sale uno pequeñito
// que gira y flota. Cuando Gina pasa cerca, vuela hacia ella y se guarda en
// su inventario con un "plin". Si la mochila está llena, se queda esperando.

import { blockMesh, allMaterials } from '../blocks/blockMesh.js';
import { IS_LIQUID } from '../blocks/registry.js';

const SIZE = 0.25;
const GRAVITY = 16;
const PICKUP_DELAY = 0.5; // segundos antes de poder recogerlo (para verlo saltar)
const ATTRACT = 2.4; // distancia a la que vuela hacia Gina
const COLLECT = 0.7;
const LIFETIME = 600; // segundos en el suelo antes de desaparecer
const MAX_DROPS = 300;

class Drop {
  constructor(id, count, x, y, z, mesh) {
    Object.assign(this, { id, count, x, y, z, mesh });
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = 3.5;
    this.vz = (Math.random() - 0.5) * 2;
    this.age = 0;
    this.spin = Math.random() * Math.PI * 2;
  }
}

export class Drops {
  constructor(scene, sounds) {
    Object.assign(this, { scene, sounds });
    this.list = [];
    this.materials = new Map();
    this.soundCooldown = 0;
  }

  // Suelta `count` bloques `id` en (x, y, z) (centro del bloque roto). Con
  // `toward` (una posición), sale disparado un poco hacia allí.
  spawn(id, count, x, y, z, toward = null) {
    if (!id || count <= 0) return;
    if (this.list.length >= MAX_DROPS) this.#remove(this.list[0]);
    const mesh = blockMesh(id, SIZE, this.materials);
    this.scene.add(mesh);
    const drop = new Drop(id, count, x, y - 0.25, z, mesh);
    if (toward) {
      const dx = toward.x - x, dz = toward.z - z;
      const len = Math.hypot(dx, dz) || 1;
      drop.vx = (dx / len) * 3;
      drop.vz = (dz / len) * 3;
    }
    this.list.push(drop);
    return drop;
  }

  #remove(drop) {
    this.scene.remove(drop.mesh);
    this.list.splice(this.list.indexOf(drop), 1);
  }

  // `inventory`: dónde guardar lo recogido (null = no se recoge, en creativo).
  update(dt, world, player, inventory, light, onCollect) {
    const l = Math.max(0.35, light);
    for (const m of allMaterials(this.materials)) m.color.setScalar(l);
    this.soundCooldown -= dt;
    const px = player.position.x, py = player.position.y + 0.8, pz = player.position.z;

    for (const d of [...this.list]) {
      d.age += dt;
      if (d.age > LIFETIME) {
        this.#remove(d);
        continue;
      }
      const dx = px - d.x, dy = py - d.y, dz = pz - d.z;
      const dist = Math.hypot(dx, dy, dz);
      const canTake = inventory && d.age > PICKUP_DELAY && inventory.canAdd(d.id);

      if (canTake && dist < COLLECT) {
        const left = inventory.add(d.id, d.count);
        onCollect?.(d.id, d.count - left);
        if (this.soundCooldown <= 0) {
          this.sounds.pickup();
          this.soundCooldown = 0.06;
        }
        if (left === 0) {
          this.#remove(d);
          continue;
        }
        d.count = left;
      }

      if (canTake && dist < ATTRACT) {
        // Vuela hacia Gina, cada vez más deprisa.
        const pull = 9 / Math.max(0.3, dist);
        d.vx = (dx / dist) * pull;
        d.vy = (dy / dist) * pull;
        d.vz = (dz / dist) * pull;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.z += d.vz * dt;
      } else {
        // Cae y se posa en el suelo (o flota en el agua).
        const here = world.getBlock(Math.floor(d.x), Math.floor(d.y + 0.1), Math.floor(d.z));
        const inWater = here > 0 && IS_LIQUID[here] === 1;
        d.vy = inWater ? Math.min(d.vy + 4 * dt, 1) : Math.max(d.vy - GRAVITY * dt, -12);
        const damp = Math.exp(-3 * dt);
        d.vx *= damp;
        d.vz *= damp;
        const nx = d.x + d.vx * dt, nz = d.z + d.vz * dt;
        if (!world.isSolid(Math.floor(nx), Math.floor(d.y), Math.floor(d.z))) d.x = nx;
        else d.vx = 0;
        if (!world.isSolid(Math.floor(d.x), Math.floor(d.y), Math.floor(nz))) d.z = nz;
        else d.vz = 0;
        const ny = d.y + d.vy * dt;
        if (d.vy < 0 && world.isSolid(Math.floor(d.x), Math.floor(ny), Math.floor(d.z))) {
          d.y = Math.floor(ny) + 1;
          d.vy = 0;
        } else if (d.vy > 0 && world.isSolid(Math.floor(d.x), Math.floor(ny + SIZE), Math.floor(d.z))) {
          d.vy = 0;
        } else {
          d.y = ny;
        }
      }

      // Gira y sube y baja un poquito.
      d.spin += dt * 1.6;
      d.mesh.position.set(d.x, d.y + SIZE / 2 + 0.08 + Math.sin(d.age * 2.5) * 0.06, d.z);
      d.mesh.rotation.y = d.spin;
    }
  }
}
