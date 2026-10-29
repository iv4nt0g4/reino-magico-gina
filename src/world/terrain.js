// Terreno procedural: praderas con flores, bosques, arboledas de cerezos,
// playas, lagos y montañas nevadas. Alrededor del punto de aparición el
// terreno se aplana y se deja sin árboles para la ciudad de las fases siguientes.
// Es determinista: la misma semilla genera siempre el mismo mundo, y cada
// chunk se puede generar por separado (los árboles que cruzan el borde de un
// chunk se dibujan igual desde los dos lados).

import { createNoise2D } from 'simplex-noise';
import { CHUNK_SIZE, CHUNK_HEIGHT, CHUNK_VOLUME, blockIndex } from '../engine/constants.js';
import { BLOCK } from '../blocks/registry.js';

export const CITY_LEVEL = 42; // altura del suelo de la ciudad
export const SEA_LEVEL = 34; // por debajo, agua
const CITY_RADIUS = 90; // radio totalmente llano
const CITY_BLEND = 90; // distancia de transición hasta el terreno natural
const CITY_NO_TREES = CITY_RADIUS + 40; // sin árboles dentro de este radio
const BEACH_LEVEL = SEA_LEVEL + 1; // hasta aquí, arena
const SNOW_LEVEL = 86; // por encima, nieve
const TREE_MARGIN = 3; // radio máximo de copa: columnas vecinas a revisar

// Biomas (fuera de playas, agua y montañas nevadas).
const PLAINS = 0;
const FOREST = 1;
const CHERRY = 2;

// Generador pseudoaleatorio con semilla (mulberry32).
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Número aleatorio determinista para una columna (x, z) y un "canal".
function hash2(x, z, salt) {
  let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(salt, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
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
  const humidityNoise = createNoise2D(random);
  const warmthNoise = createNoise2D(random);
  const salt = seed | 0;

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
    // Las zonas bajas del continente se hunden un poco más: lagos y mares.
    const lowlands = smoothstep(-0.2, -0.55, continent) * 10;

    let h = 46 + continent * 14 + hills * 9 + ridge * ridge * mountainMask * 55 - lowlands;

    // Aplanar la zona de la ciudad.
    const d = Math.hypot(x, z);
    h = CITY_LEVEL + (h - CITY_LEVEL) * smoothstep(CITY_RADIUS, CITY_RADIUS + CITY_BLEND, d);

    return Math.max(4, Math.min(CHUNK_HEIGHT - 20, Math.floor(h)));
  }

  function biomeAt(x, z) {
    const humidity = fbm(humidityNoise, x / 420, z / 420, 2);
    const warmth = fbm(warmthNoise, x / 520, z / 520, 2);
    if (humidity > 0.18) return FOREST;
    if (warmth > 0.2 && humidity > -0.25) return CHERRY;
    return PLAINS;
  }

  // ¿Crece un árbol con el tronco en esta columna? Devuelve su tipo o null.
  function treeAt(x, z, h) {
    if (h <= BEACH_LEVEL || h >= SNOW_LEVEL - 4) return null;
    if (Math.hypot(x, z) < CITY_NO_TREES) return null;
    const biome = biomeAt(x, z);
    const density = biome === FOREST ? 0.045 : biome === CHERRY ? 0.02 : 0.0025;
    if (hash2(x, z, salt + 1) >= density) return null;
    if (biome === CHERRY) return 'cherry';
    if (biome === FOREST && hash2(x, z, salt + 2) < 0.35) return 'birch';
    return 'oak';
  }

  // Dibuja un árbol en el chunk (solo los bloques que caen dentro).
  function placeTree(blocks, cx, cz, tx, ty, tz, type) {
    const r = hash2(tx, tz, salt + 3);
    const set = (wx, wy, wz, id, onlyAir) => {
      const lx = wx - cx * CHUNK_SIZE;
      const lz = wz - cz * CHUNK_SIZE;
      if (lx < 0 || lz < 0 || lx >= CHUNK_SIZE || lz >= CHUNK_SIZE || wy < 0 || wy >= CHUNK_HEIGHT) return;
      const i = blockIndex(lx, wy, lz);
      if (onlyAir && blocks[i] !== 0 && blocks[i] !== BLOCK.tall_grass) return;
      blocks[i] = id;
    };

    const log = BLOCK[`${type}_log`];
    const leaves = BLOCK[`${type}_leaves`];
    const height = type === 'birch' ? 6 + Math.floor(r * 2) : type === 'cherry' ? 5 + Math.floor(r * 2) : 4 + Math.floor(r * 3);
    const top = ty + height;
    const radius = type === 'cherry' ? 3 : 2;

    // Copa: capas de hojas que se estrechan hacia arriba, con esquinas recortadas al azar.
    for (let y = top - 3; y <= top + 1; y++) {
      const layer = y - top;
      const rad = layer >= 0 ? radius - 1 : layer === -3 && type !== 'cherry' ? radius - 1 : radius;
      for (let dz = -rad; dz <= rad; dz++) {
        for (let dx = -rad; dx <= rad; dx++) {
          const corner = Math.abs(dx) === rad && Math.abs(dz) === rad;
          if (corner && (layer >= 0 || hash2(tx + dx * 7, tz + dz * 13, salt + y) < 0.5)) continue;
          if (type === 'cherry' && dx * dx + dz * dz > rad * rad + 1) continue;
          set(tx + dx, y, tz + dz, leaves, true);
        }
      }
    }
    // Tronco (por encima de las hojas que lo rodean).
    for (let y = ty + 1; y <= top; y++) set(tx, y, tz, log, false);
    set(tx, ty, tz, BLOCK.dirt, false); // bajo el tronco, tierra
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
        } else if (h < SEA_LEVEL) {
          surface = detail > 0.4 ? BLOCK.gravel : BLOCK.sand; // fondo de lagos y mar
          under = BLOCK.sand;
        } else if (h <= BEACH_LEVEL) {
          surface = BLOCK.sand;
          under = BLOCK.sand;
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
        // Agua hasta el nivel del mar.
        for (let y = h + 1; y <= SEA_LEVEL; y++) blocks[blockIndex(lx, y, lz)] = BLOCK.water;

        // Plantas sobre la hierba.
        if (surface === BLOCK.grass) {
          const plant = plantAt(wx, wz);
          if (plant) blocks[blockIndex(lx, h + 1, lz)] = plant;
        }
      }
    }

    // Árboles: también los de columnas vecinas cuya copa entra en este chunk.
    for (let wz = cz * CHUNK_SIZE - TREE_MARGIN; wz < (cz + 1) * CHUNK_SIZE + TREE_MARGIN; wz++) {
      for (let wx = cx * CHUNK_SIZE - TREE_MARGIN; wx < (cx + 1) * CHUNK_SIZE + TREE_MARGIN; wx++) {
        const h = heightAt(wx, wz);
        const type = treeAt(wx, wz, h);
        if (type) placeTree(blocks, cx, cz, wx, h, wz, type);
      }
    }
    return blocks;
  }

  // Flor o hierba alta en una columna de hierba (o nada).
  function plantAt(x, z) {
    const r = hash2(x, z, salt + 4);
    const biome = biomeAt(x, z);
    // Las flores aparecen en manchas, como en un prado de verdad.
    const patch = detailNoise(x / 9 + 100, z / 9) > 0.35;
    if (biome === CHERRY) {
      if (r < 0.04) return BLOCK.flower_pink;
      if (r < 0.06) return BLOCK.flower_white;
      return r < 0.16 ? BLOCK.tall_grass : 0;
    }
    if (biome === PLAINS && patch && r < 0.18) {
      const flowers = [BLOCK.flower_red, BLOCK.flower_yellow, BLOCK.flower_blue, BLOCK.flower_pink, BLOCK.flower_white];
      return flowers[Math.floor(hash2(x >> 3, z >> 3, salt + 5) * flowers.length)]; // un color por mancha
    }
    if (r < (biome === FOREST ? 0.12 : 0.2)) return BLOCK.tall_grass;
    if (r < 0.205) return BLOCK.flower_yellow;
    return 0;
  }

  return { heightAt, generateChunk };
}
