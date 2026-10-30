// La casa de Gina y su familia: la más bonita del barrio, con jardín lleno de
// flores, columpio, cerezo y un cartel con su nombre en la entrada.
// (Sus gustos —color favorito, mascota...— se añadirán en la fase de personalización.)

import { CITY_LEVEL } from '../world/terrain.js';
import { GINA } from '../config/gina.js';
import { customHouse } from './house.js';
import { textRows } from './frame.js';

const G = CITY_LEVEL;
const F = G + 1;
const FLOWERS = ['flower_pink', 'flower_red', 'flower_yellow', 'flower_white', 'flower_blue'];

export function ginaHouse(f, rng, { width, depth }) {
  // Jardín de hierba con caminito de piedra blanca.
  f.fill(0, G, 0, width - 1, G, depth - 1, 'grass');
  f.fill(0, F, 0, width - 1, F + 12, depth - 1, 'air');

  const u0 = 4, u1 = width - 5, v0 = 6, v1 = v0 + 9;
  const house = customHouse(f, rng, {
    u0, u1, v0, v1, floors: 2, wall: 'pastel_pink', trim: 'quartz', roof: 'tiles_lilac', name: 'casa de Gina',
  });
  const door = house.door;
  for (let v = 0; v < v0; v++) f.set(door, G, v, 'white_stone');

  // Cartel con su nombre sobre dos postes, a la entrada del jardín.
  const rows = textRows(GINA.nombre);
  const signWidth = rows[0].length;
  const su = door - Math.floor(signWidth / 2);
  for (const u of [su - 1, su + signWidth]) f.fill(u, F, 1, u, F + 7, 1, 'birch_log');
  f.fill(su - 1, F + 2, 1, su + signWidth, F + 8, 1, 'wool_white');
  f.pattern(su, F + 7, 1, rows, { '#': 'wool_magenta' });
  f.fill(door, F, 1, door, F + 1, 1, 'air'); // se pasa por debajo del cartel

  // Flores por todo el jardín delantero.
  for (let v = 0; v < v0 - 1; v++) {
    for (let u = 0; u < width; u++) {
      if (Math.abs(u - door) <= 1 || f.get(u, F, v) !== undefined && f.get(u, F, v) !== 0) continue;
      if ((u + v) % 2 === 0) f.set(u, F, v, FLOWERS[(u + v * 3) % FLOWERS.length]);
    }
  }

  // Columpio a un lado: dos postes, travesaño y asiento colgando.
  const su0 = 1;
  f.fill(su0, F, v0 + 2, su0, F + 3, v0 + 2, 'oak_log');
  f.fill(su0, F, v0 + 5, su0, F + 3, v0 + 5, 'oak_log');
  f.fill(su0, F + 4, v0 + 2, su0, F + 4, v0 + 5, 'oak_log');
  f.fill(su0, F + 1, v0 + 3, su0, F + 1, v0 + 4, 'planks');
  // Cerezo en el otro lado y en el patio de atrás.
  f.tree(width - 2, F, v0 + 3, 'cherry', 5);
  f.tree(door + 3, F, v1 + 3, 'cherry', 4);

  // La habitación de Gina (planta alta): baúl de juguetes, una estrella que
  // brilla y un cuadro con un corazón en la pared del fondo.
  const y = F + 5;
  f.set(u1 - 1, y, v0 + 3, 'planks');
  f.set(u1 - 1, y + 1, v0 + 3, 'gold');
  f.set(door, y + 3, v0 + 4, 'star');
  f.pattern(door - 2, y + 3, v1, ['.p.p.', 'ppppp', '.ppp.', '..p..'], { p: 'wool_pink' });
  // Su colección de cuadros de Brotis, a los lados del corazón.
  for (const du of [-4, 4]) f.painting(door + du, y + 2, v1 - 1);
  f.painting(u0 + 1, y + 2, v0 + 3);
}
