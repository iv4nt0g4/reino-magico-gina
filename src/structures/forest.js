// Bosque Encantado, al oeste de la ciudad (al final de la Avenida del
// Castillo): árboles de hojas rosas y moradas, setas gigantes, la casita de
// los siete enanitos (sin personajes: siete camitas, una mesa larga y siete
// taburetes), una cabaña de jengibre de galleta y caramelo y una pequeña
// mina con gemas que brillan.

import { CITY_LEVEL } from '../world/terrain.js';
import { Frame } from './frame.js';

const G = CITY_LEVEL;
const F = G + 1;

export const FOREST = { x0: -95, z0: -8, x1: -52, z1: 44 };
const FLOWERS = ['flower_pink', 'flower_white', 'flower_blue', 'flower_yellow'];

export function buildForest(b, rng) {
  const { x0, z0, x1, z1 } = FOREST;
  b.flatten(x0, z0, x1, z1, G);
  // Camino del bosque: continúa la Avenida del Castillo hacia el oeste, con
  // piedras que brillan a los lados para la noche.
  b.fillBox(-51, G, 10, x0 + 3, G, 12, 'gravel');
  for (let x = -54; x >= x0 + 3; x -= 6) {
    b.set(x, G, 9, 'shiny_stone');
    b.set(x - 3, G, 13, 'shiny_stone');
  }

  // Edificios (sus parcelas quedan libres de árboles).
  const taken = [];
  taken.push(dwarfCottage(b));
  taken.push(gingerbreadCabin(b));
  taken.push(gemMine(b, -86, -1));
  taken.push({ x0: x0, z0: 9, x1: x1, z1: 13 }); // el camino
  taken.push({ x0: -70, z0: 30, x1: -60, z1: 40 }); // el claro de las setas

  // Claro de las setas gigantes.
  giantMushroom(b, -65, 35, 8, 4);
  giantMushroom(b, -70, 38, 5, 3);
  giantMushroom(b, -61, 39, 4, 2);

  // Árboles mágicos y setas sueltas por el resto del bosque.
  const free = (x, z, m) => !taken.some((r) => x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m);
  const placed = [];
  for (let tries = 0; tries < 400 && placed.length < 26; tries++) {
    const x = rng.int(x0 + 3, x1 - 3);
    const z = rng.int(z0 + 3, z1 - 3);
    if (!free(x, z, 3) || placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 7)) continue;
    placed.push([x, z]);
    if (rng.chance(0.2)) giantMushroom(b, x, z, rng.int(4, 6), 2);
    else magicTree(b, x, z, rng);
  }
  // Flores y hierba alta por el suelo.
  for (let i = 0; i < 260; i++) {
    const x = rng.int(x0 + 1, x1 - 1);
    const z = rng.int(z0 + 1, z1 - 1);
    if (!free(x, z, 1) || b.get(x, F, z) !== 0) continue;
    b.set(x, F, z, rng.chance(0.5) ? rng.pick(FLOWERS) : 'tall_grass');
  }
}

// Árbol mágico: tronco claro y copa grande, rosa o morada.
function magicTree(b, x, z, rng) {
  const leaves = rng.chance(0.5) ? 'purple_leaves' : 'cherry_leaves';
  const log = leaves === 'purple_leaves' ? 'birch_log' : 'cherry_log';
  const h = rng.int(5, 7);
  for (let dy = h - 3; dy <= h + 1; dy++) {
    const r = dy >= h ? 2 : 3;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dz * dz > r * r + 1) continue;
        const current = b.get(x + dx, F + dy, z + dz);
        if (current === undefined || current === 0) b.set(x + dx, F + dy, z + dz, leaves);
      }
    }
  }
  for (let dy = 0; dy < h; dy++) b.set(x, F + dy, z, log);
}

// Seta gigante: tallo y sombrero rojo con lunares, con luz bajo el sombrero.
function giantMushroom(b, x, z, h, r) {
  for (let dy = 0; dy < h; dy++) b.set(x, F + dy, z, 'mushroom_stem');
  b.cylinder(x, F + h, z, r + 1, 1, 'mushroom_cap');
  b.cylinder(x, F + h + 1, z, r, 1, 'mushroom_cap');
  if (r > 1) b.cylinder(x, F + h + 2, z, r - 1, 1, 'mushroom_cap');
  b.set(x, F + h - 1, z + 1, 'shiny_stone'); // lucecita bajo el sombrero
}

// Casita de los siete enanitos, al norte del camino, con la puerta al sur.
function dwarfCottage(b) {
  const f = new Frame(b, -76, 8, 'south'); // u hacia el este, v hacia el norte
  const W = 17, D = 13;
  const u0 = 1, u1 = W - 2, v0 = 2, v1 = 11, top = G + 5;
  const door = 8;
  f.hollow(u0, G, v0, u1, top, v1, 'planks', { floor: 'planks', ceiling: 'planks' });
  for (const [u, v] of [[u0, v0], [u1, v0], [u0, v1], [u1, v1]]) f.fill(u, G, v, u, top, v, 'oak_log');
  f.fill(u0, top, v0, u1, top, v0, 'oak_log');
  for (const u of [3, 5, 11, 13]) f.fill(u, F + 1, v0, u, F + 2, v0, 'glass');
  f.fill(u0, F + 1, 6, u0, F + 2, 7, 'glass');
  f.fill(u1, F + 1, 6, u1, F + 2, 7, 'glass');
  f.door(door, F, v0, 'casita de los siete enanitos');
  // Tejado verde muy inclinado y chimenea de piedra.
  f.roof(u0, top, v0, u1, v1, 'tiles_green', { ridge: 'u', gable: 'planks' });
  f.fill(u1 - 2, top + 1, v1 - 2, u1 - 2, top + 7, v1 - 2, 'cobblestone');
  // Siete camitas en fila junto a la pared del fondo, cada una de un color.
  const blankets = ['wool_red', 'wool_orange', 'wool_yellow', 'wool_lime', 'wool_light_blue', 'wool_blue', 'wool_purple'];
  blankets.forEach((color, k) => {
    f.set(5 + k, F, v1 - 1, 'wool_white'); // almohada
    f.set(5 + k, F, v1 - 2, color); // manta
  });
  // Mesa larga con siete taburetes.
  f.fill(5, F, 6, 11, F, 6, 'planks');
  for (let k = 0; k < 7; k++) f.set(5 + k, F, k % 2 ? 7 : 5, 'oak_log');
  // Chimenea de leña, farolillos y un cuadro.
  f.set(u0 + 1, F, v1 - 1, 'cobblestone');
  f.set(u0 + 1, F + 1, v1 - 1, 'torch');
  f.set(door, top - 1, 6, 'lantern');
  f.set(4, top - 1, 6, 'lantern');
  f.set(12, top - 1, 6, 'lantern');
  f.painting(u1 - 1, F + 2, v1 - 1);
  // Jardín delantero: camino al de grava, flores y una carretilla de gemas.
  for (let v = 0; v < v0; v++) f.set(door, G, v, 'gravel');
  for (const u of [2, 4, 12, 14]) f.set(u, F, 0, FLOWERS[u % FLOWERS.length]);
  f.set(14, F, 1, 'oak_log');
  f.set(14, F + 1, 1, 'shiny_stone');
  return rect(f, W, D);
}

// Cabaña de jengibre, al sur del camino, con la puerta al norte: paredes de
// galleta, tejado de caramelo, glaseado blanco y piruletas en el jardín.
function gingerbreadCabin(b) {
  const f = new Frame(b, -58, 14, 'north'); // u hacia el oeste, v hacia el sur
  const W = 15, D = 14;
  const u0 = 1, u1 = W - 2, v0 = 3, v1 = 11, top = G + 5;
  const door = 7;
  f.hollow(u0, G, v0, u1, top, v1, 'cookie', { floor: 'planks', ceiling: 'cookie' });
  // Glaseado en las esquinas y en el borde del tejado.
  for (const [u, v] of [[u0, v0], [u1, v0], [u0, v1], [u1, v1]]) f.fill(u, G, v, u, top, v, 'wool_white');
  f.fill(u0, top, v0, u1, top, v0, 'wool_white');
  f.fill(u0, top, v1, u1, top, v1, 'wool_white');
  // Ventanas con marco de caramelo.
  for (const u of [3, 11]) {
    f.fill(u, F + 1, v0, u, F + 2, v0, 'glass');
    f.set(u, F + 3, v0, 'candy');
  }
  f.fill(u0, F + 1, 7, u0, F + 2, 7, 'glass');
  f.fill(u1, F + 1, 7, u1, F + 2, 7, 'glass');
  f.door(door, F, v0, 'cabaña de jengibre');
  f.set(door, F + 2, v0, 'candy');
  f.roof(u0, top, v0, u1, v1, 'candy', { ridge: 'u', gable: 'cookie' });
  // Gominolas de colores pegadas en las paredes.
  for (const [u, y] of [[2, F + 3], [5, F + 1], [9, F + 3], [12, F + 1]]) f.set(u, y, v0, ['wool_red', 'wool_lime', 'wool_yellow', 'wool_purple'][u % 4]);
  // Dentro: horno de piedra, mesa con galletas y una cama de nube.
  f.set(u1 - 1, F, v1 - 1, 'cobblestone');
  f.set(u1 - 1, F + 1, v1 - 1, 'lantern');
  f.fill(5, F, 7, 7, F, 7, 'planks');
  f.set(6, F + 1, 7, 'cookie');
  f.fill(u0 + 1, F, v1 - 2, u0 + 1, F, v1 - 1, 'cloud');
  f.set(door, top - 1, 7, 'lantern');
  // Jardín: camino de caramelo y piruletas (palito y caramelo redondo).
  for (let v = 0; v < v0; v++) f.set(door, G, v, 'candy');
  for (const u of [2, 5, 10, 13]) {
    f.fill(u, F, 1, u, F + 1, 1, 'birch_log');
    f.set(u, F + 2, 1, ['candy', 'wool_pink', 'wool_light_blue', 'wool_yellow'][u % 4]);
  }
  return rect(f, W, D);
}

// Pequeña mina en una colina, con gemas que brillan y oro en las paredes.
function gemMine(b, cx, cz) {
  const r = 6;
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      const d = Math.hypot(dx, dz);
      const h = Math.round(5 * (1 - d / (r + 0.5)));
      if (h <= 0) continue;
      b.fillBox(cx + dx, F, cz + dz, cx + dx, F + h - 1, cz + dz, 'stone');
      b.set(cx + dx, F + h - 1, cz + dz, 'grass');
    }
  }
  // Túnel hacia el sur (hacia el camino) con vigas de madera.
  for (let dz = -3; dz <= r; dz++) {
    b.fillBox(cx - 1, F, cz + dz, cx + 1, F + 2, cz + dz, 'air');
    if (dz % 3 === 0) {
      b.fillBox(cx - 1, F + 2, cz + dz, cx + 1, F + 2, cz + dz, 'planks');
      b.fillBox(cx - 1, F, cz + dz, cx - 1, F + 1, cz + dz, 'oak_log');
      b.fillBox(cx + 1, F, cz + dz, cx + 1, F + 1, cz + dz, 'oak_log');
    }
  }
  b.fillBox(cx - 2, F, cz - 4, cx + 2, F + 2, cz - 2, 'air'); // cámara del fondo
  for (const [dx, y, dz] of [[-2, F + 1, -4], [2, F, -3], [0, F + 2, -5], [-2, F + 2, -2], [2, F + 2, -4]]) {
    b.set(cx + dx, y, cz + dz, dx === 0 ? 'gold' : 'shiny_stone');
  }
  b.set(cx, F, cz - 4, 'star');
  b.doors.push({ name: 'mina de gemas', x: cx, y: F, z: cz + r, inX: cx, inZ: cz + r - 1, outX: cx, outZ: cz + r + 1 });
  return { x0: cx - r, z0: cz - r, x1: cx + r, z1: cz + r };
}

// Rectángulo (en el mundo) que ocupa una parcela de W × D.
function rect(f, W, D) {
  const [ax, az] = f.world(0, 0);
  const [bx, bz] = f.world(W - 1, D - 1);
  return { x0: Math.min(ax, bx), z0: Math.min(az, bz), x1: Math.max(ax, bx), z1: Math.max(az, bz) };
}
