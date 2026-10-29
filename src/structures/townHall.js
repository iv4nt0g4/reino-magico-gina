// Ayuntamiento con torre del reloj, en la Calle Principal.

import { CITY_LEVEL } from '../world/terrain.js';

const G = CITY_LEVEL;
const F = G + 1;

// Esfera del reloj (marco de oro, cuarzo y agujas negras marcando las tres).
const CLOCK = ['.ggggg.', 'gwwkwwg', 'gwwkwwg', 'gwwkkkg', 'gwwwwwg', 'gwwwwwg', '.ggggg.'];
const CLOCK_PALETTE = { g: 'gold', w: 'quartz', k: 'wool_black' };
const G_BANNER = ['pwwwp', 'wpppp', 'wpwwp', 'wppwp', 'pwwwp'];

export function townHall(f, { width, depth }) {
  const u0 = 1, u1 = width - 2, v0 = 4, v1 = depth - 2;
  const door = Math.floor((u0 + u1) / 2);
  f.fill(0, G, 0, width - 1, G, depth - 1, 'white_stone');
  f.fill(0, F, 0, width - 1, F, depth - 1, 'air');

  // Salón: una planta alta de piedra blanca con tejado celeste.
  const top = G + 8;
  f.hollow(u0, G, v0, u1, top, v1, 'white_stone', { floor: 'quartz', ceiling: 'quartz' });
  for (const [u, v] of [[u0, v0], [u1, v0], [u0, v1], [u1, v1]]) f.fill(u, G, v, u, top, v, 'quartz');
  for (let v = v0 + 2; v < v1; v += 3) {
    f.fill(u0, F + 1, v, u0, F + 4, v, 'glass');
    f.fill(u1, F + 1, v, u1, F + 4, v, 'glass');
  }
  f.roof(u0, top, v0, u1, v1, 'tiles_sky', { ridge: 'v', gable: 'white_stone' });

  // Torre del reloj delante del salón, con la puerta abajo.
  const t0 = door - 3, t1 = door + 3, tv0 = 1, tv1 = v0 + 1;
  const towerTop = G + 17;
  f.hollow(t0, G, tv0, t1, towerTop, tv1, 'white_stone', { floor: 'quartz', ceiling: 'quartz' });
  for (const [u, v] of [[t0, tv0], [t1, tv0], [t0, tv1], [t1, tv1]]) f.fill(u, G, v, u, towerTop, v, 'quartz');
  f.fill(t0 + 1, F, tv1, t1 - 1, F + 4, tv1, 'air'); // la torre se abre al salón
  f.fill(door - 1, F, tv0, door + 1, F + 2, tv0, 'air'); // portalón de 3
  f.door(door, F, tv0, 'ayuntamiento');
  f.pattern(t0, towerTop - 2, tv0, CLOCK, CLOCK_PALETTE);
  // Tejado puntiagudo con bandera.
  const [cx, cz] = f.world(door, Math.floor((tv0 + tv1) / 2));
  f.b.cone(cx, towerTop + 1, cz, 4, 7, 'tiles_sky');
  for (let y = towerTop + 8; y < towerTop + 11; y++) f.b.set(cx, y, cz, 'birch_log');
  f.b.set(cx, towerTop + 10, cz, 'gold');

  // Dentro: alfombra roja, mesa del alcalde, estanterías, lámparas y estandarte.
  f.fill(door, G, tv0 + 1, door, G, v1 - 1, 'wool_red');
  f.fill(door - 1, F, v1 - 3, door + 1, F, v1 - 3, 'planks');
  f.set(door, F, v1 - 2, 'wool_red');
  for (let v = v0 + 2; v < v1 - 3; v += 3) {
    f.fill(u0 + 1, F, v, u0 + 1, F + 2, v, 'bookshelf');
    f.fill(u1 - 1, F, v, u1 - 1, F + 2, v, 'bookshelf');
  }
  for (let v = v0 + 2; v < v1; v += 4) f.set(door, top - 1, v, 'lantern');
  f.set(door, towerTop - 9, tv0 + 1, 'lantern');
  f.pattern(door - 2, F + 6, v1 - 1, G_BANNER, { p: 'wool_pink', w: 'wool_white' });
  // Columnas en la entrada.
  for (const u of [t0 - 1, t1 + 1]) f.fill(u, F, tv0, u, F + 3, tv0, 'quartz');
}
