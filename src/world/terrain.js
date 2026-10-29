// Terreno procedural básico (fase 1): colinas suaves, montañas con nieve y
// zonas bajas de arena. Alrededor del punto de aparición el terreno se aplana
// para dejar sitio a la ciudad de las fases siguientes.
// Es determinista: la misma semilla genera siempre el mismo mundo.

import { createNoise2D } from 'simplex-noise';
import { CHUNK_SIZE, CHUNK_HEIGHT, CHUNK_VOLUME, blockIndex } from '../engine/constants.js';
import { BLOCK } from '../blocks/registry.js';

export const CITY_LEVEL = 42; // altura del suelo de la ciudad
const CITY_RADIUS = 90; // radio totalmente llano
const CITY_BLEND = 90; // distancia de transición hasta el terreno natural
const BEACH_LEVEL = 36; // por debajo, arena
const SNOW_LEVEL = 86; // por encima, nieve

// Generador pseudoaleatorio con semilla (mulberry32).
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function createTerrain(seed) {
  const random = mulberry32(seed);
  const continentNoise = createNoise2D(random);
  const hillNoise = createNoise2D(random);
  const mountainNoise = createNoise2D(random);
  const detailNoise = createNoise2D(random);

  // Ruido fractal: suma de octavas.
  function fbm(noise, x, z, octaves) {
    let sum = 0, amp = 1, freq = 1, norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += noise(x * freq, z * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  }

  // Altura del terreno (y del bloque superficial) en una columna del mundo.
  function heightAt(x, z) {
    const continent = fbm(continentNoise, x / 600, z / 600, 3); // -1..1
    const hills = fbm(hillNoise, x / 140, z / 140, 4);
    // Ruido "en cresta" para montañas, solo donde el continente es alto.
    const ridge = 1 - Math.abs(fbm(mountainNoise, x / 260, z / 260, 4));
    const mountainMask = smoothstep(0.05, 0.5, continent);

    let h = 46 + continent * 14 + hills * 9 + ridge * ridge * mountainMask * 55;

    // Aplanar la zona de la ciudad.
    const d = Math.hypot(x, z);
    h = CITY_LEVEL + (h - CITY_LEVEL) * smoothstep(CITY_RADIUS, CITY_RADIUS + CITY_BLEND, d);

    return Math.max(4, Math.min(CHUNK_HEIGHT - 8, Math.floor(h)));
  }

  // Rellena un chunk completo con bloques.
  function generateChunk(cx, cz) {
    const blocks = new Uint8Array(CHUNK_VOLUME);
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;
        const h = heightAt(wx, wz);
        const detail = detailNoise(wx / 24, wz / 24);

        let surface, under;
        if (h >= SNOW_LEVEL + 12 + detail * 4) {
          surface = BLOCK.snow;
          under = BLOCK.snow;
        } else if (h >= SNOW_LEVEL + detail * 4) {
          surface = BLOCK.snowy_grass;
          under = BLOCK.dirt;
        } else if (h <= BEACH_LEVEL) {
          surface = detail > 0.55 ? BLOCK.gravel : BLOCK.sand;
          under = surface;
        } else {
          surface = BLOCK.grass;
          under = BLOCK.dirt;
        }

        for (let y = 0; y <= h; y++) {
          let id = BLOCK.stone;
          if (y === h) id = surface;
          else if (y >= h - 3) id = under;
          blocks[blockIndex(lx, y, lz)] = id;
        }
      }
    }
    return blocks;
  }

  return { heightAt, generateChunk };
}
