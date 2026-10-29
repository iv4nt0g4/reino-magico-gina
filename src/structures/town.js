// La Aldea de las Siete Estrellas: el pueblo más grande del mundo de Gina,
// al sur de la ciudad, en su propia explanada (TOWN en world/terrain.js).
//
// Es un homenaje a la serie favorita de la familia hecho con elementos
// genéricos y de dominio público, sin nombres, personajes ni diseños con
// derechos de autor:
//  - la estatua del héroe con cola de mono sobre su nube dorada y su bastón
//    rojo viene de la leyenda clásica del Rey Mono ("Viaje al Oeste");
//  - un gran torneo de artes marciales, un dragón dorado con siete estrellas,
//    casas-cúpula, una pagoda, farolillos rojos y puestos de fideos;
//  - el Dojo del Maestro Iván (el nombre sale de config/gina.js).
//
// Coordenadas: (dx, dz) relativas al centro de la explanada; el camino desde
// la ciudad llega por el norte (dz negativo).

import { CITY_LEVEL, TOWN } from '../world/terrain.js';
import { GINA } from '../config/gina.js';
import { StructureBuilder } from './builder.js';
import { Frame, createRandom, textRows } from './frame.js';
import { house, shop } from './house.js';
import { bench, barrels, marketStall } from './props.js';

const G = CITY_LEVEL;
const F = G + 1;
const LIMIT = TOWN.radius - 4; // nada se construye más lejos del centro
const X = (dx) => TOWN.x + dx;
const Z = (dz) => TOWN.z + dz;
const PALETTE = {
  walls: ['planks', 'white_stone', 'quartz', 'pastel_peach', 'pastel_mint'],
  trims: ['oak_log', 'wool_red', 'birch_log'],
  roofs: ['tiles_red', 'tiles_green', 'tiles_red'],
};

export function buildTown(b) {
  const rng = createRandom(77_7777);
  // Quitar flores y hierba alta de toda la explanada.
  for (let dz = -LIMIT; dz <= LIMIT; dz++) {
    for (let dx = -LIMIT; dx <= LIMIT; dx++) {
      if (dx * dx + dz * dz <= LIMIT * LIMIT) b.set(X(dx), F, Z(dz), 'air');
    }
  }
  streets(b);
  gate(b);
  market(b, rng);
  dragonPlaza(b);
  heroStatue(b);
  arena(b);
  dojo(b);
  pagoda(b);
  trainingPillars(b);
  neighborhoods(b, rng);
}

// Camino de la ciudad a la aldea (por el pasillo llano del terreno).
export function townRoad(b) {
  for (let z = 95; z <= Z(-80); z++) {
    b.fillBox(-2, G, z, 2, G, z, 'cobblestone');
    b.fillBox(-2, F, z, 2, F + 3, z, 'air');
    b.set(-3, G, z, 'white_stone');
    b.set(3, G, z, 'white_stone');
    if (z % 12 === 0) {
      redLantern(b, -4, z);
      redLantern(b, 4, z);
    }
  }
}

// ---------- Piezas pequeñas ----------

// Farolillo rojo de papel sobre un poste de madera.
function redLantern(b, x, z) {
  b.fillBox(x, F, z, x, F + 1, z, 'oak_log');
  b.set(x, F + 2, z, 'lantern');
  b.set(x, F + 3, z, 'wool_red');
}

// Estrella sobre un pedestal (las siete estrellas de la aldea, y alguna escondida).
function starPedestal(b, x, y, z, height = 2) {
  b.fillBox(x, y, z, x, y + height - 1, z, 'quartz');
  b.set(x, y + height, z, 'star');
}

function road(b, dx0, dz0, dx1, dz1, material = 'cobblestone') {
  b.fillBox(X(dx0), G, Z(dz0), X(dx1), G, Z(dz1), material);
  b.fillBox(X(dx0), F, Z(dz0), X(dx1), F + 3, Z(dz1), 'air');
}

// ---------- Calles ----------

function streets(b) {
  road(b, -3, -82, 3, 14); // avenida de la puerta a la pagoda
  b.fillBox(X(-4), G, Z(-82), X(-4), G, Z(-42), 'white_stone');
  b.fillBox(X(4), G, Z(-82), X(4), G, Z(-42), 'white_stone');
  road(b, -68, 8, 68, 10, 'gravel'); // Calle del Farolillo
  road(b, -68, 40, 68, 42, 'gravel'); // Calle del Bambú
  road(b, -60, -42, -4, -40, 'gravel'); // Calle del Mercado Viejo
  road(b, -16, 8, -14, 42, 'gravel');
  road(b, 14, 8, 16, 42, 'gravel');
  road(b, 14, -21, 32, -19); // de la plaza al torneo
  for (let dx = -64; dx <= 64; dx += 10) {
    if (Math.abs(dx) < 6) continue;
    redLantern(b, X(dx), Z(7));
    redLantern(b, X(dx), Z(43));
  }
}

// Gran puerta roja de la entrada, con dos estrellas.
function gate(b) {
  const z = Z(-74);
  for (const dx of [-5, 5]) b.fillBox(X(dx), F, z, X(dx), F + 8, z, 'wool_red');
  b.fillBox(X(-7), F + 9, z, X(7), F + 9, z, 'wool_black');
  b.fillBox(X(-6), F + 8, z, X(6), F + 8, z, 'wool_red');
  b.fillBox(X(-5), F + 6, z, X(5), F + 6, z, 'wool_red');
  b.set(X(0), F + 7, z, 'gold');
  for (const dx of [-7, 7]) b.set(X(dx), F + 10, z, 'star');
}

// Calle del mercado: puestos de fideos, fruta y telas con farolillos.
function market(b, rng) {
  for (const dz of [-70, -58, -46]) {
    marketStall(b, X(-7), F, Z(dz), rng, 'z');
    marketStall(b, X(6), F, Z(dz), rng, 'z');
  }
  for (const dz of [-64, -52]) {
    redLantern(b, X(-5), Z(dz) + 3);
    redLantern(b, X(5), Z(dz) + 3);
  }
  barrels(b, X(-9), F, Z(-62), rng);
  barrels(b, X(9), F, Z(-50), rng);
}

// ---------- Plaza del dragón ----------

function dragonPlaza(b) {
  const cx = X(0), cz = Z(-26);
  b.cylinder(cx, G, cz, 14, 1, 'white_stone');
  b.cylinder(cx, G, cz, 14, 1, 'gold', { hollow: true, inside: null });
  b.cylinder(cx, G, cz, 6, 1, 'pastel_peach', { hollow: true, inside: null });
  b.cylinder(cx, F, cz, 14, 8, 'air');
  // Columna de cuarzo con un dragón dorado enroscado que sube hasta arriba.
  b.fillBox(cx - 1, F, cz - 1, cx + 1, F + 12, cz + 1, 'quartz');
  b.fillBox(cx - 1, F + 13, cz - 1, cx + 1, F + 13, cz + 1, 'gold');
  // El cuerpo es un tubo de 2 × 2 que da casi tres vueltas: se recorre en
  // pasos pequeños para que no queden huecos.
  let last = null;
  for (let i = 0; i <= 260; i++) {
    const a = i * 0.065;
    const x = cx + Math.round(Math.cos(a) * 2.5);
    const z = cz + Math.round(Math.sin(a) * 2.5);
    const y = F + Math.floor(i / 22);
    const scale = Math.floor(i / 9) % 3 === 0 ? 'shiny_stone' : 'gold'; // escamas que brillan
    b.set(x, y, z, scale);
    b.set(x, y + 1, z, 'gold');
    if (i % 6 === 0) b.set(x, y + 2, z, 'wool_red'); // cresta
    last = [x, y, z, a];
  }
  // Cabeza del dragón mirando hacia fuera, con ojos, bigotes y cuernos.
  const [hx, hy, hz, ha] = last;
  const ox = Math.round(Math.cos(ha)), oz = Math.round(Math.sin(ha));
  const sx = -oz, sz = ox; // hacia el lado
  b.fillBox(Math.min(hx, hx + ox * 2), hy + 1, Math.min(hz, hz + oz * 2), Math.max(hx, hx + ox * 2), hy + 3, Math.max(hz, hz + oz * 2), 'gold');
  b.set(hx + ox * 3, hy + 1, hz + oz * 3, 'gold'); // hocico
  b.set(hx + ox * 3, hy + 2, hz + oz * 3, 'gold');
  b.set(hx + ox * 2 + sx, hy + 3, hz + oz * 2 + sz, 'wool_red'); // ojos
  b.set(hx + ox * 2 - sx, hy + 3, hz + oz * 2 - sz, 'wool_red');
  b.set(hx + ox * 3 + sx, hy + 1, hz + oz * 3 + sz, 'wool_white'); // bigotes
  b.set(hx + ox * 3 - sx, hy + 1, hz + oz * 3 - sz, 'wool_white');
  b.set(hx + ox * 4 + sx * 2, hy + 1, hz + oz * 4 + sz * 2, 'wool_white');
  b.set(hx + ox * 4 - sx * 2, hy + 1, hz + oz * 4 - sz * 2, 'wool_white');
  b.set(hx + sx, hy + 4, hz + sz, 'wool_white'); // cuernos
  b.set(hx - sx, hy + 4, hz - sz, 'wool_white');
  // Las siete estrellas alrededor, sobre pedestales.
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 - Math.PI / 2;
    starPedestal(b, cx + Math.round(Math.cos(a) * 9), F, cz + Math.round(Math.sin(a) * 9));
  }
  for (const [dx, dz] of [[-12, -6], [12, -6], [-12, 6], [12, 6]]) redLantern(b, cx + dx, cz + dz);
}

// ---------- Estatua del héroe de la leyenda sobre su nube dorada ----------

function heroStatue(b) {
  const cx = X(0), cz = Z(-2);
  // Plazoleta con estanque.
  b.fillBox(cx - 9, G, cz - 8, cx + 9, G, cz + 8, 'white_stone');
  b.fillBox(cx - 9, F, cz - 8, cx + 9, F + 16, cz + 8, 'air');
  b.cylinder(cx, G, cz, 4, 1, 'quartz');
  b.cylinder(cx, G - 1, cz, 3, 1, 'cobblestone');
  b.cylinder(cx, G, cz, 3, 1, 'water');
  b.cylinder(cx, F, cz, 4, 1, 'quartz', { hollow: true, inside: null });
  // Nube dorada flotando sobre el agua.
  const cloudY = G + 5;
  for (let dz = -2; dz <= 2; dz++) {
    for (let dx = -3; dx <= 3; dx++) {
      if (dx * dx / 9 + dz * dz / 4 <= 1.1) b.set(cx + dx, cloudY, cz + dz, 'wool_yellow');
      if (dx * dx / 4 + dz * dz / 2 <= 1) b.set(cx + dx, cloudY + 1, cz + dz, 'wool_yellow');
    }
  }
  b.set(cx - 4, cloudY, cz, 'wool_yellow');
  b.set(cx + 4, cloudY, cz + 1, 'wool_yellow');
  // El héroe, mirando al norte: piernas, armadura dorada, brazos, cabeza,
  // diadema de oro, pelo, cola de mono y su bastón rojo con puntas de oro.
  const y = cloudY + 2;
  for (const dx of [-1, 1]) b.fillBox(cx + dx, y, cz - 1, cx + dx, y + 1, cz, 'wool_red');
  b.fillBox(cx - 1, y + 2, cz - 1, cx + 1, y + 4, cz, 'wool_yellow');
  b.fillBox(cx - 1, y + 2, cz - 1, cx + 1, y + 2, cz, 'wool_red'); // cinturón
  for (const dx of [-2, 2]) {
    b.fillBox(cx + dx, y + 3, cz - 1, cx + dx, y + 4, cz, 'wool_yellow');
    b.set(cx + dx, y + 2, cz - 1, 'pastel_peach'); // manos
  }
  b.fillBox(cx - 1, y + 5, cz - 2, cx + 1, y + 7, cz, 'pastel_peach'); // cabeza
  b.set(cx - 1, y + 6, cz - 2, 'wool_black'); // ojos
  b.set(cx + 1, y + 6, cz - 2, 'wool_black');
  b.fillBox(cx - 1, y + 7, cz - 2, cx + 1, y + 7, cz - 2, 'gold'); // diadema
  b.fillBox(cx - 1, y + 8, cz - 2, cx + 1, y + 8, cz, 'wool_brown'); // pelo
  b.fillBox(cx - 1, y + 7, cz, cx + 1, y + 7, cz, 'wool_brown');
  b.set(cx, y + 1, cz + 1, 'wool_brown'); // cola
  b.set(cx, y + 2, cz + 2, 'wool_brown');
  b.set(cx, y + 3, cz + 2, 'wool_brown');
  b.set(cx, y + 4, cz + 3, 'wool_brown');
  b.fillBox(cx + 3, y - 1, cz - 1, cx + 3, y + 9, cz - 1, 'wool_red'); // bastón
  b.set(cx + 3, y - 1, cz - 1, 'gold');
  b.set(cx + 3, y + 9, cz - 1, 'gold');
  for (const [dx, dz] of [[-7, -6], [7, -6], [-7, 6], [7, 6]]) redLantern(b, cx + dx, cz + dz);
  bench(b, cx - 6, F, cz + 2, 'z');
  bench(b, cx + 6, F, cz - 3, 'z');
}

// ---------- Arena del Gran Torneo ----------

function arena(b) {
  const cx = X(44), cz = Z(-20);
  b.fillBox(cx - 13, G, cz - 13, cx + 13, G, cz + 13, 'grass');
  b.fillBox(cx - 13, F, cz - 13, cx + 13, F + 6, cz + 13, 'air');
  // Gradas: tres escalones de colores alrededor (abiertas por el oeste).
  const seats = ['cobblestone', 'wool_light_blue', 'wool_yellow'];
  for (let k = 0; k < 3; k++) {
    const r = 10 + k;
    for (let d = -r; d <= r; d++) {
      for (const [x, z] of [[cx + d, cz - r], [cx + d, cz + r], [cx + r, cz + d], [cx - r, cz + d]]) {
        if (x < cx - 9 && Math.abs(z - cz) <= 2) continue; // entrada
        b.fillBox(x, F, z, x, F + k, z, 'cobblestone');
        b.set(x, F + k, z, seats[k]);
      }
    }
  }
  // Tatami del torneo: plataforma de piedra blanca con borde de cuarzo.
  b.fillBox(cx - 7, F, cz - 7, cx + 7, F, cz + 7, 'quartz');
  b.fillBox(cx - 6, F, cz - 6, cx + 6, F, cz + 6, 'white_stone');
  b.set(cx, G, cz, 'star'); // una estrella escondida bajo el centro
  b.set(cx, F, cz, 'gold');
  // Mástiles con banderines en las esquinas.
  const flags = ['wool_red', 'wool_yellow', 'wool_light_blue', 'wool_lime'];
  [[-13, -13], [13, -13], [-13, 13], [13, 13]].forEach(([dx, dz], k) => {
    b.fillBox(cx + dx, F, cz + dz, cx + dx, F + 7, cz + dz, 'birch_log');
    b.fillBox(cx + dx + Math.sign(-dx), F + 6, cz + dz, cx + dx + 2 * Math.sign(-dx), F + 7, cz + dz, flags[k]);
  });
  for (const dz of [-3, 3]) redLantern(b, cx - 12, cz + dz);
}

// ---------- Dojo del Maestro Iván ----------

function dojo(b) {
  // Parcela al oeste de la plaza, con la fachada mirando al este.
  const f = new Frame(b, X(-14), Z(-14), 'east'); // u hacia el norte, v hacia el oeste
  const W = 23;
  f.fill(0, G, 0, W - 1, G, 24, 'grass');
  f.fill(0, F, 0, W - 1, F + 14, 24, 'air');
  const u0 = 2, u1 = 20, v0 = 8, v1 = 20, top = G + 10;
  const door = Math.floor((u0 + u1) / 2);
  f.hollow(u0, G, v0, u1, top, v1, 'planks', { floor: 'planks', ceiling: 'planks' });
  for (let u = u0; u <= u1; u += 6) {
    f.fill(u, G, v0, u, top, v0, 'wool_red'); // columnas rojas
    f.fill(u, G, v1, u, top, v1, 'wool_red');
  }
  f.fill(door - 1, F, v0, door + 1, F + 2, v0, 'air');
  f.door(door, F, v0, 'dojo');
  for (const u of [u0 + 3, u1 - 3]) f.fill(u, F + 1, v0, u + 1, F + 2, v0, 'glass');
  // Cartel con el nombre del maestro sobre la puerta.
  const rows = textRows(GINA.maestroDelDojo);
  const su = door - Math.floor(rows[0].length / 2);
  f.fill(su - 1, top - 6, v0, su + rows[0].length, top, v0, 'wool_white');
  f.pattern(su, top - 1, v0, rows, { '#': 'wool_red' });
  // Tejado a dos aguas rojo con un tejadillo más pequeño encima.
  f.roof(u0, top, v0, u1, v1, 'tiles_red', { ridge: 'u', gable: 'planks' });

  // Dentro: tatamis, muñecos de entrenamiento, bastones y una estrella.
  for (let u = u0 + 1; u < u1; u++) {
    for (let v = v0 + 1; v < v1; v++) f.set(u, G, v, (Math.floor(u / 2) + Math.floor(v / 3)) % 2 ? 'wool_lime' : 'wool_yellow');
  }
  for (let u = u0 + 2; u < u1 - 1; u += 3) {
    f.fill(u, F, v1 - 1, u, F + 3, v1 - 1, 'birch_log'); // bastones en la pared del fondo
    f.set(u, F + 4, v1 - 1, 'gold');
  }
  for (const u of [u0 + 3, u1 - 3]) {
    f.fill(u, F, v1 - 4, u, F + 1, v1 - 4, 'oak_log'); // muñeco de entrenamiento
    f.set(u, F + 2, v1 - 4, 'wool_brown');
  }
  f.set(door, F, v1 - 1, 'quartz');
  f.set(door, F + 1, v1 - 1, 'star');
  for (let u = u0 + 3; u < u1; u += 5) f.set(u, top - 1, Math.floor((v0 + v1) / 2), 'lantern');
  f.pattern(door - 2, F + 7, v1 - 1, ['pwwwp', 'wpppp', 'wpwwp', 'wppwp', 'pwwwp'], { p: 'wool_pink', w: 'wool_white' }); // la G de Gina

  // Patio de entrenamiento delante: postes de distintas alturas y faroles.
  for (let u = 2; u <= 20; u += 4) {
    if (Math.abs(u - door) <= 1) continue;
    f.fill(u, F, 4, u, F + (u % 3) + 1, 4, 'oak_log');
  }
  for (const u of [1, W - 2]) {
    f.fill(u, F, 0, u, F + 1, 0, 'oak_log');
    f.set(u, F + 2, 0, 'lantern');
    f.set(u, F + 3, 0, 'wool_red');
  }
  for (let v = 0; v < v0; v++) f.set(door, G, v, 'cobblestone');
}

// ---------- Pagoda de cuatro pisos ----------

const TIERS = [
  { half: 6, stairsRow: 3, stairsFrom: -4 },
  { half: 5, stairsRow: -3, stairsFrom: -3 },
  { half: 4, stairsRow: 2, stairsFrom: -2 },
  { half: 4 }, // mirador
];
const TIER_HEIGHT = 5;

function pagoda(b) {
  // Centrada en (0, 24); la puerta mira al norte, hacia la estatua.
  const f = new Frame(b, X(0), Z(24), 'north'); // u hacia el oeste, v hacia el sur
  f.fill(-12, G, -12, 12, G, 12, 'cobblestone');
  f.fill(-12, F, -12, 12, F + 30, 12, 'air');
  TIERS.forEach((tier, i) => {
    const base = G + i * TIER_HEIGHT;
    const h = tier.half;
    const last = i === TIERS.length - 1;
    if (!last) {
      f.hollow(-h, base, -h, h, base + TIER_HEIGHT, h, 'white_stone', { floor: 'planks', ceiling: 'planks' });
      f.fill(-h, base + 1, -h, h, base + 1, h, 'wool_red'); // zócalo rojo
      f.fill(-h + 1, base + 1, -h + 1, h - 1, base + 1, h - 1, 'air');
      for (const [u, v] of [[-h, -h], [h, -h], [-h, h], [h, h]]) f.fill(u, base, v, u, base + TIER_HEIGHT, v, 'wool_red');
      for (const [u, v] of [[0, -h], [0, h], [-h, 0], [h, 0]]) f.fill(u, base + 2, v, u, base + 3, v, 'glass');
      f.set(1, base + 4, -1, 'lantern');
    } else {
      // Mirador: suelo, columnas, barandilla y una estrella.
      f.fill(-h, base, -h, h, base, h, 'planks');
      for (const [u, v] of [[-h, -h], [h, -h], [-h, h], [h, h]]) f.fill(u, base + 1, v, u, base + 4, v, 'wool_red');
      for (let k = -h; k <= h; k++) {
        for (const [u, v] of [[k, -h], [k, h], [-h, k], [h, k]]) f.set(u, base + 1, v, 'white_stone');
      }
      f.set(0, base + 1, 0, 'star');
    }
    // Alero de dos anillos de tejas, el de fuera más bajo, con las esquinas levantadas.
    const roofY = base + TIER_HEIGHT;
    const tiles = i % 2 ? 'tiles_green' : 'tiles_red';
    for (const [r, y] of [[h + 1, roofY], [h + 2, roofY - 1]]) {
      for (let k = -r; k <= r; k++) {
        for (const [u, v] of [[k, -r], [k, r], [-r, k], [r, k]]) f.set(u, y, v, tiles);
      }
    }
    for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      f.set(u * (h + 2), roofY, v * (h + 2), tiles);
      f.set(u * (h + 3), roofY, v * (h + 3), tiles);
    }
    if (last) {
      f.fill(-h, roofY, -h, h, roofY, h, 'planks');
      f.cone(0, roofY + 1, 0, h + 1, 6, tiles);
      f.fill(0, roofY + 7, 0, 0, roofY + 9, 0, 'gold');
      f.set(0, roofY + 10, 0, 'star');
    }
  });
  // Escaleras entre pisos (después de levantar todos los pisos, para que el
  // suelo de un piso no tape el hueco de la escalera de abajo).
  TIERS.forEach((tier, i) => {
    if (tier.stairsRow === undefined) return;
    f.stairs(tier.stairsFrom, G + i * TIER_HEIGHT + 1, tier.stairsRow, 1, TIER_HEIGHT, 'planks', `pagoda: escalera del piso ${i + 1}`);
  });
  // Puerta grande hacia el norte.
  f.fill(-1, F, -6, 1, F + 2, -6, 'air');
  f.door(0, F, -6, 'pagoda');
  // Gong en la planta baja.
  f.fill(4, F, 3, 4, F + 2, 3, 'oak_log');
  f.set(4, F + 2, 2, 'gold');
  for (const [u, v] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) redLantern(b, ...f.world(u, v));
}

// ---------- Pilares de entrenamiento ----------

function trainingPillars(b) {
  // Cada pilar es un bloque más alto que el anterior: se suben saltando.
  const steps = [[18, 28], [20, 28], [22, 28], [24, 28], [24, 30], [24, 32], [22, 32], [20, 32]];
  steps.forEach(([dx, dz], k) => b.fillBox(X(dx), F, Z(dz), X(dx), F + k, Z(dz), 'stone'));
  b.fillBox(X(17), F, Z(31), X(18), F + 8, Z(33), 'stone'); // cima
  b.set(X(17), F + 9, Z(32), 'star');
  b.set(X(18), F + 9, Z(31), 'lantern');
}

// ---------- Barrios ----------

// Parcela de casa si queda dentro de la explanada (comprueba las cuatro esquinas).
function lot(b, rng, dx, dz, facing, depth, name, shopChance = 0.15) {
  const W = 11;
  const f = new Frame(b, X(dx), Z(dz), facing);
  const corners = [f.world(0, 0), f.world(W - 1, depth - 1), f.world(0, depth - 1), f.world(W - 1, 0)];
  if (corners.some(([x, z]) => Math.hypot(x - TOWN.x, z - TOWN.z) > LIMIT)) return;
  if (rng.chance(shopChance)) {
    const type = rng.pick(['panaderia', 'dulceria', 'libreria', 'varitas', 'sombrereria']);
    shop(f, rng, { width: W, depth, type, name: `${type} de la Aldea de las Siete Estrellas` });
  } else {
    house(f, rng, { width: W, depth, name: `${name} (${dx}, ${dz})`, palette: PALETTE });
  }
}

function neighborhoods(b, rng) {
  // Calle del Farolillo (dz 8..10): casas a los dos lados.
  for (let dx = -66; dx + 10 <= -17; dx += 11) {
    lot(b, rng, dx, 7, 'south', 12, 'casa de la Calle del Farolillo');
    lot(b, rng, dx + 10, 11, 'north', 12, 'casa de la Calle del Farolillo');
  }
  for (let dx = 17; dx + 10 <= 66; dx += 11) {
    lot(b, rng, dx, 7, 'south', 12, 'casa de la Calle del Farolillo');
    lot(b, rng, dx + 10, 11, 'north', 12, 'casa de la Calle del Farolillo');
  }
  // Calle del Bambú (dz 40..42): al norte, casas (al este, después de los pilares).
  for (let dx = -66; dx + 10 <= -17; dx += 11) {
    lot(b, rng, dx, 39, 'south', 11, 'casa de la Calle del Bambú');
    lot(b, rng, dx + 10, 43, 'north', 12, 'casa de la Calle del Bambú');
  }
  for (let dx = 28; dx + 10 <= 66; dx += 11) lot(b, rng, dx, 39, 'south', 11, 'casa de la Calle del Bambú');
  // Calle del Mercado Viejo (dz -42..-40): casas al norte.
  for (let dx = -64; dx + 10 <= -6; dx += 11) lot(b, rng, dx, -43, 'south', 12, 'casa del Mercado Viejo');

  // Casas-cúpula: al noreste (puerta al oeste, hacia la avenida) y al sureste
  // (puerta al norte, hacia la Calle del Bambú).
  for (const dz of [-64, -52]) {
    for (const dx of [18, 30, 42]) domeHouse(b, rng, dx, dz, 'west');
  }
  for (const [dx, dz] of [[20, 52], [32, 52], [44, 50], [20, 64], [32, 64]]) domeHouse(b, rng, dx, dz, 'north');
}

// Casa-cúpula: media esfera blanca con una franja de color, puerta y ventanas redondas.
function domeHouse(b, rng, dx, dz, doorSide) {
  const cx = X(dx), cz = Z(dz), r = 5;
  if (Math.hypot(dx, dz) + r > LIMIT) return;
  const band = rng.pick(['wool_light_blue', 'wool_yellow', 'wool_pink', 'wool_lime', 'wool_orange']);
  b.fillBox(cx - r - 1, G, cz - r - 1, cx + r + 1, G, cz + r + 1, 'grass');
  b.fillBox(cx - r - 1, F, cz - r - 1, cx + r + 1, F + r + 1, cz + r + 1, 'air');
  for (let y = 0; y <= r; y++) {
    for (let z = -r; z <= r; z++) {
      for (let x = -r; x <= r; x++) {
        const inside = (px, py, pz) => px * px + py * py + pz * pz <= r * r + r * 0.6;
        if (!inside(x, y, z)) continue;
        const shell = !inside(Math.abs(x) + 1, y, z) || !inside(x, y + 1, z) || !inside(x, y, Math.abs(z) + 1);
        b.set(cx + x, G + y, cz + z, y === 0 ? 'planks' : shell ? (y === 2 ? band : 'quartz') : 'air');
      }
    }
  }
  // Puerta y camino hacia la calle. La pared de la cúpula es más gruesa a la
  // altura de la cabeza, así que el hueco atraviesa dos bloques.
  const [ddx, ddz] = doorSide === 'west' ? [-1, 0] : [0, -1];
  const doorX = cx + ddx * r, doorZ = cz + ddz * r;
  b.fillBox(Math.min(doorX, doorX - ddx), F, Math.min(doorZ, doorZ - ddz), Math.max(doorX, doorX - ddx), F + 1, Math.max(doorZ, doorZ - ddz), 'air');
  b.set(doorX + ddx, G, doorZ + ddz, 'gravel');
  b.doors.push({ name: `casa-cúpula (${dx}, ${dz})`, x: doorX, y: F, z: doorZ, inX: doorX - 2 * ddx, inZ: doorZ - 2 * ddz, outX: doorX + ddx, outZ: doorZ + ddz });
  if (doorSide === 'west') road(b, 4, dz, dx - r - 1, dz, 'gravel');
  else road(b, dx, 43, dx, dz - r - 1, 'gravel');
  // Ventanas redondas a los lados y dentro, cama, mesa y lámpara.
  for (const [wx, wz] of [[-ddz * r, ddx * r], [ddz * r, -ddx * r], [-ddx * r, -ddz * r]]) b.set(cx + wx, F + 1, cz + wz, 'glass');
  b.set(cx - ddx * 3 + ddz * 2, F, cz - ddz * 3 + ddx * 2, rng.pick(['wool_pink', 'wool_light_blue', 'wool_yellow']));
  b.set(cx + ddz * 2, F, cz + ddx * 2, 'planks');
  b.set(cx, G + r - 1, cz, 'lantern');
}

// Para probar la aldea por separado.
export function buildTownOnly() {
  const b = new StructureBuilder();
  buildTown(b);
  townRoad(b);
  return b;
}
