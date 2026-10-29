// Generador de texturas pixel art 16×16 dibujadas por código.
// Cada textura es una función que pinta píxel a píxel con ruido determinista,
// así siempre salen iguales y no hace falta ningún archivo de imagen.

import { TEXTURE_NAMES } from './registry.js';

export const TEXTURE_SIZE = 16;

// Hash entero → [0, 1). Determinista para cada (x, y, semilla).
function rand(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Varía el brillo de un color [r, g, b] en ±amount.
function shade([r, g, b], amount) {
  const k = 1 + amount;
  return [r * k, g * k, b * k];
}

// Rellena una textura con un color base y grano aleatorio.
function noisy(base, grain, seed) {
  return (x, y) => shade(base, (rand(x, y, seed) - 0.5) * grain);
}

// Elige un color de una paleta según el ruido.
function speckled(palette, seed) {
  return (x, y) => palette[Math.floor(rand(x, y, seed) * palette.length)];
}

const GRASS = [104, 186, 84];
const DIRT = [134, 96, 67];
const SNOW = [244, 250, 255];

const grassTop = noisy(GRASS, 0.35, 1);
const dirt = speckled([[134, 96, 67], [121, 85, 58], [150, 108, 76], [110, 78, 54]], 2);
const snow = noisy(SNOW, 0.06, 7);

// Corteza vertical: franjas de color con vetas.
function bark(base, dark, seed) {
  return (x, y) => {
    const stripe = rand(x, 0, seed) < 0.3 || rand(x, y >> 2, seed + 1) < 0.12;
    return shade(stripe ? dark : base, (rand(x, y, seed + 2) - 0.5) * 0.15);
  };
}

// Hojas: píxeles con huecos transparentes (alpha 0).
function leaves(base, seed) {
  return (x, y) => {
    const r = rand(x, y, seed);
    if (r < 0.18) return null;
    return shade(base, (rand(x, y, seed + 1) - 0.5) * 0.45);
  };
}

const PAINTERS = {
  grass_top: grassTop,
  grass_side: (x, y) => {
    // Borde de hierba irregular sobre la tierra.
    const edge = 3 + Math.floor(rand(x, 0, 3) * 3);
    return y < edge ? grassTop(x, y) : dirt(x, y);
  },
  dirt,
  stone: (x, y) => {
    const crack = rand(x >> 1, y >> 1, 4) < 0.12;
    return shade(crack ? [112, 112, 118] : [138, 138, 144], (rand(x, y, 5) - 0.5) * 0.2);
  },
  sand: noisy([226, 210, 152], 0.14, 6),
  gravel: speckled([[136, 128, 126], [110, 104, 104], [160, 152, 148], [92, 88, 90]], 8),
  snow,
  snow_side: (x, y) => {
    const edge = 4 + Math.floor(rand(x, 0, 9) * 3);
    return y < edge ? snow(x, y) : dirt(x, y);
  },
  log_top: (x, y) => {
    // Anillos concéntricos.
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    if (d > 6.5) return shade([98, 74, 46], (rand(x, y, 10) - 0.5) * 0.2);
    const ring = Math.floor(d) % 2 === 0;
    return shade(ring ? [176, 142, 92] : [156, 122, 76], (rand(x, y, 11) - 0.5) * 0.1);
  },
  oak_log: bark([112, 84, 52], [86, 64, 40], 12),
  oak_leaves: leaves([72, 150, 62], 13),
  birch_log: (x, y) => {
    const mark = rand(x >> 1, y, 14) < 0.12;
    return shade(mark ? [60, 58, 54] : [232, 228, 218], (rand(x, y, 15) - 0.5) * 0.1);
  },
  birch_leaves: leaves([128, 178, 82], 16),
  cherry_log: bark([92, 54, 62], [70, 40, 48], 17),
  cherry_leaves: (x, y) => {
    const r = rand(x, y, 18);
    if (r < 0.16) return null;
    const flower = rand(x, y, 19) < 0.12;
    return flower ? [255, 236, 244] : shade([246, 168, 200], (rand(x, y, 20) - 0.5) * 0.3);
  },
  planks: (x, y) => {
    // Cuatro tablas horizontales con juntas oscuras.
    if (y % 4 === 3) return [128, 94, 56];
    const offset = (y >> 2) % 2 ? 8 : 0;
    if ((x + offset) % 16 === 0) return [140, 104, 62];
    return shade([182, 140, 88], (rand(x, y >> 2, 21) - 0.5) * 0.12 + (rand(x, y, 22) - 0.5) * 0.06);
  },
  bricks: (x, y) => {
    const row = y >> 2;
    const offset = row % 2 ? 4 : 0;
    if (y % 4 === 3 || (x + offset) % 8 === 7) return [206, 198, 188];
    return shade([176, 82, 70], (rand(x, y, 23) - 0.5) * 0.2);
  },
};

// Devuelve los píxeles RGBA de todas las texturas, una tras otra, en el
// orden de TEXTURE_NAMES (listo para un DataArrayTexture).
export function generateTexturePixels() {
  const S = TEXTURE_SIZE;
  const data = new Uint8Array(S * S * 4 * TEXTURE_NAMES.length);
  TEXTURE_NAMES.forEach((name, layer) => {
    const paint = PAINTERS[name];
    if (!paint) throw new Error(`Falta el dibujo de la textura "${name}"`);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const c = paint(x, y);
        // La fila 0 de la textura es la parte de abajo (convención de WebGL).
        const i = (layer * S * S + (S - 1 - y) * S + x) * 4;
        if (c === null) continue; // transparente
        data[i] = Math.max(0, Math.min(255, c[0]));
        data[i + 1] = Math.max(0, Math.min(255, c[1]));
        data[i + 2] = Math.max(0, Math.min(255, c[2]));
        data[i + 3] = 255;
      }
    }
  });
  return data;
}
