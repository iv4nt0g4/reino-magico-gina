// Palacio de Hielo, al noroeste de la ciudad: una colina nevada con una gran
// escalinata y, arriba, un palacio de hielo y cristal celeste con torres,
// salón del trono helado y una galería a la que se sube por una escalera.
// Alrededor, muñecos de nieve.

import { CITY_LEVEL } from '../world/terrain.js';

const G = CITY_LEVEL;
const F = G + 1;

export const ICE = { x0: -98, z0: -100, x1: -52, z1: -52 };
const CX = -76; // centro de la colina
const CZ = -76;
const TOP = G + 9; // altura del suelo en lo alto de la colina
const PLATEAU = 11; // radio llano de arriba
const BASE = 21; // radio de la colina

export function buildIcePalace(b) {
  const { x0, z0, x1, z1 } = ICE;
  b.flatten(x0, z0, x1, z1, G);
  // Nieve en círculo alrededor de la colina, con el borde irregular.
  for (let dz = -BASE - 6; dz <= BASE + 6; dz++) {
    for (let dx = -BASE - 6; dx <= BASE + 6; dx++) {
      const d = Math.hypot(dx, dz) + ((dx * 7 + dz * 13) % 3);
      if (d <= BASE + 5) b.set(CX + dx, G, CZ + dz, 'snow');
    }
  }
  hill(b);
  grandStairs(b);
  palace(b);
  for (const [x, z] of [[-92, -60], [-60, -90], [-90, -94], [-58, -60]]) snowman(b, x, z);
  // Camino desde el final de la calle del Barrio del Norte hasta la escalinata.
  b.fillBox(-51, G, -66, -48, G, -64, 'gravel');
  b.fillBox(-54, G, -77, -52, G, -64, 'snow');
}

// Colina: llana arriba y con ladera suave alrededor, de nieve sobre tierra.
function hill(b) {
  for (let dz = -BASE; dz <= BASE; dz++) {
    for (let dx = -BASE; dx <= BASE; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > BASE) continue;
      const h = d <= PLATEAU ? TOP : Math.round(G + (TOP - G) * (1 - (d - PLATEAU) / (BASE - PLATEAU)));
      if (h <= G) continue;
      b.fillBox(CX + dx, G, CZ + dz, CX + dx, h - 1, CZ + dz, 'dirt');
      b.set(CX + dx, h, CZ + dz, 'snow');
    }
  }
}

// Escalinata de cuarzo desde el este hasta lo alto, con barandillas de hielo
// y farolillos.
function grandStairs(b) {
  const steps = TOP - G; // 9 peldaños
  const xStart = CX + PLATEAU + steps; // pie de la escalera
  for (let i = 0; i < steps; i++) {
    const x = xStart - i;
    const y = F + i;
    b.fillBox(x, G, CZ - 1, x, y - 1, CZ + 1, 'dirt'); // relleno bajo cada peldaño
    b.fillBox(x, y, CZ - 1, x, y, CZ + 1, 'quartz');
    b.fillBox(x, y + 1, CZ - 1, x, y + 4, CZ + 1, 'air');
    b.set(x, y + 1, CZ - 2, 'ice');
    b.set(x, y + 1, CZ + 2, 'ice');
    if (i % 4 === 0) {
      b.set(x, y + 2, CZ - 2, 'lantern');
      b.set(x, y + 2, CZ + 2, 'lantern');
    }
  }
  b.stairways.push({ name: 'escalinata del Palacio de Hielo', x: xStart + 1, y: F, z: CZ, dx: -1, dz: 0, rise: steps });
  // Rellano de arriba hasta la puerta del palacio.
  b.fillBox(CX + 6, TOP, CZ - 1, xStart - steps, TOP, CZ + 1, 'quartz');
}

function palace(b) {
  const y0 = TOP; // suelo del palacio
  const x0 = CX - 6, x1 = CX + 6, z0 = CZ - 7, z1 = CZ + 7;
  const top = y0 + 9;
  // Salón principal de hielo con columnas de cristal celeste y suelo de cuarzo.
  b.hollowBox(x0, y0, z0, x1, top, z1, 'ice', { floor: 'quartz', ceiling: 'crystal_sky' });
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) b.fillBox(x, y0, z, x, top, z, 'crystal_sky');
  for (const z of [z0 + 3, CZ, z1 - 3]) {
    b.fillBox(x0, y0 + 2, z, x0, y0 + 5, z, 'glass');
    b.fillBox(x1, y0 + 2, z, x1, y0 + 5, z, 'glass');
  }
  // Puerta grande al este, hacia la escalinata.
  b.fillBox(x1, y0 + 1, CZ - 1, x1, y0 + 4, CZ + 1, 'air');
  b.set(x1, y0 + 5, CZ, 'crystal_sky');
  b.doors.push({ name: 'Palacio de Hielo', x: x1, y: y0 + 1, z: CZ, inX: x1 - 1, inZ: CZ, outX: x1 + 1, outZ: CZ });

  // Copo de nieve dibujado en el suelo.
  for (let k = -4; k <= 4; k++) {
    b.set(CX + k, y0, CZ, 'wool_light_blue');
    b.set(CX, y0, CZ + k, 'wool_light_blue');
    if (Math.abs(k) <= 3) {
      b.set(CX + k, y0, CZ + k, 'wool_white');
      b.set(CX + k, y0, CZ - k, 'wool_white');
    }
  }
  // Trono helado al oeste, con una estrella.
  b.fillBox(x0 + 1, y0 + 1, CZ - 2, x0 + 2, y0 + 1, CZ + 2, 'crystal_sky');
  b.fillBox(x0 + 1, y0 + 2, CZ - 1, x0 + 1, y0 + 5, CZ + 1, 'ice');
  b.set(x0 + 2, y0 + 2, CZ, 'wool_light_blue');
  b.set(x0 + 1, y0 + 6, CZ, 'star');
  // Lámparas de cristal colgadas del techo y farolillos en las paredes.
  for (const [x, z] of [[CX - 2, CZ - 4], [CX + 2, CZ + 4], [CX + 3, CZ - 3], [CX - 3, CZ + 3]]) b.set(x, top - 1, z, 'lantern');
  for (const x of [CX - 3, CX + 3]) {
    b.set(x, y0 + 3, z0, 'lantern');
    b.set(x, y0 + 3, z1, 'lantern');
  }

  // Galería al norte: escalera junto a la pared norte que sube hasta un
  // balcón interior con vistas al salón.
  const gy = y0 + 5; // suelo de la galería
  b.fillBox(x0 + 1, gy, z0 + 1, x1 - 1, gy, z0 + 2, 'crystal_sky');
  for (let i = 0; i < 5; i++) {
    const x = CX + 4 - i;
    b.set(x, y0 + 1 + i, z0 + 3, 'quartz');
    b.fillBox(x, y0 + 2 + i, z0 + 3, x, Math.min(top - 1, y0 + 5 + i), z0 + 3, 'air');
  }
  b.stairways.push({ name: 'escalera de la galería del Palacio de Hielo', x: CX + 5, y: y0 + 1, z: z0 + 3, dx: -1, dz: 0, rise: 5 });
  b.set(CX, gy + 1, z0 + 1, 'star');

  // Torres de hielo en las esquinas y una torre central más alta, todas con
  // tejados cónicos de cristal celeste.
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
    b.cylinder(x, y0, z, 2, 13, 'ice');
    b.cone(x, y0 + 13, z, 3, 6, 'crystal_sky');
  }
  b.cylinder(CX, top + 1, CZ, 3, 6, 'ice', { hollow: true, inside: null });
  b.cone(CX, top + 7, CZ, 4, 9, 'crystal_sky');
  b.set(CX, top + 16, CZ, 'star');
}

// Muñeco de nieve: dos bolas de nieve, ojos, nariz naranja y bufanda.
function snowman(b, x, z) {
  b.fillBox(x, F, z, x, F + 1, z, 'snow');
  b.set(x, F + 2, z, 'wool_red'); // bufanda
  b.set(x, F + 3, z, 'snow'); // cabeza
  b.set(x, F + 4, z, 'wool_black'); // sombrero
  b.set(x + 1, F + 3, z, 'wool_orange'); // nariz (mirando al este)
}
