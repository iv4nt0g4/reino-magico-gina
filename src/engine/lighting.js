// Iluminación por bloques (se ejecuta en los workers).
//
// Se trabaja sobre una "región": el chunk que se va a mallar más sus 8
// vecinos (48×48 columnas), con una capa extra por debajo (roca) y otra por
// encima (aire). Así la luz que viene de un chunk vecino (una antorcha al otro
// lado del borde, o el cielo que entra por una cueva) llega bien, porque la
// luz recorre como mucho 15 bloques.
//
// Dos tipos de luz, de 0 a 15:
//  - Luz de cielo: baja en vertical sin perder intensidad por el aire y luego
//    se reparte a los lados perdiendo 1 por bloque. De noche se oscurece en el
//    shader, no aquí, para no tener que recalcular nada al cambiar la hora.
//  - Luz de bloque: sale de antorchas, farolillos y bloques mágicos.

import { CHUNK_SIZE, CHUNK_HEIGHT } from './constants.js';
import { LIGHT_OPACITY, LIGHT_EMISSION, BLOCK } from '../blocks/registry.js';

export const REGION = CHUNK_SIZE * 3; // 48
export const REGION_HEIGHT = CHUNK_HEIGHT + 2; // + suelo y techo extra
export const STRIDE_Z = REGION;
export const STRIDE_Y = REGION * REGION;
export const REGION_VOLUME = STRIDE_Y * REGION_HEIGHT;

// Índice en la región (x, z de 0 a 47; y del mundo de -1 a 128).
export function regionIndex(x, y, z) {
  return (y + 1) * STRIDE_Y + z * STRIDE_Z + x;
}

// Junta los 9 chunks (ordenados por filas: dz = -1, 0, 1 y dentro dx = -1, 0, 1).
export function buildRegion(chunks) {
  const region = new Uint8Array(REGION_VOLUME);
  region.fill(BLOCK.stone, 0, STRIDE_Y); // capa de roca bajo el mundo
  chunks.forEach((blocks, k) => {
    const x0 = (k % 3) * CHUNK_SIZE;
    const z0 = Math.floor(k / 3) * CHUNK_SIZE;
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const from = (y * CHUNK_SIZE + z) * CHUNK_SIZE;
        region.set(blocks.subarray(from, from + CHUNK_SIZE), regionIndex(x0, y, z0 + z));
      }
    }
  });
  return region;
}

const NEIGHBORS = [1, -1, STRIDE_Z, -STRIDE_Z, STRIDE_Y, -STRIDE_Y];

// Reparte la luz desde las semillas. `buckets[n]` guarda las celdas con luz n;
// se procesan de más luz a menos, así cada celda recibe su valor definitivo
// la primera vez que se alcanza.
function propagate(region, light, buckets) {
  for (let level = 15; level > 1; level--) {
    const bucket = buckets[level];
    for (let k = 0; k < bucket.length; k++) {
      const i = bucket[k];
      if (light[i] !== level) continue; // ya mejorada por otra fuente
      const x = i % REGION;
      const z = Math.floor(i / STRIDE_Z) % REGION;
      const y = Math.floor(i / STRIDE_Y);
      for (let d = 0; d < 6; d++) {
        // No salirse de la región.
        if ((d === 0 && x === REGION - 1) || (d === 1 && x === 0)) continue;
        if ((d === 2 && z === REGION - 1) || (d === 3 && z === 0)) continue;
        if ((d === 4 && y === REGION_HEIGHT - 1) || (d === 5 && y === 0)) continue;
        const n = i + NEIGHBORS[d];
        const opacity = LIGHT_OPACITY[region[n]];
        if (opacity >= 15) continue;
        const next = level - 1 - opacity;
        if (next > light[n]) {
          light[n] = next;
          if (next > 1) buckets[next].push(n);
        }
      }
    }
  }
}

const newBuckets = () => Array.from({ length: 16 }, () => []);

export function computeLight(region) {
  const sky = new Uint8Array(REGION_VOLUME);
  const block = new Uint8Array(REGION_VOLUME);

  // --- Luz de cielo: columnas de arriba abajo ---
  let highestShadow = 0; // altura máxima a la que hay algo que da sombra
  for (let z = 0; z < REGION; z++) {
    for (let x = 0; x < REGION; x++) {
      let value = 15;
      for (let y = REGION_HEIGHT - 1; y >= 0; y--) {
        const i = y * STRIDE_Y + z * STRIDE_Z + x;
        value -= LIGHT_OPACITY[region[i]];
        if (value < 15 && y > highestShadow) highestShadow = y;
        if (value <= 0) break;
        sky[i] = value;
      }
    }
  }
  // Semillas: celdas iluminadas junto a otras más oscuras. Por encima de la
  // sombra más alta todo tiene luz 15 y no hay nada que repartir.
  const skyBuckets = newBuckets();
  const seedTop = Math.min(highestShadow + 1, REGION_HEIGHT - 1);
  for (let y = 0; y <= seedTop; y++) {
    for (let z = 0; z < REGION; z++) {
      for (let x = 0; x < REGION; x++) {
        const i = y * STRIDE_Y + z * STRIDE_Z + x;
        const level = sky[i];
        if (level < 2) continue;
        const darker =
          (x > 0 && sky[i - 1] < level - 1 && LIGHT_OPACITY[region[i - 1]] < 15) ||
          (x < REGION - 1 && sky[i + 1] < level - 1 && LIGHT_OPACITY[region[i + 1]] < 15) ||
          (z > 0 && sky[i - STRIDE_Z] < level - 1 && LIGHT_OPACITY[region[i - STRIDE_Z]] < 15) ||
          (z < REGION - 1 && sky[i + STRIDE_Z] < level - 1 && LIGHT_OPACITY[region[i + STRIDE_Z]] < 15) ||
          (y > 0 && sky[i - STRIDE_Y] < level - 1 && LIGHT_OPACITY[region[i - STRIDE_Y]] < 15);
        if (darker) skyBuckets[level].push(i);
      }
    }
  }
  propagate(region, sky, skyBuckets);

  // --- Luz de bloque: desde cada bloque que brilla ---
  const blockBuckets = newBuckets();
  for (let i = 0; i < REGION_VOLUME; i++) {
    const emission = LIGHT_EMISSION[region[i]];
    if (emission > 0) {
      block[i] = emission;
      blockBuckets[emission].push(i);
    }
  }
  propagate(region, block, blockBuckets);

  return { sky, block };
}
