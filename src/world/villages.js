// Aldeas y rincones repartidos por el mapa (fuera de la ciudad).
//
// Se generan junto con el terreno, de forma determinista: el mapa se divide en
// celdas y cada celda puede tener una aldea (o un rincón) en un punto al azar,
// solo si el sitio es bastante llano, sin agua ni nieve. Cada aldea se
// construye con las mismas plantillas que la ciudad, adaptada al terreno:
// cada casa se apoya en la altura de su parcela, con cimientos si hace falta,
// y caminos de grava que siguen el terreno hasta la plaza.
//
// Como se construyen igual cada vez, no hace falta guardarlas: solo se
// guardan los chunks que Gina modifique.

import { CHUNK_SIZE, CHUNK_HEIGHT, chunkKey } from '../engine/constants.js';
import { StructureBuilder } from '../structures/builder.js';
import { Frame, createRandom } from '../structures/frame.js';
import { house } from '../structures/house.js';
import { well, bench, cart, barrels, marketStall } from '../structures/props.js';
import { SEA_LEVEL, SNOW_LEVEL } from './terrain.js';

const VILLAGE_CELL = 288; // como mucho una aldea por celda de 288 × 288
const NOOK_CELL = 112; // rincones, en celdas más pequeñas
const VILLAGE_RADIUS = 34; // alcance de una aldea (casas, caminos y campos)
const NOOK_RADIUS = 9;
const MIN_DISTANCE = 190; // desde el centro de la ciudad
const VILLAGE_CHANCE = 0.85;
const NOOK_CHANCE = 0.45;
const TREE_MARGIN = 4; // sin árboles un poco más allá (para que las copas no tapen nada)
const LOT_WIDTH = 11;
const LOT_DEPTH = 12;
const VILLAGE_TYPES = ['granjeros', 'hadas', 'cerezos'];
const NOOK_TYPES = ['merendero', 'circulo', 'casita'];
const FLOWERS = ['flower_pink', 'flower_yellow', 'flower_white', 'flower_red', 'flower_blue'];

// Número aleatorio determinista para una celda.
function hashCell(i, j, salt) {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(salt, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function createVillagePlanner(terrain, seed) {
  const sites = new Map(); // "tipo:i,j" → sitio o null
  const builders = new Map(); // id del sitio → StructureBuilder (los más recientes)
  const MAX_CACHED = 24;

  // ---------- Elegir sitios ----------

  // Comprueba que la zona sea apta y devuelve la altura de la plaza (o null).
  function groundFor(x, z, radius) {
    if (Math.hypot(x, z) < MIN_DISTANCE) return null;
    const heights = [];
    for (let dz = -radius; dz <= radius; dz += 6) {
      for (let dx = -radius; dx <= radius; dx += 6) heights.push(terrain.heightAt(x + dx, z + dz));
    }
    heights.sort((a, b) => a - b);
    const min = heights[0];
    const max = heights[heights.length - 1];
    if (min <= SEA_LEVEL + 1 || max >= SNOW_LEVEL - 2 || max - min > (radius > 15 ? 12 : 5)) return null;
    return heights[Math.floor(heights.length / 2)]; // la mediana
  }

  function site(kind, i, j) {
    const key = `${kind}:${i},${j}`;
    if (sites.has(key)) return sites.get(key);
    const village = kind === 'aldea';
    const cell = village ? VILLAGE_CELL : NOOK_CELL;
    const radius = village ? VILLAGE_RADIUS : NOOK_RADIUS;
    const salt = seed + (village ? 11 : 23);
    let result = null;
    // Hasta 3 puntos al azar dentro de la celda (lejos de los bordes): el primero apto.
    for (let attempt = 0; attempt < 3 && !result && hashCell(i, j, salt) < (village ? VILLAGE_CHANCE : NOOK_CHANCE); attempt++) {
      const margin = radius + 8;
      const x = Math.floor(i * cell + margin + hashCell(i, j, salt + 1 + attempt * 10) * (cell - 2 * margin));
      const z = Math.floor(j * cell + margin + hashCell(i, j, salt + 2 + attempt * 10) * (cell - 2 * margin));
      const ground = groundFor(x, z, village ? 26 : 6);
      // Un rincón no puede caer dentro de una aldea.
      if (ground !== null && (village || !insideVillage(x, z, NOOK_RADIUS + 6))) {
        const types = village ? VILLAGE_TYPES : NOOK_TYPES;
        const type = types[Math.floor(hashCell(i, j, salt + 3) * types.length)];
        result = { id: key, kind, type, x, z, ground, radius, seed: Math.floor(hashCell(i, j, salt + 4) * 1e9) };
      }
    }
    sites.set(key, result);
    return result;
  }

  // Sitios cuyo alcance toca el rectángulo (x0..x1, z0..z1).
  function sitesNear(x0, z0, x1, z1) {
    const found = [];
    for (const [kind, cell, radius] of [['aldea', VILLAGE_CELL, VILLAGE_RADIUS], ['rincon', NOOK_CELL, NOOK_RADIUS]]) {
      const reach = radius + TREE_MARGIN;
      for (let j = Math.floor((z0 - reach) / cell); j <= Math.floor((z1 + reach) / cell); j++) {
        for (let i = Math.floor((x0 - reach) / cell); i <= Math.floor((x1 + reach) / cell); i++) {
          const s = site(kind, i, j);
          if (s && s.x + reach >= x0 && s.x - reach <= x1 && s.z + reach >= z0 && s.z - reach <= z1) found.push(s);
        }
      }
    }
    return found;
  }

  function insideVillage(x, z, extra) {
    const i = Math.floor(x / VILLAGE_CELL);
    const j = Math.floor(z / VILLAGE_CELL);
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const v = site('aldea', i + di, j + dj);
        if (v && Math.hypot(v.x - x, v.z - z) < VILLAGE_RADIUS + extra) return true;
      }
    }
    return false;
  }

  // ¿Se puede plantar un árbol en esta columna? (no dentro de aldeas ni rincones)
  function isTreeBlocked(x, z) {
    return sitesNear(x, z, x, z).some((s) => Math.hypot(s.x - x, s.z - z) < s.radius + TREE_MARGIN);
  }

  // ---------- Construir ----------

  function builderFor(s) {
    let b = builders.get(s.id);
    if (b) {
      builders.delete(s.id); // al final de la lista: usado hace poco
      builders.set(s.id, b);
      return b;
    }
    b = new StructureBuilder();
    if (s.kind === 'aldea') buildVillage(b, s, terrain);
    else buildNook(b, s, terrain);
    builders.set(s.id, b);
    if (builders.size > MAX_CACHED) builders.delete(builders.keys().next().value);
    return b;
  }

  // Aplica a un chunk recién generado los bloques de las aldeas y rincones cercanos.
  function applyToChunk(cx, cz, blocks) {
    const x0 = cx * CHUNK_SIZE;
    const z0 = cz * CHUNK_SIZE;
    const key = chunkKey(cx, cz);
    for (const s of sitesNear(x0, z0, x0 + CHUNK_SIZE - 1, z0 + CHUNK_SIZE - 1)) builderFor(s).applyTo(key, blocks);
    return blocks;
  }

  return { site, sitesNear, isTreeBlocked, applyToChunk, builderFor };
}

// ---------- Ayudas para construir sobre terreno ----------

// Lleva la cuenta de la altura del suelo ya preparado (parcelas, plaza) para
// que los caminos sepan dónde apoyarse.
class Ground {
  constructor(b, terrain) {
    this.b = b;
    this.terrain = terrain;
    this.prepared = new Map(); // "x,z" → altura del suelo
  }

  at(x, z) {
    return this.prepared.get(`${x},${z}`) ?? this.terrain.heightAt(x, z);
  }

  // Deja la columna (x, z) con suelo de `top` a la altura y: rellena con tierra
  // si el terreno está más bajo, recorta si está más alto, y despeja encima.
  level(x, z, y, top = 'grass', clear = 14) {
    const h = this.terrain.heightAt(x, z);
    for (let k = Math.min(h + 1, y); k < y; k++) this.b.set(x, k, z, 'dirt');
    this.b.set(x, y, z, top);
    for (let k = y + 1; k <= Math.min(CHUNK_HEIGHT - 1, Math.max(h, y) + clear); k++) this.b.set(x, k, z, 'air');
    this.prepared.set(`${x},${z}`, y);
  }

  // Camino de grava de (x0, z0) a (x1, z1) que sigue el suelo, sin pisar
  // las columnas para las que `blocked(x, z)` diga que sí (parcelas).
  path(x0, z0, x1, z1, blocked, material = 'gravel') {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));
    for (let k = 0; k <= steps; k++) {
      const x = Math.round(x0 + ((x1 - x0) * k) / Math.max(1, steps));
      const z = Math.round(z0 + ((z1 - z0) * k) / Math.max(1, steps));
      for (const [dx, dz] of [[0, 0], [1, 0], [0, 1]]) {
        const px = x + dx, pz = z + dz;
        if (blocked(px, pz)) continue;
        const y = this.at(px, pz);
        this.b.set(px, y, pz, material);
        this.b.set(px, y + 1, pz, 'air');
        this.b.set(px, y + 2, pz, 'air');
      }
    }
  }
}

// Orientación y esquina de una parcela de LOT_WIDTH × LOT_DEPTH centrada en
// (lx, lz) cuya fachada mira hacia (tx, tz).
function lotFacing(lx, lz, tx, tz) {
  const dx = tx - lx, dz = tz - lz;
  const hw = Math.floor(LOT_WIDTH / 2), hd = Math.floor(LOT_DEPTH / 2);
  if (Math.abs(dx) > Math.abs(dz)) {
    return dx > 0
      ? { facing: 'east', ox: lx + hd, oz: lz + hw }
      : { facing: 'west', ox: lx - hd, oz: lz - hw };
  }
  return dz > 0
    ? { facing: 'south', ox: lx - hw, oz: lz + hd }
    : { facing: 'north', ox: lx + hw, oz: lz - hd };
}

// Rectángulo (en el mundo) que ocupa una parcela.
function lotRect(f) {
  const corners = [f.world(0, 0), f.world(LOT_WIDTH - 1, LOT_DEPTH - 1)];
  return {
    x0: Math.min(corners[0][0], corners[1][0]), x1: Math.max(corners[0][0], corners[1][0]),
    z0: Math.min(corners[0][1], corners[1][1]), z1: Math.max(corners[0][1], corners[1][1]),
  };
}

const overlaps = (a, b) => a.x0 <= b.x1 + 1 && b.x0 <= a.x1 + 1 && a.z0 <= b.z1 + 1 && b.z0 <= a.z1 + 1;

// ---------- Aldeas ----------

function buildVillage(b, s, terrain) {
  const rng = createRandom(s.seed);
  const ground = new Ground(b, terrain);
  const gv = s.ground;
  const names = { granjeros: 'aldea de granjeros', hadas: 'aldea de las hadas', cerezos: 'aldea de los cerezos' };
  const area = `${names[s.type]} (${s.x}, ${s.z})`;

  // Plaza redonda de adoquines con pozo y farolas.
  for (let dz = -6; dz <= 6; dz++) {
    for (let dx = -6; dx <= 6; dx++) {
      if (dx * dx + dz * dz <= 6 * 6 + 3) ground.level(s.x + dx, s.z + dz, gv, dx * dx + dz * dz <= 25 ? 'cobblestone' : 'grass');
    }
  }
  well(b, s.x, gv + 1, s.z, s.type === 'hadas' ? 'tiles_lilac' : 'tiles_red');
  for (const [dx, dz] of [[-5, -2], [5, 2], [-2, 5], [2, -5]]) b.lampPost(s.x + dx, gv + 1, s.z + dz);

  // Casas alrededor de la plaza, mirando hacia ella.
  const count = rng.int(5, 7);
  const start = rng.next() * Math.PI * 2;
  const placed = [];
  for (let k = 0; k < count; k++) {
    const a = start + (k / count) * Math.PI * 2 + (rng.next() - 0.5) * 0.3;
    const dist = rng.int(19, 23);
    const lx = Math.round(s.x + Math.cos(a) * dist);
    const lz = Math.round(s.z + Math.sin(a) * dist);
    const { facing, ox, oz } = lotFacing(lx, lz, s.x, s.z);
    const gh = Math.max(gv - 3, Math.min(gv + 3, terrain.heightAt(lx, lz)));
    const f = new Frame(b, ox, oz, facing, gh);
    const rect = lotRect(f);
    if (placed.some((r) => overlaps(r, rect))) continue;
    placed.push(rect);
    for (let x = rect.x0; x <= rect.x1; x++) for (let z = rect.z0; z <= rect.z1; z++) ground.level(x, z, gh);
    const style = s.type === 'hadas' ? rng.pick(['mushroom', 'mushroom', 'tower']) : undefined;
    const cfg = house(f, rng, { width: LOT_WIDTH, depth: LOT_DEPTH, name: `casa de la ${area}`, style });
    // Camino desde la puerta (o el centro de la fachada) hasta la plaza.
    const door = cfg?.door ?? Math.floor(LOT_WIDTH / 2);
    const [px, pz] = f.world(door, -1);
    const inLot = (x, z) => placed.some((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);
    ground.path(px, pz, s.x + Math.sign(px - s.x) * 4, s.z + Math.sign(pz - s.z) * 4, inLot);
  }

  // Detalles según el tipo de aldea.
  if (s.type === 'granjeros') {
    farmPatch(b, ground, rng, s);
    cart(b, s.x + 3, gv + 1, s.z - 3, 'wool_yellow');
    barrels(b, s.x - 4, gv + 1, s.z + 3, rng);
    marketStall(b, s.x - 1, gv + 1, s.z + 3, rng);
  } else if (s.type === 'hadas') {
    fairyRing(b, ground, s.x, s.z, 9, rng);
    for (let k = 0; k < 4; k++) {
      const a = rng.next() * Math.PI * 2;
      const d = rng.int(27, 31);
      giantMushroom(b, ground, Math.round(s.x + Math.cos(a) * d), Math.round(s.z + Math.sin(a) * d), rng);
    }
  } else {
    for (let k = 0; k < 7; k++) {
      const a = rng.next() * Math.PI * 2;
      const d = rng.int(10, 13);
      const tx = Math.round(s.x + Math.cos(a) * d), tz = Math.round(s.z + Math.sin(a) * d);
      b.tree(tx, ground.at(tx, tz) + 1, tz, 'cherry', rng.int(4, 5));
    }
    bench(b, s.x + 3, gv + 1, s.z + 3);
    bench(b, s.x - 4, gv + 1, s.z - 3, 'z');
  }
}

// Campos de cultivo en un lado de la aldea, siguiendo el terreno.
function farmPatch(b, ground, rng, s) {
  const a = rng.next() * Math.PI * 2;
  const cx = Math.round(s.x + Math.cos(a) * 29), cz = Math.round(s.z + Math.sin(a) * 29);
  for (let dz = -3; dz <= 3; dz++) {
    for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, z = cz + dz;
      if (b.get(x, ground.at(x, z), z) !== undefined) continue; // no pisar casas ni caminos
      const y = ground.at(x, z);
      const furrow = (dz + 3) % 3 === 2;
      b.set(x, y, z, furrow ? 'dirt' : 'grass');
      b.set(x, y + 1, z, furrow ? 'air' : (dx + dz) % 4 === 0 ? 'flower_yellow' : 'tall_grass');
    }
  }
  const y = ground.at(cx + 6, cz);
  b.fillBox(cx + 6, y + 1, cz, cx + 7, y + 2, cz + 1, 'wool_yellow'); // almiar
}

// Círculo de hadas: flores y setitas en corro.
function fairyRing(b, ground, x, z, r, rng) {
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    const px = Math.round(x + Math.cos(a) * r), pz = Math.round(z + Math.sin(a) * r);
    const y = ground.at(px, pz);
    if (b.get(px, y + 1, pz) !== undefined && b.get(px, y + 1, pz) !== 0) continue;
    b.set(px, y + 1, pz, k % 3 === 0 ? 'mushroom_cap' : rng.pick(FLOWERS));
  }
}

// Seta gigante: tallo y sombrero rojo con lunares.
function giantMushroom(b, ground, x, z, rng) {
  const y = ground.at(x, z);
  const h = rng.int(4, 6);
  for (let k = 1; k <= h; k++) b.set(x, y + k, z, 'mushroom_stem');
  b.cylinder(x, y + h + 1, z, 3, 1, 'mushroom_cap');
  b.cylinder(x, y + h + 2, z, 2, 1, 'mushroom_cap');
}

// ---------- Rincones ----------

function buildNook(b, s, terrain) {
  const rng = createRandom(s.seed);
  const ground = new Ground(b, terrain);
  const g = s.ground;
  if (s.type === 'casita') {
    const f = new Frame(b, s.x - 5, s.z + 6, 'south', g);
    const rect = lotRect(f);
    for (let x = rect.x0; x <= rect.x1; x++) for (let z = rect.z0; z <= rect.z1; z++) ground.level(x, z, g);
    house(f, rng, { width: LOT_WIDTH, depth: LOT_DEPTH, name: `casita del bosque (${s.x}, ${s.z})`, style: rng.pick(['cottage', 'mushroom', 'tower']) });
    return;
  }
  for (let dz = -4; dz <= 4; dz++) {
    for (let dx = -4; dx <= 4; dx++) if (dx * dx + dz * dz <= 18) ground.level(s.x + dx, s.z + dz, g);
  }
  if (s.type === 'merendero') {
    // Merendero: banco, carreta con flores, pozo y un farolillo.
    bench(b, s.x - 2, g + 1, s.z);
    bench(b, s.x + 1, g + 1, s.z, 'z');
    cart(b, s.x - 1, g + 1, s.z + 3, rng.pick(FLOWERS));
    b.lampPost(s.x + 3, g + 1, s.z - 2);
    for (let k = -3; k <= 3; k += 2) b.set(s.x + k, g + 1, s.z - 4, rng.pick(FLOWERS));
  } else {
    // Círculo de setas de las hadas con una seta gigante en medio.
    fairyRing(b, ground, s.x, s.z, 4, rng);
    giantMushroom(b, ground, s.x, s.z, rng);
  }
}
