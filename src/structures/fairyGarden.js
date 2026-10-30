// Jardín de las Hadas, al suroeste de la ciudad: laberinto de setos con
// flores y una glorieta en el centro, estanque con islitas de flores,
// casitas-seta de las hadas y nubes flotantes a las que se sube por
// escalones de nube (que hacen botar), unidas por un puente arcoíris.

import { CITY_LEVEL } from '../world/terrain.js';
import { Frame } from './frame.js';
import { house } from './house.js';
import { bench } from './props.js';

const G = CITY_LEVEL;
const F = G + 1;

export const GARDEN = { x0: -95, z0: 48, x1: -52, z1: 88 };
const FLOWERS = ['flower_pink', 'flower_white', 'flower_yellow', 'flower_blue', 'flower_red'];

export function buildFairyGarden(b, rng) {
  const { x0, z0, x1, z1 } = GARDEN;
  b.flatten(x0, z0, x1, z1, G);
  maze(b, rng, -93, 50, 10); // 21 × 21 bloques, entrada al este en (-73, 61)
  pond(b, -62, 55);
  cloudsAndStairs(b);
  // Paseos: desde la Calle de la Luna hacia el norte, y hacia el oeste hasta
  // la entrada del laberinto.
  b.fillBox(-63, G, 64, -61, G, 91, 'white_stone');
  b.fillBox(-72, G, 64, -61, G, 66, 'white_stone');
  b.fillBox(-72, G, 61, -71, G, 64, 'white_stone');
  for (const z of [74, 84]) {
    b.lampPost(-64, F, z);
    b.lampPost(-60, F, z);
  }
  b.lampPost(-68, F, 63);
  // Casitas-seta de las hadas, mirando a los paseos.
  house(new Frame(b, -65, 68, 'north'), rng, { width: 11, depth: 11, name: 'casita de las hadas (oeste)', style: 'mushroom' });
  house(new Frame(b, -59, 70, 'west'), rng, { width: 11, depth: 11, name: 'casita de las hadas (este)', style: 'mushroom' });
  bench(b, -60, F, 70, 'z');
  // Flores por todas partes y lucecitas de hada (estrellas en el suelo).
  for (let i = 0; i < 220; i++) {
    const x = rng.int(x0 + 1, x1 - 1);
    const z = rng.int(z0 + 1, z1 - 1);
    if (b.get(x, F, z) !== 0 || b.get(x, G, z) !== 1) continue; // solo sobre hierba libre
    b.set(x, F, z, rng.chance(0.06) ? 'star' : rng.pick(FLOWERS));
  }
}

// Laberinto de setos generado con semilla (recorrido en profundidad), con la
// entrada al este, una salida al norte y una glorieta en el centro.
function maze(b, rng, mx, mz, cells) {
  const N = cells * 2 + 1;
  const wall = Array.from({ length: N }, () => Array(N).fill(true));
  const center = Math.floor(cells / 2);
  const stack = [[0, 0]];
  const seen = new Set(['0,0']);
  wall[1][1] = false;
  while (stack.length) {
    const [cx, cz] = stack[stack.length - 1];
    const options = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dz]) => [cx + dx, cz + dz, dx, dz])
      .filter(([nx, nz]) => nx >= 0 && nz >= 0 && nx < cells && nz < cells && !seen.has(`${nx},${nz}`));
    if (!options.length) {
      stack.pop();
      continue;
    }
    const [nx, nz, dx, dz] = options[Math.floor(rng.next() * options.length)];
    wall[cz * 2 + 1 + dz][cx * 2 + 1 + dx] = false; // quitar el seto entre las dos celdas
    wall[nz * 2 + 1][nx * 2 + 1] = false;
    seen.add(`${nx},${nz}`);
    stack.push([nx, nz]);
  }
  // Claro en el centro para la glorieta, entrada al este y salida al norte.
  const c = center * 2 + 1;
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) wall[c + dz][c + dx] = false;
  wall[c][N - 1] = false;
  wall[0][1] = false;

  for (let z = 0; z < N; z++) {
    for (let x = 0; x < N; x++) {
      const wx = mx + x, wz = mz + z;
      if (wall[z][x]) {
        b.fillBox(wx, F, wz, wx, F + 1, wz, 'oak_leaves');
        if ((x + z) % 3 === 0) b.set(wx, F + 2, wz, FLOWERS[(x * 7 + z) % FLOWERS.length]); // flores sobre el seto
      } else {
        b.set(wx, G, wz, 'gravel');
        b.set(wx, F, wz, 'air');
        b.set(wx, F + 1, wz, 'air');
      }
    }
  }
  gazebo(b, mx + c, mz + c);
}

// Glorieta: cuatro columnas de cuarzo, tejado rosa en punta, banco y farolillo.
function gazebo(b, cx, cz) {
  b.fillBox(cx - 2, G, cz - 2, cx + 2, G, cz + 2, 'white_stone');
  for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) b.fillBox(cx + dx, F, cz + dz, cx + dx, F + 3, cz + dz, 'quartz');
  b.fillBox(cx - 2, F + 4, cz - 2, cx + 2, F + 4, cz + 2, 'wool_pink');
  b.cone(cx, F + 5, cz, 2, 3, 'wool_pink');
  b.set(cx, F + 8, cz, 'star');
  b.set(cx, F + 3, cz, 'lantern');
  bench(b, cx - 1, F, cz + 1);
}

// Estanque redondo con borde de cuarzo e islitas con flores.
function pond(b, cx, cz) {
  const r = 5;
  for (let dz = -r - 1; dz <= r + 1; dz++) {
    for (let dx = -r - 1; dx <= r + 1; dx++) {
      const d = Math.hypot(dx, dz);
      if (d <= r) {
        b.fillBox(cx + dx, G - 2, cz + dz, cx + dx, G, cz + dz, 'water');
        b.set(cx + dx, G - 3, cz + dz, 'sand');
      } else if (d <= r + 1) {
        b.set(cx + dx, G, cz + dz, 'quartz');
      }
    }
  }
  for (const [dx, dz, flower] of [[-2, -1, 'flower_pink'], [2, 2, 'flower_white'], [1, -3, 'flower_yellow']]) {
    b.set(cx + dx, G, cz + dz, 'grass');
    b.set(cx + dx, F, cz + dz, flower);
  }
}

// Nubes flotantes: dos grandes nubes a distinta altura unidas por un puente
// arcoíris, y una escalera de escalones de nube para subir desde el suelo.
function cloudsAndStairs(b) {
  const puff = (cx, y, cz, rx, rz) => {
    for (let dz = -rz; dz <= rz; dz++) {
      for (let dx = -rx; dx <= rx; dx++) {
        if ((dx * dx) / (rx * rx) + (dz * dz) / (rz * rz) > 1) continue;
        b.set(cx + dx, y, cz + dz, 'cloud');
        if ((dx * dx) / ((rx - 1) ** 2) + (dz * dz) / ((rz - 1) ** 2) <= 0.5) b.set(cx + dx, y + 1, cz + dz, 'cloud');
      }
    }
  };
  // Escalera: un escalón de nube por bloque, subiendo hacia el oeste.
  const steps = 12;
  const sx = -66, sz = 80;
  for (let i = 0; i < steps; i++) {
    b.set(sx - i, F + i, sz, 'cloud');
    b.fillBox(sx - i, F + i + 1, sz, sx - i, F + i + 4, sz, 'air');
  }
  b.stairways.push({ name: 'escalones de nube del Jardín de las Hadas', x: sx + 1, y: F, z: sz, dx: -1, dz: 0, rise: steps });
  // Primera nube, al final de la escalera, con una estrella.
  const y1 = F + steps - 1;
  puff(sx - steps - 4, y1, sz, 5, 4);
  b.set(sx - steps - 4, y1 + 2, sz, 'star');
  // Segunda nube, más alta, unida por un puente arcoíris que sube poco a poco.
  const y2 = y1 + 4;
  const c2 = [sx - steps - 8, sz - 18];
  puff(c2[0], y2, c2[1], 5, 4);
  b.set(c2[0], y2 + 2, c2[1], 'star_orb');
  for (let k = 0; k <= 10; k++) {
    const z = sz - 4 - k;
    const y = y1 + Math.min(4, Math.floor((k * 4) / 10) + (k > 0 ? 1 : 0));
    b.fillBox(sx - steps - 6, y, z, sx - steps - 4, y, z, 'rainbow');
    b.fillBox(sx - steps - 6, y + 1, z, sx - steps - 4, y + 3, z, 'air');
  }
}
