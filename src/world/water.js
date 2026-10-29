// Agua que fluye, de forma simplificada:
//  - El agua cae hacia abajo mientras haya hueco.
//  - Sobre suelo, se extiende a los lados hasta 3 bloques desde la fuente,
//    cada vez un poco más baja (niveles 1, 2 y 3).
//  - El agua que fluye y se queda sin "alimentación" (sin fuente cerca ni
//    agua encima) desaparece, así que al tapar una fuente el agua se retira.
// Solo se recalculan las celdas cercanas a un cambio, a pasos de 0,25 s.

import { BLOCK, IS_LIQUID, IS_REPLACEABLE, LIQUID_LEVEL } from '../blocks/registry.js';

const FLOW = [BLOCK.water, BLOCK.water_flow_1, BLOCK.water_flow_2, BLOCK.water_flow_3];
const MAX_LEVEL = 3;
const TICK = 0.25; // segundos entre pasos
const MAX_UPDATES = 256; // celdas por paso, para no atascar el juego
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export class WaterSimulation {
  constructor(world) {
    this.world = world;
    this.pending = new Map(); // "x,y,z" → [x, y, z]
    this.timer = 0;
  }

  // Avisa de que algo cambió en (x, y, z): se revisan la celda y sus vecinas.
  notify(x, y, z) {
    this.#add(x, y, z);
    this.#add(x, y + 1, z);
    this.#add(x, y - 1, z);
    for (const [dx, dz] of SIDES) this.#add(x + dx, y, z + dz);
  }

  update(dt) {
    this.timer += dt;
    if (this.timer < TICK) return;
    this.timer = 0;
    const cells = [...this.pending.values()].slice(0, MAX_UPDATES);
    for (const [x, y, z] of cells) this.pending.delete(`${x},${y},${z}`);
    for (const [x, y, z] of cells) this.#updateCell(x, y, z);
  }

  #add(x, y, z) {
    this.pending.set(`${x},${y},${z}`, [x, y, z]);
  }

  // ¿Se puede poner agua aquí? (aire, hierba alta o agua que fluye más baja)
  #canFill(id, level) {
    if (id === 0 || (IS_REPLACEABLE[id] && !IS_LIQUID[id])) return true;
    return IS_LIQUID[id] && LIQUID_LEVEL[id] > level;
  }

  #set(x, y, z, id) {
    if (this.world.setBlock(x, y, z, id)) this.notify(x, y, z);
  }

  #updateCell(x, y, z) {
    const world = this.world;
    const id = world.getBlock(x, y, z);
    if (id < 0 || !IS_LIQUID[id]) return;
    let level = LIQUID_LEVEL[id];

    // 1) El agua que fluye necesita alimentación: agua encima o una vecina más alta.
    if (level > 0) {
      const above = world.getBlock(x, y + 1, z);
      let best = IS_LIQUID[above] ? 0 : MAX_LEVEL + 1; // con agua encima cuenta como recién caída
      for (const [dx, dz] of SIDES) {
        const n = world.getBlock(x + dx, y, z + dz);
        if (IS_LIQUID[n]) best = Math.min(best, LIQUID_LEVEL[n]);
      }
      const wanted = best + 1;
      if (wanted > MAX_LEVEL) {
        this.#set(x, y, z, 0); // se seca
        return;
      }
      if (wanted !== level) {
        this.#set(x, y, z, FLOW[wanted]);
        level = wanted;
      }
    }

    // 2) Caer: si debajo hay hueco, el agua baja y no se extiende a los lados.
    const below = world.getBlock(x, y - 1, z);
    if (below >= 0 && this.#canFill(below, 1)) {
      this.#set(x, y - 1, z, FLOW[1]);
      return;
    }
    if (IS_LIQUID[below]) return; // ya cae sobre agua

    // 3) Extenderse a los lados.
    if (level >= MAX_LEVEL) return;
    for (const [dx, dz] of SIDES) {
      const n = world.getBlock(x + dx, y, z + dz);
      if (n >= 0 && this.#canFill(n, level + 1)) this.#set(x + dx, y, z + dz, FLOW[level + 1]);
    }
  }
}
