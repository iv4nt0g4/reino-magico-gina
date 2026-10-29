// Estación de tren con andén cubierto, vías y un trenecito decorativo parado.

import { CITY_LEVEL } from '../world/terrain.js';
import { bench } from './props.js';

const G = CITY_LEVEL;
const F = G + 1;

// Edificio en (x0..x1, z0..z1) con el andén al sur (z1 + 1 ... z1 + 2) y las vías detrás.
export function station(b, f) {
  // f: Frame mirando al sur (u = +x), con la fachada en el borde sur de la parcela.
  const W = 17;
  f.fill(0, G, 0, W - 1, G, 10, 'grass');
  f.fill(0, F, 0, W - 1, F, 10, 'air');
  const u0 = 1, u1 = W - 2, v0 = 2, v1 = 9, top = G + 7;
  f.hollow(u0, G, v0, u1, top, v1, 'bricks', { floor: 'planks', ceiling: 'planks' });
  for (const [u, v] of [[u0, v0], [u1, v0], [u0, v1], [u1, v1]]) f.fill(u, G, v, u, top, v, 'white_stone');
  f.fill(u0, F + 3, v0, u1, F + 3, v0, 'white_stone');
  for (const u of [3, 4, 12, 13]) f.fill(u, F + 1, v0, u, F + 2, v0, 'glass');
  f.fill(7, F, v0, 9, F + 2, v0, 'air'); // puerta grande al andén
  f.door(8, F, v0, 'estación');
  f.roof(u0, top, v0, u1, v1, 'tiles_red', { ridge: 'u', gable: 'bricks' });
  // Reloj pequeño sobre la puerta.
  f.pattern(7, F + 6, v0, ['ggg', 'gkg', 'ggg'], { g: 'gold', k: 'quartz' });
  // Dentro: taquilla, bancos y lámparas.
  f.fill(u0 + 1, F, v1 - 2, u0 + 4, F, v1 - 2, 'quartz');
  f.set(u0 + 2, F + 1, v1 - 2, 'wool_red');
  for (const u of [10, 13]) {
    const [x, z] = f.world(u, v0 + 3);
    bench(b, x, F, z);
  }
  for (const u of [4, 12]) f.set(u, top - 1, 5, 'lantern');

  // Andén cubierto delante (v = 0..1).
  f.fill(0, G, 0, W - 1, G, 1, 'white_stone');
  f.fill(0, G, 0, W - 1, G, 0, 'wool_yellow'); // línea de seguridad
  for (const u of [0, 4, 12, 16]) f.fill(u, F, 1, u, F + 2, 1, 'white_stone'); // postes (ninguno delante de la puerta)
  f.fill(0, F + 3, 0, W - 1, F + 3, 1, 'tiles_red');
  for (let u = 2; u < W; u += 8) f.set(u, F + 2, 0, 'lantern');
}

// Vías de este a oeste en z0..z0+2, de x0 a x1, con el tren parado.
export function railway(b, x0, x1, z0) {
  b.fillBox(x0, G, z0, x1, G, z0 + 2, 'gravel');
  b.fillBox(x0, F, z0, x1, F + 5, z0 + 2, 'air');
  for (let x = x0; x <= x1; x += 2) b.set(x, G, z0 + 1, 'planks'); // traviesas
  b.fillBox(x0, G, z0, x1, G, z0, 'wool_gray'); // raíles
  b.fillBox(x0, G, z0 + 2, x1, G, z0 + 2, 'wool_gray');

  // Locomotora roja con chimenea y cabina, y dos vagones de colores.
  const lx = x1 - 12;
  const zc = z0 + 1;
  wheels(b, lx, lx + 6, z0);
  b.fillBox(lx + 2, F + 1, z0, lx + 6, F + 2, z0 + 2, 'wool_red'); // caldera
  b.fillBox(lx + 6, F + 1, zc, lx + 6, F + 2, zc, 'wool_black'); // frente
  b.set(lx + 7, F, zc, 'wool_yellow'); // farol delantero
  b.fillBox(lx + 5, F + 3, zc, lx + 5, F + 4, zc, 'wool_black'); // chimenea
  b.fillBox(lx, F + 1, z0, lx + 1, F + 3, z0 + 2, 'wool_red'); // cabina
  b.fillBox(lx, F + 2, z0, lx + 1, F + 2, z0, 'glass');
  b.fillBox(lx, F + 2, z0 + 2, lx + 1, F + 2, z0 + 2, 'glass');
  b.fillBox(lx - 1, F + 4, z0, lx + 2, F + 4, z0 + 2, 'wool_black'); // techo de la cabina
  carriage(b, lx - 7, z0, 'wool_light_blue');
  carriage(b, lx - 14, z0, 'wool_yellow');
}

function wheels(b, xa, xb, z0) {
  for (let x = xa; x <= xb; x += 2) {
    b.set(x, F, z0, 'wool_black');
    b.set(x, F, z0 + 2, 'wool_black');
  }
}

function carriage(b, x, z0, color) {
  wheels(b, x, x + 5, z0);
  b.fillBox(x, F + 1, z0, x + 5, F + 3, z0 + 2, color);
  for (let k = x + 1; k <= x + 4; k += 2) {
    b.set(k, F + 2, z0, 'glass');
    b.set(k, F + 2, z0 + 2, 'glass');
  }
  b.fillBox(x, F + 4, z0, x + 5, F + 4, z0 + 2, 'wool_white');
}
