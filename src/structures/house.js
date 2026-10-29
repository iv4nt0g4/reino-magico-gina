// Casas y tiendas, construidas en coordenadas locales de su parcela (ver
// frame.js): u a lo largo de la calle, v hacia dentro. La parcela mide
// width × depth; delante queda un jardincito (v = 0..1) y detrás un patio.
//
// Estilos de casa: 'cottage' (una planta), 'townhouse' (dos plantas con
// escalera), 'tower' (casa-torre de cuento) y 'mushroom' (casa-seta de hadas).
// Las tiendas son casas de dos plantas con escaparate, toldo, cartel con
// icono e interior a juego.

import { CITY_LEVEL } from '../world/terrain.js';
import { BLOCK } from '../blocks/registry.js';

const G = CITY_LEVEL; // suelo
const F = G + 1; // primera altura libre
const FLOOR_HEIGHT = 5; // 4 de hueco + 1 de forjado

const WALLS = ['pastel_pink', 'pastel_lilac', 'pastel_sky', 'pastel_mint', 'pastel_peach', 'white_stone', 'planks', 'bricks', 'quartz'];
const TRIMS = ['quartz', 'white_stone', 'oak_log', 'birch_log', 'planks'];
const ROOFS = ['tiles_red', 'tiles_lilac', 'tiles_sky', 'tiles_pink', 'tiles_green'];
const BEDS = ['wool_pink', 'wool_light_blue', 'wool_lime', 'wool_yellow', 'wool_purple', 'wool_orange'];
const FLOWERS = ['flower_red', 'flower_yellow', 'flower_blue', 'flower_pink', 'flower_white'];

// ---------- Casas ----------

// `palette` (opcional) limita los materiales: { walls: [...], trims: [...], roofs: [...] }.
export function house(f, rng, { width, depth, name, style, palette }) {
  clearLot(f, width, depth);
  style ??= pickStyle(rng, width);
  if (style === 'tower') return towerHouse(f, rng, width, depth, name);
  if (style === 'mushroom') return mushroomHouse(f, rng, width, depth, name);

  const floors = style === 'townhouse' ? 2 : 1;
  const cfg = bodyConfig(f, rng, width, depth, floors, palette);
  cfg.name = name;
  body(f, rng, cfg, name);
  furnishGround(f, rng, cfg);
  if (floors === 2) furnishUpper(f, rng, cfg);
  frontGarden(f, rng, cfg);
  backYard(f, rng, cfg, depth);
  return cfg;
}

function pickStyle(rng, width) {
  const r = rng.next();
  if (width >= 9 && r < 0.12) return 'tower';
  if (width >= 9 && r < 0.24) return 'mushroom';
  return width >= 11 && r < 0.65 ? 'townhouse' : 'cottage';
}

// Quita plantas de la parcela y deja el suelo de hierba.
function clearLot(f, width, depth) {
  f.fill(0, G, 0, width - 1, G, depth - 1, 'grass');
  f.fill(0, F, 0, width - 1, F, depth - 1, 'air');
}

function bodyConfig(f, rng, width, depth, floors, palette = {}) {
  const u0 = 1;
  const u1 = width - 2;
  const v0 = 2;
  const v1 = Math.min(depth - 2, v0 + rng.int(7, 10) - 1);
  return {
    u0, u1, v0, v1,
    floors,
    top: G + FLOOR_HEIGHT * floors, // altura del techo
    door: Math.floor((u0 + u1) / 2),
    wall: rng.pick(palette.walls ?? WALLS),
    trim: rng.pick(palette.trims ?? TRIMS),
    roof: rng.pick(palette.roofs ?? ROOFS),
  };
}

// Paredes, suelos, ventanas, puerta, tejado y chimenea.
function body(f, rng, c, name, { shopFront = false } = {}) {
  const { u0, u1, v0, v1, top, door, wall, trim } = c;
  f.hollow(u0, G, v0, u1, top, v1, wall, { floor: 'planks', ceiling: 'planks' });
  if (c.floors === 2) f.fill(u0 + 1, G + FLOOR_HEIGHT, v0 + 1, u1 - 1, G + FLOOR_HEIGHT, v1 - 1, 'planks');
  // Esquinas y franja entre plantas.
  for (const [u, v] of [[u0, v0], [u1, v0], [u0, v1], [u1, v1]]) f.fill(u, G, v, u, top, v, trim);
  if (c.floors === 2) {
    f.fill(u0, G + FLOOR_HEIGHT, v0, u1, G + FLOOR_HEIGHT, v0, trim);
    f.fill(u0, G + FLOOR_HEIGHT, v1, u1, G + FLOOR_HEIGHT, v1, trim);
  }

  // Ventanas (planta baja y alta) en la fachada, los lados y detrás.
  const midV = Math.floor((v0 + v1) / 2);
  for (let floor = 0; floor < c.floors; floor++) {
    const y = F + 1 + floor * FLOOR_HEIGHT;
    // (las tiendas llevan escaparate abajo y el cartel arriba)
    if (!shopFront) {
      for (const u of [door - 2, door + 2]) {
        if (u > u0 && u < u1) f.fill(u, y, v0, u, y + 1, v0, 'glass');
      }
    }
    f.fill(u0, y, midV, u0, y + 1, midV, 'glass');
    f.fill(u1, y, midV, u1, y + 1, midV, 'glass');
    f.fill(door, y, v1, door, y + 1, v1, 'glass');
  }
  // Puerta con dintel.
  f.set(door, F + 2, v0, trim);
  f.door(door, F, v0, name);

  // Tejado a dos aguas (cumbrera paralela a la calle) y chimenea.
  f.roof(u0, top, v0, u1, v1, c.roof, { ridge: 'u', gable: wall });
  if (rng.chance(0.7)) {
    const height = Math.ceil((v1 - v0 + 2) / 2) + 1;
    f.fill(u1 - 1, top + 1, v1 - 1, u1 - 1, top + height, v1 - 1, 'bricks');
  }
}

function furnishGround(f, rng, c) {
  const { u0, u1, v0, v1, door } = c;
  const ui0 = u0 + 1, ui1 = u1 - 1, vi0 = v0 + 1, vi1 = v1 - 1;
  const lampV = Math.floor((vi0 + vi1) / 2);
  f.set(door, F + 3, lampV, 'lantern'); // lámpara colgada
  // Cocina en la esquina delantera derecha.
  if (ui1 - door >= 2) {
    f.set(ui1, F, vi0, 'cobblestone');
    f.set(ui1, F, vi0 + 1, 'quartz');
  }
  // Mesa con dos sillas en el lado izquierdo.
  if (door - ui0 >= 3) {
    const tv = vi0 + 2;
    f.set(ui0 + 1, F, tv, 'planks');
    f.set(ui0 + 1, F, tv - 1, rng.pick(BEDS));
    f.set(ui0 + 1, F, tv + 1, rng.pick(BEDS));
  }
  if (c.floors === 2) {
    // Escalera junto a la pared del fondo: se llega por la esquina (ui0, vi1).
    f.stairs(ui0 + 1, F, vi1, 1, FLOOR_HEIGHT, 'planks', `escalera de ${c.name ?? 'una casa'}`);
  } else {
    // Cama al fondo a la derecha y estantería al fondo a la izquierda.
    const bed = rng.pick(BEDS);
    f.set(ui1, F, vi1, 'wool_white');
    f.set(ui1, F, vi1 - 1, bed);
    f.fill(ui0, F, vi1, ui0, F + 1, vi1, 'bookshelf');
  }
}

function furnishUpper(f, rng, c) {
  const { u0, u1, v0, v1, door } = c;
  const y = F + FLOOR_HEIGHT;
  const ui0 = u0 + 1, ui1 = u1 - 1, vi0 = v0 + 1;
  // Cama delante a la derecha, armario delante a la izquierda, lámpara en medio.
  f.set(ui1, y, vi0, 'wool_white');
  f.set(ui1, y, vi0 + 1, rng.pick(BEDS));
  f.fill(ui0, y, vi0, ui0, y + 1, vi0, 'planks');
  f.set(door, y + 3, vi0 + 2, 'lantern');
  if (rng.chance(0.5)) f.fill(ui0, y, vi0 + 2, ui0, y + 1, vi0 + 2, 'bookshelf');
}

// Jardín delantero: camino hasta la puerta, flores, jardineras y algún detalle.
function frontGarden(f, rng, c) {
  const { u0, u1, v0, door } = c;
  const path = rng.pick(['cobblestone', 'gravel', 'white_stone']);
  for (let v = 0; v < v0; v++) f.set(door, G, v, path);
  const flowers = rng.pick(FLOWERS);
  for (let u = u0; u <= u1; u++) {
    if (Math.abs(u - door) <= 1) continue;
    if (rng.chance(0.7)) f.set(u, F, 0, rng.chance(0.8) ? flowers : rng.pick(FLOWERS));
  }
  // Jardineras con flores bajo las ventanas de la planta baja.
  for (const u of [door - 2, door + 2]) {
    if (u > u0 && u < u1 && f.get(u, F + 1, v0) === BLOCK.glass) {
      f.set(u, F, v0 - 1, 'planks');
      f.set(u, F + 1, v0 - 1, flowers);
    }
  }
  if (rng.chance(0.35)) f.set(door + 1, F, 0, 'wool_light_blue'); // buzón
}

// Patio trasero: árbol, huerto, barriles o nada.
function backYard(f, rng, c, depth) {
  const start = c.v1 + 2;
  if (depth - start < 3) return;
  const r = rng.next();
  const mid = Math.floor((c.u0 + c.u1) / 2);
  if (r < 0.4) {
    f.tree(mid, F, start + 1, rng.pick(['oak', 'cherry', 'birch']), 4);
  } else if (r < 0.75) {
    // Huerto: filas de plantas sobre tierra.
    for (let u = c.u0; u <= c.u1; u += 2) {
      for (let v = start; v < depth - 1; v++) {
        f.set(u, G, v, 'dirt');
        f.set(u, F, v, rng.chance(0.5) ? 'tall_grass' : 'flower_yellow');
      }
    }
  } else {
    f.set(c.u0, F, start, 'oak_log');
    f.set(c.u0 + 1, F, start, 'oak_log');
    f.set(c.u0, F, start + 1, 'planks');
  }
}

// Casa-torre de cuento: torre redonda con tejado cónico.
function towerHouse(f, rng, width, depth, name) {
  const cu = Math.floor(width / 2);
  const cv = 5;
  const wall = rng.pick(['pastel_pink', 'pastel_lilac', 'pastel_sky', 'white_stone']);
  f.cylinder(cu, G, cv, 3, 8, wall, { hollow: true });
  f.cylinder(cu, G, cv, 2, 1, 'planks');
  f.cylinder(cu, G + 7, cv, 3, 1, 'planks');
  f.cone(cu, G + 8, cv, 4, 8, rng.pick(ROOFS));
  // Ventanas a los lados y detrás.
  for (const [du, dv] of [[3, 0], [-3, 0], [0, 3]]) f.fill(cu + du, F + 1, cv + dv, cu + du, F + 2, cv + dv, 'glass');
  f.fill(cu - 1, F + 4, cv - 3, cu + 1, F + 4, cv - 3, 'glass');
  f.door(cu, F, cv - 3, name);
  for (let v = 0; v < cv - 3; v++) f.set(cu, G, v, 'cobblestone');
  // Dentro: lámpara, cama y estantería.
  f.set(cu, G + 6, cv, 'lantern');
  f.set(cu + 2, F, cv, 'wool_white');
  f.set(cu + 2, F, cv + 1, rng.pick(BEDS));
  f.fill(cu - 2, F, cv + 1, cu - 2, F + 1, cv + 1, 'bookshelf');
  f.set(cu - 2, F, 0, rng.pick(FLOWERS));
  f.set(cu + 2, F, 0, rng.pick(FLOWERS));
  backYard(f, rng, { u0: 1, u1: width - 2, v1: cv + 3 }, depth);
}

// Casa-seta de hadas: tallo con puerta y un gran sombrero rojo con lunares.
function mushroomHouse(f, rng, width, depth, name) {
  const cu = Math.floor(width / 2);
  const cv = 5;
  f.cylinder(cu, G, cv, 2, 5, 'mushroom_stem', { hollow: true });
  f.cylinder(cu, G, cv, 1, 1, 'planks');
  f.cylinder(cu, G + 5, cv, 4, 2, 'mushroom_cap');
  f.cylinder(cu, G + 7, cv, 3, 1, 'mushroom_cap');
  f.cylinder(cu, G + 8, cv, 2, 1, 'mushroom_cap');
  f.set(cu, F + 3, cv - 2, 'glass'); // ventanita redonda sobre la puerta
  f.set(cu + 2, F + 1, cv, 'glass');
  f.set(cu - 2, F + 1, cv, 'glass');
  f.door(cu, F, cv - 2, name);
  for (let v = 0; v < cv - 2; v++) f.set(cu, G, v, 'gravel');
  f.set(cu, G + 4, cv, 'lantern');
  // Setas pequeñas y flores alrededor.
  for (const [du, dv] of [[-3, 1], [3, 2], [-3, 4]]) f.set(cu + du, F, dv, rng.pick(FLOWERS));
  backYard(f, rng, { u0: 1, u1: width - 2, v1: cv + 2 }, depth);
}

// Casa a medida (posición y materiales dados), con su interior básico.
// La usan edificios especiales como la casa de Gina.
export function customHouse(f, rng, cfg) {
  const c = { door: Math.floor((cfg.u0 + cfg.u1) / 2), top: G + FLOOR_HEIGHT * cfg.floors, ...cfg };
  body(f, rng, c, c.name);
  furnishGround(f, rng, c);
  if (c.floors === 2) furnishUpper(f, rng, c);
  return c;
}

// ---------- Tiendas ----------

// Iconos de 7 × 7 para los carteles (borde 'f', fondo '.').
const ICONS = {
  heladeria: ['fffffff', 'f.ppp.f', 'fpwppff', 'f.ppp.f', 'f.nnn.f', 'f..n..f', 'fffffff'],
  pasteleria: ['fffffff', 'f..y..f', 'f.www.f', 'fpppppf', 'fwwwwwf', 'fpppppf', 'fffffff'],
  jugueteria: ['fffffff', 'fn...nf', 'fnnnnnf', 'fnknknf', 'fnnnnnf', 'f.nnn.f', 'fffffff'],
  floristeria: ['fffffff', 'f.p.p.f', 'fppyppf', 'f.p.p.f', 'f..g..f', 'f.ggg.f', 'fffffff'],
  disfraces: ['fffffff', 'fy.y.yf', 'fyyyyyf', 'fyrybyf', 'fyyyyyf', 'f.....f', 'fffffff'],
  libreria: ['fffffff', 'f.bbb.f', 'fbwwwbf', 'fbwkwbf', 'fbwwwbf', 'fbbbbbf', 'fffffff'],
  panaderia: ['fffffff', 'f.....f', 'f.nnn.f', 'fnynynf', 'fnnnnnf', 'f.....f', 'fffffff'],
  dulceria: ['fffffff', 'f.ppp.f', 'fpwpwpf', 'fppwppf', 'f.ppp.f', 'f..w..f', 'fffffff'],
  varitas: ['fffffff', 'f..y..f', 'f.yyy.f', 'fyyyyyf', 'f.y.y.f', 'fy...yf', 'fffffff'],
  sombrereria: ['fffffff', 'f.kkk.f', 'f.kkk.f', 'f.rrr.f', 'fkkkkkf', 'f.....f', 'fffffff'],
};
const ICON_PALETTE = {
  f: 'gold', '.': 'wool_white', p: 'wool_pink', w: 'wool_white', n: 'wool_brown', y: 'wool_yellow',
  g: 'wool_green', k: 'wool_black', r: 'wool_red', b: 'wool_blue',
};

// Mercancía que se ve sobre el mostrador y en las estanterías.
const GOODS = {
  heladeria: ['wool_pink', 'wool_white', 'wool_brown', 'wool_lime', 'wool_light_blue'],
  pasteleria: ['cookie', 'candy', 'wool_pink', 'wool_white'],
  jugueteria: ['wool_red', 'wool_blue', 'rainbow', 'wool_yellow', 'cloud'],
  floristeria: FLOWERS,
  disfraces: ['wool_purple', 'gold', 'wool_magenta', 'wool_light_blue'],
  libreria: ['bookshelf', 'bookshelf', 'planks'],
  panaderia: ['cookie', 'cookie', 'wool_orange'],
  dulceria: ['candy', 'candy', 'wool_pink', 'cookie'],
  varitas: ['star', 'gold', 'shiny_stone'],
  sombrereria: ['wool_black', 'wool_red', 'wool_purple', 'wool_blue'],
};
const AWNINGS = [['wool_red', 'wool_white'], ['wool_pink', 'wool_white'], ['wool_light_blue', 'wool_white'], ['wool_yellow', 'wool_orange'], ['wool_lime', 'wool_white'], ['wool_purple', 'wool_pink']];

export const SHOP_TYPES = Object.keys(ICONS);

export function shop(f, rng, { width, depth, type, name }) {
  clearLot(f, width, depth);
  const cfg = bodyConfig(f, rng, width, depth, 2);
  cfg.name = name;
  body(f, rng, cfg, name, { shopFront: true });
  const { u0, u1, v0, door } = cfg;

  // Escaparates de cristal a los dos lados de la puerta.
  f.fill(u0 + 1, F, v0, door - 1, F + 2, v0, 'glass');
  f.fill(door + 1, F, v0, u1 - 1, F + 2, v0, 'glass');
  // Toldo de rayas sobre la acera.
  const stripes = rng.pick(AWNINGS);
  for (let u = u0; u <= u1; u++) f.set(u, F + 3, v0 - 1, stripes[u % 2]);
  // Cartel con icono en la fachada de la planta alta.
  f.pattern(door - 3, cfg.top, v0, ICONS[type], ICON_PALETTE);
  // Delante, acera de piedra con macetas.
  f.fill(u0, G, 0, u1, G, v0 - 1, 'white_stone');
  f.set(u0, F, 0, 'flower_pink');
  f.set(u1, F, 0, 'flower_yellow');

  // Dentro: mostrador con mercancía (dejando paso por la izquierda) y estantes.
  const ui0 = u0 + 1, ui1 = u1 - 1, vi0 = v0 + 1;
  const goods = GOODS[type];
  for (let u = ui0 + 2; u <= ui1; u++) {
    f.set(u, F, vi0 + 2, 'quartz');
    const item = goods[u % goods.length];
    if (item !== 'bookshelf') f.set(u, F + 1, vi0 + 2, item);
  }
  for (let v = vi0 + 3; v < cfg.v1 - 1; v++) {
    f.set(ui1, F, v, type === 'libreria' ? 'bookshelf' : 'planks');
    f.set(ui1, F + 1, v, type === 'libreria' ? 'bookshelf' : goods[v % goods.length]);
  }
  f.set(door, F + 3, vi0 + 1, 'lantern');
  f.stairs(ui0 + 1, F, cfg.v1 - 1, 1, FLOOR_HEIGHT, 'planks', `escalera de ${name}`);
  furnishUpper(f, rng, cfg);
  return cfg;
}
