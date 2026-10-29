// Granja del molino: molino de viento con aspas, campos de cultivo, almiar
// y carreta.

import { CITY_LEVEL } from '../world/terrain.js';
import { cart, barrels } from './props.js';

const G = CITY_LEVEL;
const F = G + 1;

export function windmill(b, x, z) {
  b.fillBox(x - 4, F, z - 4, x + 4, F + 16, z + 4, 'air');
  b.cylinder(x, G, z, 3, 12, 'white_stone', { hollow: true });
  b.cylinder(x, G, z, 2, 1, 'planks');
  for (let y = G + 4; y < G + 12; y += 4) b.cylinder(x, y, z, 3, 1, 'planks', { hollow: true, inside: null });
  b.cone(x, G + 12, z, 4, 6, 'tiles_red');
  // Puerta al sur y ventanas.
  b.fillBox(x, F, z + 3, x, F + 1, z + 3, 'air');
  b.doors.push({ name: 'molino', x, y: F, z: z + 3, inX: x, inZ: z + 2, outX: x, outZ: z + 4 });
  b.set(x + 3, F + 5, z, 'glass');
  b.set(x - 3, F + 5, z, 'glass');
  b.set(x, G + 10, z, 'lantern');
  // Aspas en la cara sur: un buje y cuatro brazos con velas blancas.
  const hubY = G + 10;
  const hz = z + 4;
  b.set(x, hubY, hz, 'oak_log');
  for (let k = 1; k <= 6; k++) {
    b.set(x + k, hubY, hz, 'planks');
    b.set(x - k, hubY, hz, 'planks');
    b.set(x, hubY + k, hz, 'planks');
    if (hubY - k > F + 1) b.set(x, hubY - k, hz, 'planks');
    if (k >= 2) {
      b.set(x + k, hubY + 1, hz, 'wool_white');
      b.set(x - k, hubY - 1, hz, 'wool_white');
      b.set(x - 1, hubY + k, hz, 'wool_white');
      if (hubY - k > F + 1) b.set(x + 1, hubY - k, hz, 'wool_white');
    }
  }
}

// Campos en (x0..x1, z0..z1): surcos de tierra con cultivos y un camino en medio.
export function fields(b, x0, z0, x1, z1) {
  b.fillBox(x0, F, z0, x1, F, z1, 'air');
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      const furrow = (z - z0) % 3 === 2;
      b.set(x, G, z, furrow ? 'dirt' : 'grass');
      if (!furrow) b.set(x, F, z, (x + z) % 5 === 0 ? 'flower_yellow' : 'tall_grass');
    }
  }
}

export function farmyard(b, rng, x, z) {
  b.fillBox(x - 2, F, z - 2, x + 2, F + 3, z + 2, 'air');
  b.fillBox(x, F, z, x + 1, F + 1, z + 1, 'wool_yellow'); // almiar
  b.set(x, F + 2, z, 'wool_yellow');
  cart(b, x - 2, F, z + 2, 'wool_orange');
  barrels(b, x + 2, F, z - 2, rng);
}
