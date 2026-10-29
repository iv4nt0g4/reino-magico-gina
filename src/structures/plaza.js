// Plaza del Carrusel: suelo de piedra con anillos de colores, fuente central,
// carrusel de caballitos con techo de rayas, bancos, farolas, árboles y un
// puesto de globos.

import { CITY_LEVEL } from '../world/terrain.js';
import { StructureBuilder } from './builder.js';
import { bench, plantedTree, cart } from './props.js';

const G = CITY_LEVEL;
const F = G + 1;

export const PLAZA = { x: 0, z: 66, r: 18 };

export function plaza(b) {
  const { x: cx, z: cz, r } = PLAZA;
  // Suelo: piedra blanca con un anillo rosa y un borde de cuarzo.
  b.cylinder(cx, G, cz, r, 1, 'white_stone');
  b.cylinder(cx, G, cz, r, 1, 'quartz', { hollow: true, inside: null });
  b.cylinder(cx, G, cz, 12, 1, 'pastel_pink', { hollow: true, inside: null });
  b.cylinder(cx, F, cz, r, 6, 'air');

  fountain(b, cx, cz - 9);
  carousel(b, cx, cz + 8);

  // Bancos, farolas y cerezos alrededor.
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const bx = Math.round(cx + Math.cos(a) * 15);
    const bz = Math.round(cz + Math.sin(a) * 15);
    bench(b, bx, F, bz, Math.abs(Math.sin(a)) > Math.abs(Math.cos(a)) ? 'x' : 'z');
    const la = (k / 8) * Math.PI * 2;
    b.lampPost(Math.round(cx + Math.cos(la) * 16), F, Math.round(cz + Math.sin(la) * 16));
  }
  for (const [dx, dz] of [[-12, -4], [12, -4]]) plantedTree(b, cx + dx, F, cz + dz, 'cherry');

  // Puesto de globos: carretilla y globos de colores flotando.
  cart(b, cx + 9, F, cz + 1, 'wool_white');
  const balloons = [['wool_red', 0, 4, 0], ['wool_yellow', 1, 5, -1], ['wool_light_blue', -1, 5, 1], ['wool_pink', 1, 6, 1], ['wool_lime', 0, 6, -1], ['wool_purple', -1, 7, 0]];
  for (const [color, dx, dy, dz] of balloons) b.set(cx + 9 + dx, F + dy, cz + 1 + dz, color);
}

function fountain(b, x, z) {
  b.cylinder(x, F, z, 4, 1, 'quartz', { hollow: true, inside: 'water' });
  b.fillBox(x, F, z, x, F + 2, z, 'quartz'); // columna central
  b.cylinder(x, F + 3, z, 1, 1, 'quartz');
  b.set(x, F + 4, z, 'water'); // el agua brota arriba
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, F + 4, z + dz, 'water');
}

function carousel(b, x, z) {
  // Plataforma redonda con borde rosa.
  b.cylinder(x, F, z, 7, 1, 'planks');
  b.cylinder(x, F, z, 7, 1, 'wool_pink', { hollow: true, inside: null });
  // Columna central de cuarzo con franjas de oro.
  b.fillBox(x - 1, F + 1, z - 1, x + 1, F + 6, z + 1, 'quartz');
  b.fillBox(x - 1, F + 2, z - 1, x + 1, F + 2, z + 1, 'gold');
  b.fillBox(x - 1, F + 5, z - 1, x + 1, F + 5, z + 1, 'gold');
  // Ocho caballitos de colores en sus barras doradas.
  const colors = ['wool_white', 'wool_pink', 'wool_light_blue', 'wool_yellow'];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const hx = Math.round(x + Math.cos(a) * 5);
    const hz = Math.round(z + Math.sin(a) * 5);
    const tx = Math.round(-Math.sin(a)); // hacia delante (giro del carrusel)
    const tz = Math.round(Math.cos(a));
    b.fillBox(hx, F + 1, hz, hx, F + 6, hz, 'gold'); // barra
    const color = colors[k % colors.length];
    b.set(hx, F + 2, hz, color); // lomo
    b.set(hx + tx, F + 2, hz + tz, color); // pecho
    b.set(hx + tx, F + 3, hz + tz, color); // cabeza
    b.set(hx - tx, F + 2, hz - tz, 'wool_purple'); // cola
  }
  // Techo cónico de rayas rosas y blancas.
  [8, 6, 4, 2, 1].forEach((radius, k) => {
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (!StructureBuilder.inCircle(dx, dz, radius)) continue;
        const sector = Math.floor(((Math.atan2(dz, dx) + Math.PI) / (Math.PI * 2)) * 12);
        b.set(x + dx, F + 7 + k, z + dz, sector % 2 ? 'wool_pink' : 'wool_white');
      }
    }
  });
  b.set(x, F + 12, z, 'gold');
  b.fillBox(x, F + 13, z, x, F + 14, z, 'birch_log');
  b.set(x + 1, F + 14, z, 'wool_pink');
}
