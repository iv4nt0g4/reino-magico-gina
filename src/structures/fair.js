// Zona de feria, al este de la ciudad (al final de la Avenida del Castillo):
// arco de entrada, gran noria, montaña rusa decorativa, taza giratoria,
// casetas de juegos con premios y banderines de colores.

import { CITY_LEVEL } from '../world/terrain.js';
import { marketStall, bench, cart } from './props.js';

const G = CITY_LEVEL;
const F = G + 1;

export const FAIR = { x0: 50, z0: -8, x1: 92, z1: 40 };
const COLORS = ['wool_red', 'wool_yellow', 'wool_light_blue', 'wool_pink', 'wool_lime', 'wool_purple', 'wool_orange', 'wool_cyan'];

export function buildFair(b, rng) {
  const { x0, z0, x1, z1 } = FAIR;
  b.flatten(x0, z0, x1, z1, G);
  // Paseo principal (este-oeste) y paseo de la noria (norte-sur).
  b.fillBox(48, G, 9, x1 - 2, G, 13, 'white_stone');
  b.fillBox(48, G, 10, x1 - 2, G, 12, 'cobblestone');
  b.fillBox(70, G, 14, 74, G, 34, 'white_stone');
  b.fillBox(56, G, -1, 60, G, 8, 'white_stone');

  entranceArch(b, 53);
  ferrisWheel(b, 72, 34);
  rollerCoaster(b);
  teacups(b, 60, 24);
  booths(b, rng);
  bunting(b);

  // Detalles al norte del paseo (fuera de los postes de los banderines):
  // carritos de palomitas y helados, bancos y farolas.
  cart(b, 64, F, 6, 'wool_white');
  cart(b, 80, F, 6, 'wool_pink');
  for (const x of [60, 70, 86]) bench(b, x, F, 6);
  for (const x of [58, 66, 80, 88]) b.lampPost(x, F, 15);
}

// Arco de entrada con columnas de rayas y estrellas.
function entranceArch(b, x) {
  for (const z of [8, 14]) {
    for (let k = 0; k < 8; k++) b.set(x, F + k, z, k % 2 ? 'wool_white' : 'wool_red');
    b.set(x, F + 8, z, 'star');
  }
  b.fillBox(x, F + 8, 9, x, F + 9, 13, 'wool_yellow');
  b.fillBox(x, F + 10, 10, x, F + 10, 12, 'wool_yellow');
  b.set(x, F + 11, 11, 'star');
}

// Noria: rueda vertical (en el plano este-oeste) con radios, ocho cabinas de
// colores colgando y dos patas en forma de A a cada lado.
function ferrisWheel(b, cx, z) {
  const r = 11;
  const hubY = F + r + 6; // la cabina más baja queda justo por encima del suelo
  // Patas: de cada lado, dos postes que suben desde el suelo hasta el eje.
  for (const dz of [-2, 2]) {
    for (const dx of [-6, 6]) {
      for (let k = 0; k <= 12; k++) {
        const t = k / 12;
        b.set(Math.round(cx + dx * (1 - t)), Math.round(F + t * (hubY - F)), z + dz, 'white_stone');
      }
    }
  }
  b.fillBox(cx, hubY, z - 2, cx, hubY, z + 2, 'gold'); // eje
  // Llanta exterior (rosa) e interior (blanca) y radios celestes.
  for (let i = 0; i < 360; i++) {
    const a = (i / 360) * Math.PI * 2;
    b.set(Math.round(cx + Math.cos(a) * r), Math.round(hubY + Math.sin(a) * r), z, 'wool_pink');
    b.set(Math.round(cx + Math.cos(a) * (r - 3)), Math.round(hubY + Math.sin(a) * (r - 3)), z, 'wool_white');
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    for (let d = 1; d < r; d++) b.set(Math.round(cx + Math.cos(a) * d), Math.round(hubY + Math.sin(a) * d), z, 'wool_light_blue');
    // Cabina colgando bajo el punto de la llanta: techo, cuerpo con ventanas.
    const px = Math.round(cx + Math.cos(a) * r);
    const py = Math.round(hubY + Math.sin(a) * r);
    const color = COLORS[k % COLORS.length];
    b.set(px, py - 1, z, 'birch_log'); // enganche
    b.fillBox(px - 1, py - 2, z - 1, px + 1, py - 2, z + 1, color); // techo
    b.fillBox(px - 1, py - 4, z - 1, px + 1, py - 3, z + 1, color);
    b.set(px, py - 3, z - 1, 'glass');
    b.set(px, py - 3, z + 1, 'glass');
    b.fillBox(px - 1, py - 5, z - 1, px + 1, py - 5, z + 1, 'planks'); // suelo
  }
  // Luces en la llanta para la noche.
  for (let k = 0; k < 16; k++) {
    const a = ((k + 0.5) / 16) * Math.PI * 2;
    b.set(Math.round(cx + Math.cos(a) * (r + 1)), Math.round(hubY + Math.sin(a) * (r + 1)), z, 'star');
  }
  b.fillBox(cx - 3, G, z - 3, cx + 3, G, z + 3, 'white_stone'); // plataforma de subida
}

// Montaña rusa decorativa: una vía ondulada de ida y vuelta sobre pilares,
// con un vagoncito amarillo.
function rollerCoaster(b) {
  const xs = [58, 90];
  const track = (x, phase) => F + 6 + Math.round(4 * Math.sin(((x - xs[0]) / (xs[1] - xs[0])) * Math.PI * 3 + phase));
  for (const [z, phase] of [[-4, 0], [3, Math.PI]]) {
    for (let x = xs[0]; x <= xs[1]; x++) {
      const y = track(x, phase);
      b.fillBox(x, y, z, x, y, z + 1, 'planks');
      b.set(x, y + 1, z - 1, 'wool_red');
      b.set(x, y + 1, z + 2, 'wool_red');
      if (x % 4 === 0) {
        b.fillBox(x, F, z, x, y - 1, z, 'birch_log');
        b.fillBox(x, F, z + 1, x, y - 1, z + 1, 'birch_log');
      }
    }
  }
  // Curvas en los extremos para unir las dos vías.
  for (const x of xs) {
    const yA = track(x, 0);
    const yB = track(x, Math.PI);
    const dir = x === xs[0] ? -1 : 1;
    for (let z = -4; z <= 4; z++) {
      const t = (z + 4) / 8;
      const y = Math.round(yA + (yB - yA) * t);
      const bulge = Math.round(Math.sin(t * Math.PI) * 3);
      b.fillBox(x + dir, y, z, x + dir * (1 + bulge), y, z, 'planks');
      b.fillBox(x + dir * (1 + bulge), F, z, x + dir * (1 + bulge), y - 1, z, 'birch_log');
    }
  }
  // Vagoncito en lo alto de una cuesta.
  const cx = 68;
  const cy = track(cx, 0);
  b.fillBox(cx, cy + 1, -4, cx + 2, cy + 1, -3, 'wool_yellow');
  b.set(cx + 2, cy + 2, -4, 'wool_yellow');
  b.set(cx + 2, cy + 2, -3, 'wool_yellow');
}

// Taza giratoria: plataforma redonda con una tetera en el centro y cuatro
// tazas grandes de colores a su alrededor.
function teacups(b, cx, cz) {
  b.cylinder(cx, G, cz, 7, 1, 'wool_light_blue');
  b.cylinder(cx, G, cz, 7, 1, 'wool_white', { hollow: true, inside: null });
  // Tetera: cuerpo redondo, tapa, asa y pitorro.
  b.cylinder(cx, F, cz, 2, 3, 'quartz');
  b.cylinder(cx, F + 3, cz, 1, 1, 'wool_pink');
  b.set(cx, F + 4, cz, 'gold');
  b.fillBox(cx + 3, F + 1, cz, cx + 3, F + 2, cz, 'quartz'); // asa
  b.set(cx - 3, F + 2, cz, 'quartz'); // pitorro
  b.set(cx - 4, F + 3, cz, 'quartz');
  ['wool_pink', 'wool_yellow', 'wool_lime', 'wool_purple'].forEach((color, k) => {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const tx = Math.round(cx + Math.cos(a) * 4.5);
    const tz = Math.round(cz + Math.sin(a) * 4.5);
    b.cylinder(tx, F, tz, 1, 2, color);
    b.set(tx, F + 1, tz, 'air'); // hueco para sentarse
    b.set(tx, F, tz, 'wool_white'); // asiento
    b.set(tx + Math.round(Math.cos(a) * 2), F + 1, tz + Math.round(Math.sin(a) * 2), color); // asa
  });
}

// Casetas de juegos con premios: cuadros de Brotis y peluches de colores.
function booths(b, rng) {
  const prizes = ['cuadro_brotis_feliz', 'cuadro_brotis_guino', 'cuadro_brotis_flor', 'cuadro_brotis_dormido'];
  [[78, 17], [84, 17], [78, 24], [84, 24]].forEach(([x, z], k) => {
    marketStall(b, x, F, z, rng);
    b.set(x, F + 1, z, prizes[k % prizes.length]);
    b.set(x + 1, F + 1, z, COLORS[(k * 3) % COLORS.length]);
    // Diana de colores en la parte de atrás.
    b.set(x, F + 1, z + 2, 'wool_red');
    b.set(x + 1, F + 1, z + 2, 'wool_white');
    b.set(x, F + 2, z + 2, 'wool_white');
    b.set(x + 1, F + 2, z + 2, 'wool_red');
  });
}

// Banderines de colores colgando a lo largo del paseo principal.
function bunting(b) {
  for (const z of [8, 14]) {
    // Cuerda blanca con una banderita de color cada dos bloques.
    for (let x = 55; x <= 90; x++) {
      b.set(x, F + 5, z, 'wool_white');
      if (x % 2 === 0) b.set(x, F + 4, z, COLORS[(x / 2) % COLORS.length]);
    }
    for (let x = 55; x <= 90; x += 7) b.fillBox(x, F, z, x, F + 4, z, 'birch_log');
  }
}

