// Bahía del Pirata, al noreste de la ciudad: un lago con un barco pirata de
// madera (su bandera lleva una estrella, nada de calaveras), un faro de rayas
// con escalera hasta la luz, un muelle y una islita con un cofre del tesoro
// lleno de bloques especiales de regalo.

import { CITY_LEVEL } from '../world/terrain.js';

const G = CITY_LEVEL;
const F = G + 1;

export const BAY = { x0: 52, z0: -100, x1: 98, z1: -52 };
const LAKE = { x: 76, z: -78, rx: 20, rz: 18 };
const inLake = (x, z, extra = 0) => ((x - LAKE.x) / (LAKE.rx + extra)) ** 2 + ((z - LAKE.z) / (LAKE.rz + extra)) ** 2 <= 1;

export function buildPirateBay(b) {
  const { x0, z0, x1, z1 } = BAY;
  b.flatten(x0, z0, x1, z1, G);
  lake(b);
  island(b, 64, -90);
  ship(b, 70, -80);
  pier(b);
  lighthouse(b, 53, -66);
  // Camino desde el final de la calle del Barrio del Norte: baja por el
  // oeste y rodea el lago por el sur hasta el muelle, con un ramal al faro.
  b.fillBox(48, G, -66, 51, G, -64, 'gravel');
  b.fillBox(50, G, -64, 52, G, -54, 'gravel');
  b.fillBox(50, G, -56, 81, G, -54, 'gravel');
  b.fillBox(56, G, -59, 56, G, -57, 'gravel');
}

// Lago: agua hasta el nivel del suelo, fondo de arena y playita alrededor.
function lake(b) {
  for (let z = LAKE.z - LAKE.rz - 3; z <= LAKE.z + LAKE.rz + 3; z++) {
    for (let x = LAKE.x - LAKE.rx - 3; x <= LAKE.x + LAKE.rx + 3; x++) {
      if (inLake(x, z)) {
        const edge = !inLake(x, z, -3);
        const depth = edge ? 2 : 6;
        b.fillBox(x, G - depth, z, x, G, z, 'water');
        b.set(x, G - depth - 1, z, 'sand');
      } else if (inLake(x, z, 2)) {
        b.set(x, G, z, 'sand');
      }
    }
  }
}

// Islita con una palmera, monedas de oro y el cofre del tesoro abierto.
function island(b, cx, cz) {
  for (let dz = -3; dz <= 3; dz++) {
    for (let dx = -3; dx <= 3; dx++) {
      if (dx * dx + dz * dz > 10) continue;
      b.fillBox(cx + dx, G - 6, cz + dz, cx + dx, G, cz + dz, 'sand');
      b.set(cx + dx, F, cz + dz, 'air');
    }
  }
  // Palmera: tronco inclinado y hojas en estrella.
  for (let k = 0; k < 6; k++) b.set(cx - 2 + Math.floor(k / 3), F + k, cz + 2, 'oak_log');
  const top = [cx - 1, F + 6, cz + 2];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [3, 1], [-3, -1]]) {
    b.set(top[0] + dx, top[1] - (Math.abs(dx) + Math.abs(dz) > 2 ? 1 : 0), top[2] + dz, 'oak_leaves');
  }
  b.set(...top, 'oak_leaves');
  // Cofre del tesoro: caja de madera con esquinas de oro, tapa abierta y,
  // dentro, regalos: esferas de estrella, arcoíris, estrellas y oro.
  const x0 = cx - 1, z0 = cz - 1;
  b.fillBox(x0, F, z0, x0 + 3, F, z0 + 2, 'planks');
  b.fillBox(x0, F + 1, z0, x0 + 3, F + 1, z0 + 2, 'planks');
  for (const [x, z] of [[x0, z0], [x0 + 3, z0], [x0, z0 + 2], [x0 + 3, z0 + 2]]) b.fillBox(x, F, z, x, F + 1, z, 'gold');
  b.set(x0 + 1, F + 1, z0 + 1, 'star_orb');
  b.set(x0 + 2, F + 1, z0 + 1, 'rainbow');
  b.set(x0 + 1, F + 2, z0 + 1, 'star');
  b.set(x0 + 2, F + 2, z0 + 1, 'golden_hair');
  b.fillBox(x0, F + 2, z0 - 1, x0 + 3, F + 3, z0 - 1, 'planks'); // tapa levantada
  b.set(x0 + 1, F + 2, z0 - 1, 'gold'); // cerradura
  // Monedas de oro por la arena.
  for (const [dx, dz] of [[-3, 0], [2, 2], [0, 3], [-1, -3]]) b.set(cx + dx, F, cz + dz, 'gold');
  // Camino de piedras para llegar saltando desde la orilla oeste.
  for (const [x, z] of [[60, -90], [58, -89], [56, -88]]) b.fillBox(x, G - 6, z, x, G, z, 'cobblestone');
}

// Barco pirata: casco de madera con franja roja y portillas, cubierta, dos
// mástiles con velas blancas, camarote en la popa y bandera con una estrella.
function ship(b, x0, cz) {
  const L = 21; // eslora (de oeste a este; la proa mira al este)
  const deck = G + 2;
  for (let i = 0; i < L; i++) {
    const x = x0 + i;
    // El casco se estrecha hacia la proa y hacia el fondo.
    const bow = Math.max(0, i - (L - 5));
    const half = 3 - Math.ceil(bow * 0.7);
    for (let y = G - 3; y <= deck; y++) {
      const h = half - (y < G - 1 ? 1 : 0) - (y < G - 2 ? 1 : 0);
      if (h < 0) continue;
      for (let dz = -h; dz <= h; dz++) {
        const side = Math.abs(dz) === h;
        let block = 'planks';
        if (y === deck) block = side ? 'oak_log' : 'planks';
        else if (side) block = y === G ? 'wool_red' : y === G + 1 && i % 4 === 2 && i < L - 4 ? 'glass' : 'oak_log';
        else block = 'planks';
        b.set(x, y, cz + dz, block);
      }
    }
    // Barandilla en cubierta.
    if (half >= 1) {
      b.set(x, deck + 1, cz - half, 'oak_log');
      b.set(x, deck + 1, cz + half, 'oak_log');
    }
  }
  b.fillBox(x0 + L, deck, cz, x0 + L + 2, deck, cz, 'oak_log'); // bauprés
  // Mástiles y velas.
  for (const [mx, h] of [[x0 + 8, 13], [x0 + 14, 11]]) {
    b.fillBox(mx, deck + 1, cz, mx, deck + h, cz, 'oak_log');
    b.fillBox(mx + 1, deck + 4, cz - 3, mx + 1, deck + h - 2, cz + 3, 'wool_white');
    b.fillBox(mx + 1, deck + 6, cz - 3, mx + 1, deck + 6, cz + 3, 'wool_red'); // franja roja
    b.fillBox(mx, deck + h - 1, cz - 4, mx, deck + h - 1, cz + 4, 'oak_log'); // verga
  }
  // Bandera negra con una estrella dorada en el mástil mayor.
  const fy = deck + 14;
  b.fillBox(x0 + 8, fy - 1, cz, x0 + 8, fy + 1, cz, 'oak_log');
  b.fillBox(x0 + 6, fy, cz, x0 + 7, fy + 1, cz, 'wool_black');
  b.set(x0 + 5, fy, cz, 'wool_black');
  b.set(x0 + 5, fy + 1, cz, 'star');
  // Camarote del capitán en la popa (oeste), con puerta hacia la cubierta.
  b.hollowBox(x0, deck, cz - 2, x0 + 4, deck + 4, cz + 2, 'planks', { floor: 'planks', ceiling: 'oak_log' });
  b.fillBox(x0 + 4, deck + 1, cz, x0 + 4, deck + 2, cz, 'air');
  b.doors.push({ name: 'camarote del barco pirata', x: x0 + 4, y: deck + 1, z: cz, inX: x0 + 3, inZ: cz, outX: x0 + 5, outZ: cz });
  b.set(x0, deck + 2, cz, 'glass');
  b.set(x0 + 2, deck + 2, cz - 2, 'glass');
  b.set(x0 + 2, deck + 2, cz + 2, 'glass');
  b.set(x0 + 1, deck + 1, cz - 1, 'gold'); // un poco de tesoro
  b.set(x0 + 1, deck + 1, cz + 1, 'bookshelf'); // mapas
  b.set(x0 + 2, deck + 3, cz, 'lantern');
  b.set(x0 + 6, deck + 1, cz, 'gold'); // timón
  b.set(x0 + 6, deck + 2, cz, 'oak_log');
  b.set(x0 + 12, deck + 2, cz - 2, 'lantern');
  b.set(x0 + 12, deck + 2, cz + 2, 'lantern');
}

// Muelle de madera que entra en el lago desde la orilla sur hasta el barco,
// con farolas y una pasarela de dos peldaños para subir a cubierta.
function pier(b) {
  const x = 80;
  for (let z = -57; z >= -74; z--) {
    b.fillBox(x - 1, G, z, x + 1, G, z, 'planks');
    b.fillBox(x - 1, F, z, x + 1, F + 3, z, 'air');
    if (z % 4 === 0) {
      b.fillBox(x - 1, G - 6, z, x - 1, G - 1, z, 'oak_log');
      b.fillBox(x + 1, G - 6, z, x + 1, G - 1, z, 'oak_log');
    }
  }
  b.lampPost(x - 1, F, -74);
  b.lampPost(x + 1, F, -74);
  b.lampPost(x - 1, F, -62);
  // Pasarela: dos peldaños hasta la borda, que tiene un hueco en la barandilla.
  b.set(x, G + 1, -75, 'planks');
  b.set(x, G + 2, -76, 'planks');
  b.fillBox(x, G + 2, -75, x, G + 5, -75, 'air');
  b.fillBox(x, G + 3, -77, x, G + 5, -76, 'air');
  b.stairways.push({ name: 'pasarela del barco pirata', x, y: F, z: -74, dx: 0, dz: -1, rise: 2 });
}

// Faro de rayas rojas y blancas con escalera de caracol por dentro y la luz
// arriba, en un mirador con barandilla.
function lighthouse(b, x0, z0) {
  const S = 7; // planta de 7 × 7 (dentro, 5 × 5)
  const H = 18; // altura de la torre
  b.fillBox(x0, G, z0, x0 + S - 1, G, z0 + S - 1, 'cobblestone');
  for (let y = F; y < F + H; y++) {
    const stripe = Math.floor((y - F) / 3) % 2 ? 'wool_red' : 'wool_white';
    b.ring(x0, y, z0, x0 + S - 1, z0 + S - 1, stripe);
    b.fillBox(x0 + 1, y, z0 + 1, x0 + S - 2, y, z0 + S - 2, 'air');
  }
  // Puerta al sur, hacia el camino.
  const door = x0 + 3;
  b.fillBox(door, F, z0 + S - 1, door, F + 1, z0 + S - 1, 'air');
  b.doors.push({ name: 'faro', x: door, y: F, z: z0 + S - 1, inX: door, inZ: z0 + S - 2, outX: door, outZ: z0 + S });
  // Escalera de caracol: peldaños sueltos que dan la vuelta pegados a las
  // paredes, cada uno un bloque más alto que el anterior.
  const ring = [];
  for (let x = x0 + 1; x <= x0 + 5; x++) ring.push([x, z0 + 1]); // norte, hacia el este
  for (let z = z0 + 2; z <= z0 + 5; z++) ring.push([x0 + 5, z]); // este, hacia el sur
  for (let x = x0 + 4; x >= x0 + 1; x--) ring.push([x, z0 + 5]); // sur, hacia el oeste
  for (let z = z0 + 4; z >= z0 + 2; z--) ring.push([x0 + 1, z]); // oeste, hacia el norte
  // Empieza junto a la puerta (lado sur) y sube en sentido horario.
  const startIndex = ring.findIndex(([x, z]) => x === x0 + 2 && z === z0 + 5);
  const STEPS = H - 4;
  const path = [];
  for (let k = 0; k < STEPS; k++) path.push(ring[(startIndex + k) % ring.length]);
  path.forEach(([x, z], k) => b.set(x, F + k, z, 'planks'));
  // Registrar los tramos rectos para la comprobación automática.
  let segStart = 0;
  for (let k = 1; k <= path.length; k++) {
    const dir = (i) => [path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]];
    const changes = k === path.length || (k >= 2 && (dir(k)[0] !== dir(k - 1)[0] || dir(k)[1] !== dir(k - 1)[1]));
    if (!changes) continue;
    const from = segStart === 0 ? [door, z0 + 5] : path[segStart - 1]; // pie del tramo
    const [dx, dz] = segStart === 0 ? [path[0][0] - door, path[0][1] - (z0 + 5)] : dir(segStart);
    b.stairways.push({ name: `faro: tramo ${b.stairways.length}`, x: from[0], y: F + segStart, z: from[1], dx, dz, rise: k - segStart });
    segStart = k;
  }
  // Mirador: suelo arriba (con hueco sobre el último peldaño), luz y barandilla.
  const top = F + STEPS - 1; // altura del último peldaño
  b.fillBox(x0 + 1, top, z0 + 1, x0 + S - 2, top, z0 + S - 2, 'planks');
  const [lx, lz] = path[path.length - 1];
  b.set(lx, top, lz, 'planks');
  // Hueco sobre los últimos peldaños, para no darse con la cabeza al saltar.
  for (const [x, z] of path.slice(-5, -1)) b.set(x, top, z, 'air');
  b.set(x0 + 3, top + 1, z0 + 3, 'shiny_stone'); // la luz del faro
  b.ring(x0, top + 1, z0, x0 + S - 1, z0 + S - 1, 'white_stone'); // barandilla
  // Cristaleras alrededor de la luz, para que se vea de lejos.
  for (const y of [top + 2, top + 3]) b.ring(x0, y, z0, x0 + S - 1, z0 + S - 1, 'glass');
  for (const [x, z] of [[x0, z0], [x0 + S - 1, z0], [x0, z0 + S - 1], [x0 + S - 1, z0 + S - 1]]) b.fillBox(x, top + 2, z, x, top + 3, z, 'wool_red');
  b.fillBox(x0, top + 4, z0, x0 + S - 1, top + 4, z0 + S - 1, 'wool_red');
  b.cone(x0 + 3, top + 5, z0 + 3, 3, 4, 'wool_red');
}
