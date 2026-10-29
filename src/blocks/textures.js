// Generador de texturas pixel art 16×16 dibujadas por código.
// Cada textura es una función que pinta píxel a píxel con ruido determinista,
// así siempre salen iguales y no hace falta ningún archivo de imagen.

import { TEXTURE_NAMES, WOOL_COLORS, PASTEL_COLORS, TILE_COLORS } from './registry.js';

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

// Mezcla dos colores (t = 0 → a, t = 1 → b).
function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Rellena una textura con un color base y grano aleatorio.
function noisy(base, grain, seed) {
  return (x, y) => shade(base, (rand(x, y, seed) - 0.5) * grain);
}

// Elige un color de una paleta según el ruido.
function speckled(palette, seed) {
  return (x, y) => palette[Math.floor(rand(x, y, seed) * palette.length)];
}

// Vértices de una estrella de 5 puntas centrada en la textura (puntas y valles alternos).
const STAR_POINTS = Array.from({ length: 10 }, (_, i) => {
  const angle = -Math.PI / 2 + (i * Math.PI) / 5;
  const radius = i % 2 === 0 ? 7.5 : 3.2;
  return [8 + Math.cos(angle) * radius, 8.6 + Math.sin(angle) * radius];
});

// ¿El punto (x, y) está dentro del polígono? (regla par-impar)
function insidePolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const GRASS = [104, 186, 84];
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

// Hojas: píxeles con huecos transparentes (null).
function leaves(base, seed) {
  return (x, y) => {
    if (rand(x, y, seed) < 0.18) return null;
    return shade(base, (rand(x, y, seed + 1) - 0.5) * 0.45);
  };
}

// Lana: punto de tejido en zigzag.
function wool(base, seed) {
  return (x, y) => {
    const knit = (x + (y % 2)) % 2 === 0 ? 0.06 : -0.06;
    return shade(base, knit + (rand(x, y, seed) - 0.5) * 0.12);
  };
}

// Piedra lisa pastel con un marco suave.
function pastel(base, seed) {
  return (x, y) => {
    const edge = x === 0 || y === 0 || x === 15 || y === 15;
    return shade(base, (edge ? -0.08 : 0) + (rand(x, y, seed) - 0.5) * 0.06);
  };
}

// Tejas: filas de escamas redondeadas, alternadas.
function tiles(base, seed) {
  return (x, y) => {
    const row = y >> 2;
    const lx = (x + (row % 2) * 2) % 4;
    const ly = y % 4;
    const border = ly === 3 || (ly >= 2 && (lx === 0 || lx === 3));
    return shade(base, (border ? -0.28 : 0.04 - ly * 0.04) + (rand(x, y, seed) - 0.5) * 0.08);
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
  ice: (x, y) => {
    // Grietas diagonales blancas sobre azul claro.
    const crack = (x + y) % 11 === 0 || (x - y + 16) % 13 === 0;
    return crack ? [236, 248, 255] : shade([160, 206, 246], (rand(x, y, 30) - 0.5) * 0.08);
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
    if (rand(x, y, 18) < 0.16) return null;
    const flower = rand(x, y, 19) < 0.12;
    return flower ? [255, 236, 244] : shade([246, 168, 200], (rand(x, y, 20) - 0.5) * 0.3);
  },
  mushroom_cap: (x, y) => {
    // Rojo con lunares blancos.
    const cx = (x % 8) - 3.5, cy = ((y + (x >> 3) * 4) % 8) - 3.5;
    if (cx * cx + cy * cy < 4.5) return [250, 246, 240];
    return shade([214, 58, 64], (rand(x, y, 31) - 0.5) * 0.1);
  },
  mushroom_stem: (x, y) => shade([236, 226, 204], (rand(x >> 1, y, 32) - 0.5) * 0.1),
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
  cobblestone: (x, y) => {
    // Piedras redondeadas de distintos grises con juntas oscuras.
    const cell = (Math.floor((x + (y >> 2) * 3) / 5) * 7 + (y >> 2)) | 0;
    const mortar = y % 4 === 3 || (x + (y >> 2) * 3) % 5 === 4;
    if (mortar) return [84, 84, 90];
    return shade([140, 140, 146], (rand(cell, 0, 33) - 0.5) * 0.3 + (rand(x, y, 34) - 0.5) * 0.08);
  },
  white_stone: (x, y) => {
    // Sillares blancos (dos bloques por fila).
    const joint = y % 8 === 7 || (x + ((y >> 3) % 2) * 8) % 16 === 15;
    return joint ? [200, 200, 206] : shade([236, 236, 240], (rand(x, y, 35) - 0.5) * 0.06);
  },
  quartz: (x, y) => {
    const edge = x === 0 || y === 0 || x === 15 || y === 15;
    return edge ? [222, 218, 214] : shade([248, 246, 242], (rand(x, y, 36) - 0.5) * 0.03);
  },
  glass: (x, y) => {
    // Marco claro y centro transparente con un brillo.
    const edge = x === 0 || y === 0 || x === 15 || y === 15;
    if (edge) return [214, 238, 248];
    if ((x === 3 && y >= 3 && y <= 5) || (y === 3 && x >= 3 && x <= 5)) return [250, 254, 255];
    return null;
  },
  gold: (x, y) => {
    const edge = x === 0 || y === 0 || x === 15 || y === 15;
    const shine = (x + y) % 9 === 0 && rand(x, y, 37) < 0.6;
    if (shine) return [255, 252, 210];
    return shade(edge ? [214, 160, 40] : [250, 204, 60], (rand(x, y, 38) - 0.5) * 0.1);
  },
  shiny_stone: (x, y) => {
    // Piedra anaranjada con destellos en cruz de color amarillo claro.
    const sx = x % 6, sy = y % 6, cell = rand(x - sx, y - sy, 39);
    const cx = 1 + Math.floor(cell * 4), cy = 1 + Math.floor(rand(y - sy, x - sx, 39) * 4);
    const sparkle = (sx === cx && Math.abs(sy - cy) <= 1) || (sy === cy && Math.abs(sx - cx) <= 1);
    if (sparkle) return sx === cx && sy === cy ? [255, 255, 230] : [255, 236, 140];
    return shade([222, 142, 70], (rand(x >> 1, y >> 1, 40) - 0.5) * 0.3);
  },
  rainbow: (x, y) => {
    const bands = [[240, 80, 80], [250, 160, 60], [250, 226, 80], [110, 210, 100], [90, 170, 240], [170, 110, 230]];
    return shade(bands[Math.floor((y * bands.length) / 16)], (rand(x, y, 41) - 0.5) * 0.06);
  },
  rainbow_top: (x, y) => shade([255, 252, 255], (rand(x, y, 42) - 0.5) * 0.04),
  star: (x, y) => {
    // Estrella dorada de cinco puntas sobre fondo morado noche.
    if (insidePolygon(x + 0.5, y + 0.5, STAR_POINTS)) {
      return Math.hypot(x - 7.5, y - 8) < 2 ? [255, 250, 200] : [255, 214, 70];
    }
    const twinkle = rand(x, y, 43) < 0.04;
    return twinkle ? [240, 230, 255] : shade([86, 56, 150], (rand(x, y, 44) - 0.5) * 0.1);
  },
  cloud: (x, y) => {
    const puff = Math.sin(x * 0.9) + Math.cos(y * 0.8);
    return shade([250, 252, 255], puff * 0.025 - 0.02);
  },
  candy: (x, y) => ((x + y) % 8 < 4 ? [248, 112, 160] : [255, 246, 250]),
  cookie: (x, y) => {
    const chip = rand(x >> 1, y >> 1, 45) < 0.12;
    return chip ? [92, 56, 36] : shade([214, 164, 100], (rand(x, y, 46) - 0.5) * 0.15);
  },
};

for (const c of WOOL_COLORS) PAINTERS[`wool_${c.key}`] = wool(c.rgb, 50);
for (const c of PASTEL_COLORS) PAINTERS[`pastel_${c.key}`] = pastel(c.rgb, 51);
for (const c of TILE_COLORS) PAINTERS[`tiles_${c.key}`] = tiles(c.rgb, 52);

// Pinta una textura y devuelve sus píxeles RGBA (fila 0 = arriba).
export function paintTexture(name) {
  const S = TEXTURE_SIZE;
  const paint = PAINTERS[name];
  if (!paint) throw new Error(`Falta el dibujo de la textura "${name}"`);
  const data = new Uint8ClampedArray(S * S * 4);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const c = paint(x, y);
      if (c === null) continue; // transparente
      const i = (y * S + x) * 4;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
    }
  }
  return data;
}

// Todas las texturas, una tras otra, en el orden de TEXTURE_NAMES y con las
// filas invertidas (en WebGL la fila 0 es la de abajo): listo para un DataArrayTexture.
export function generateTexturePixels() {
  const S = TEXTURE_SIZE;
  const rowBytes = S * 4;
  const data = new Uint8Array(S * S * 4 * TEXTURE_NAMES.length);
  TEXTURE_NAMES.forEach((name, layer) => {
    const pixels = paintTexture(name);
    for (let y = 0; y < S; y++) {
      const to = (layer * S + (S - 1 - y)) * rowBytes;
      data.set(pixels.subarray(y * rowBytes, (y + 1) * rowBytes), to);
    }
  });
  return data;
}
