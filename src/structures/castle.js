// El Castillo de Gina: castillo de cuento en piedra blanca y rosa pastel,
// con foso y puente levadizo, muralla con camino de ronda, torres con tejados
// cónicos de tejas lilas y celestes, y banderas con una "G".
// Dentro: salón del trono, habitación de princesa con cama con dosel y
// balcón, biblioteca, y las antiguas mazmorras convertidas en sala de juegos.
//
// Está centrado en x = 0 y se extiende hacia el norte (z negativa). Gina
// aparece en el camino, delante del puente, mirando al castillo.

import { CITY_LEVEL } from '../world/terrain.js';
import { paintingAt } from './frame.js';

const G = CITY_LEVEL; // altura del suelo (bloque de hierba)
const F = G + 1; // primera altura libre sobre el suelo

export const CASTLE_SPAWN = { x: 0.5, y: F, z: 3.5, yaw: 0 }; // en el camino, mirando al norte hacia la puerta

// Bandera con una G (blanca sobre rosa, con borde magenta y flecos).
const G_BANNER = [
  'mmmmmmm',
  'mpwwwpm',
  'mwppppm',
  'mwpwwpm',
  'mwppwpm',
  'mpwwwpm',
  'mmmmmmm',
  'm m m m',
];
// Versión pequeña (5 × 5, sin borde) para las paredes del salón del trono.
const SMALL_G_BANNER = ['pwwwp', 'wpppp', 'wpwwp', 'wppwp', 'pwwwp'];
const BANNER_PALETTE = { m: 'wool_magenta', p: 'wool_pink', w: 'wool_white' };
// La misma bandera vista desde el otro lado (para colgarla en paredes que miran al oeste).
const mirrored = (rows) => rows.map((row) => [...row].reverse().join(''));

export function buildCastle(b) {
  clearGround(b);
  buildMoatAndBridge(b);
  buildCurtainWall(b);
  buildCornerTowers(b);
  buildGate(b);
  buildCourtyard(b);
  buildCentralTower(b, 'lower');
  buildKeep(b);
  buildCentralTower(b, 'upper');
}

// Quitar flores y hierba alta de la zona del castillo.
function clearGround(b) {
  b.fillBox(-27, F, -60, 27, F, 8, 'air');
}

function buildMoatAndBridge(b) {
  // Foso de 3 bloques de ancho alrededor de la muralla, forrado de adoquines.
  b.fillBox(-25, G - 4, -57, 25, G - 1, -7, 'cobblestone');
  b.fillBox(-24, G - 3, -56, 24, G - 1, -8, 'water');
  b.fillBox(-21, G - 4, -53, 21, G - 1, -11, 'dirt'); // el interior vuelve a ser tierra
  b.fillBox(-25, G, -57, 25, G, -7, 'grass');
  b.fillBox(-24, G, -56, 24, G, -8, 'air'); // el agua queda un bloque por debajo del suelo
  b.fillBox(-21, G, -53, 21, G, -11, 'grass');

  // Puente levadizo (bajado) con barandillas y farolillos.
  b.fillBox(-3, G, -10, 3, G, -8, 'planks');
  for (const x of [-3, 3]) {
    for (const z of [-10, -8]) {
      b.set(x, F, z, 'white_stone');
      b.set(x, F + 1, z, 'lantern');
    }
    b.set(x, F, -9, 'planks');
  }
  // Camino de adoquines: desde donde aparece Gina hasta la puerta.
  b.fillBox(-2, G, -7, 2, G, 6, 'cobblestone');
  b.fillBox(-2, G, -15, 2, G, -11, 'cobblestone');
  for (const x of [-3, 3]) {
    for (const z of [-4, 2]) lampPost(b, x, z);
  }
  // Farolas alrededor de la orilla exterior del foso (para que brille de noche).
  for (let k = -20; k <= 20; k += 10) {
    if (Math.abs(k) > 2) lampPost(b, k, -6);
    lampPost(b, k, -58);
  }
  for (let z = -50; z <= -14; z += 9) {
    lampPost(b, -26, z);
    lampPost(b, 26, z);
  }
}

const lampPost = (b, x, z) => b.lampPost(x, F, z);

function buildCurtainWall(b) {
  // Muralla de 2 bloques de grosor y 8 de alto.
  b.fillBox(-16, F, -48, 16, F + 7, -16, 'white_stone');
  b.fillBox(-14, F, -46, 14, F + 7, -18, 'air');
  b.ring(-16, F + 4, -48, 16, -16, 'pastel_pink'); // franja rosa
  // Almenas en el borde exterior, una sí y una no.
  for (let x = -16; x <= 16; x++) {
    for (let z = -48; z <= -16; z++) {
      const outer = x === -16 || x === 16 || z === -48 || z === -16;
      if (outer && (x + z) % 2 === 0) b.set(x, F + 8, z, 'white_stone');
    }
  }
  // Farolillos en el borde interior del camino de ronda.
  for (let k = -12; k <= 12; k += 8) {
    b.set(k, F + 8, -17, 'lantern');
    b.set(k, F + 8, -47, 'lantern');
    b.set(-15, F + 8, k - 32, 'lantern');
    b.set(15, F + 8, k - 32, 'lantern');
  }
  // Escaleras desde el patio hasta lo alto de la muralla (oeste y este); el
  // último peldaño queda a la altura del camino de ronda.
  b.stairs(-14, F, -22, 0, -1, 8, 'white_stone');
  b.stairs(14, F, -22, 0, -1, 8, 'white_stone');
}

// Torre redonda con franjas, ventanas, tejado cónico y banderín.
function tower(b, cx, cz, r, height, tiles, pennant) {
  const top = F + height;
  b.cylinder(cx, F, cz, r, height, 'pastel_pink', { hollow: true });
  for (let y = F + 4; y < top; y += 4) b.cylinder(cx, y, cz, r, 1, 'white_stone', { hollow: true, inside: null });
  b.cylinder(cx, top - 1, cz, r, 1, 'white_stone'); // suelo del tejado
  for (let y = F + 5; y < top - 2; y += 5) {
    for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) b.window(cx + dx, y, cz + dz, 'x', 1, 2);
  }
  const roofHeight = r * 2 + 2;
  b.cone(cx, top, cz, r + 1, roofHeight, tiles);
  // Palo y banderín en la punta.
  const apex = top + roofHeight;
  for (let y = apex; y < apex + 3; y++) b.set(cx, y, cz, 'birch_log');
  b.fillBox(cx + 1, apex + 1, cz, cx + 2, apex + 2, cz, pennant);
}

function buildCornerTowers(b) {
  tower(b, -16, -16, 4, 16, 'tiles_lilac', 'wool_light_blue');
  tower(b, 16, -16, 4, 16, 'tiles_sky', 'wool_pink');
  tower(b, -16, -48, 4, 16, 'tiles_sky', 'wool_pink');
  tower(b, 16, -48, 4, 16, 'tiles_lilac', 'wool_light_blue');
}

function buildGate(b) {
  // Arco de entrada de 3 × 4 con marco de cuarzo.
  b.fillBox(-2, F, -17, 2, F + 4, -16, 'quartz');
  b.fillBox(-1, F, -17, 1, F + 3, -16, 'air');
  // Dos torres que custodian la puerta, cada una con su bandera de la G.
  tower(b, -5, -16, 3, 13, 'tiles_sky', 'wool_pink');
  tower(b, 5, -16, 3, 13, 'tiles_lilac', 'wool_light_blue');
  b.pattern(-8, F + 11, -12, 'x', G_BANNER, BANNER_PALETTE);
  b.pattern(2, F + 11, -12, 'x', G_BANNER, BANNER_PALETTE);
}

function buildCourtyard(b) {
  // Camino central de adoquines hasta la puerta del palacio.
  b.fillBox(-1, G, -29, 1, G, -18, 'cobblestone');
  // Farolas a los lados del camino.
  for (const x of [-3, 3]) {
    for (const z of [-20, -24, -28]) lampPost(b, x, z);
  }
  // Parterres de flores con un seto bajo alrededor.
  const flowers = ['flower_pink', 'flower_white', 'flower_yellow', 'flower_red', 'flower_blue'];
  for (const [x0, x1] of [[-12, -5], [5, 12]]) {
    b.ring(x0, F, -28, x1, -20, 'oak_leaves');
    for (let z = -27; z <= -21; z++) {
      for (let x = x0 + 1; x < x1; x++) b.set(x, F, z, flowers[(z + 27) % flowers.length]);
    }
  }
  // Cerezos a los lados del palacio.
  b.tree(-13, F, -36, 'cherry', 4);
  b.tree(13, F, -36, 'cherry', 4);
}

function buildCentralTower(b, part) {
  const cx = 0, cz = -47, r = 4;
  const split = F + 13; // por debajo, el palacio tapa la torre; por encima, la torre tapa el tejado
  if (part === 'lower') {
    b.cylinder(cx, F, cz, r, split - F, 'white_stone', { hollow: true });
    return;
  }
  const top = F + 32;
  b.cylinder(cx, split, cz, r, top - split, 'white_stone', { hollow: true });
  for (let y = split + 1; y < top; y += 7) b.cylinder(cx, y, cz, r, 1, 'pastel_pink', { hollow: true, inside: null });
  for (const y of [split + 3, split + 10, split + 17]) {
    b.window(cx - 1, y, cz + r, 'x', 3, 2);
    b.window(cx - 1, y, cz - r, 'x', 3, 2);
  }
  b.cylinder(cx, top - 1, cz, r, 1, 'white_stone');
  const roofHeight = 12;
  b.cone(cx, top, cz, r + 1, roofHeight, 'tiles_lilac');
  // El gran estandarte con la G, mirando hacia donde aparece Gina.
  const apex = top + roofHeight;
  for (let y = apex - 1; y < apex + 9; y++) b.set(cx, y, cz, 'birch_log');
  b.pattern(cx + 1, apex + 8, cz, 'x', G_BANNER, BANNER_PALETTE);
}

function buildKeep(b) {
  buildPlayroom(b);

  // Cuerpo del palacio: paredes rosas, suelo de cuarzo, primera planta de madera.
  b.hollowBox(-11, G, -44, 11, F + 12, -30, 'pastel_pink', { floor: 'quartz', ceiling: 'planks' });
  // Primera planta: techo de madera del salón (F + 5) y, encima, el suelo de
  // arriba (F + 6). Así las alfombras de arriba no se ven desde abajo.
  b.fillBox(-10, F + 5, -43, 10, F + 6, -31, 'planks');
  for (const [x, z] of [[-11, -44], [11, -44], [-11, -30], [11, -30]]) b.fillBox(x, F, z, x, F + 12, z, 'quartz');
  b.ring(-11, F + 5, -44, 11, -30, 'white_stone');
  b.ring(-11, F + 12, -44, 11, -30, 'white_stone');

  // Ventanas de las dos plantas.
  for (const y of [F + 1, F + 8]) {
    for (const x of [-9, -5, 4, 8]) b.window(x, y, -30, 'x', 2, y === F + 1 ? 3 : 2);
    for (const z of [-42, -34]) {
      b.window(-11, y, z, 'z', 2, y === F + 1 ? 3 : 2);
      b.window(11, y, z, 'z', 2, y === F + 1 ? 3 : 2);
    }
  }
  // Puerta principal con dintel de cuarzo.
  b.fillBox(-2, F + 4, -30, 2, F + 4, -30, 'quartz');
  b.fillBox(-1, F, -30, 1, F + 3, -30, 'air');

  buildThroneRoom(b);
  buildUpperFloor(b);

  // Tejado a dos aguas de tejas rosas.
  b.roof(-11, F + 13, -44, 11, -30, 'tiles_pink', { ridge: 'x', gable: 'pastel_pink' });
}

function buildThroneRoom(b) {
  // Alfombra roja desde la puerta hasta el trono.
  b.fillBox(-1, G, -40, 1, G, -31, 'wool_red');
  // Tarima de dos escalones y trono de oro con una estrella encima.
  b.fillBox(-3, F, -43, 3, F, -41, 'quartz');
  b.fillBox(-2, F + 1, -43, 2, F + 1, -42, 'gold');
  b.set(0, F + 2, -42, 'wool_red');
  b.set(-1, F + 2, -42, 'gold');
  b.set(1, F + 2, -42, 'gold');
  b.fillBox(0, F + 2, -43, 0, F + 3, -43, 'gold');
  b.set(0, F + 4, -43, 'star');
  // Columnas de cuarzo.
  for (const x of [-6, 6]) for (const z of [-33, -37]) b.fillBox(x, F, z, x, F + 4, z, 'quartz');
  // Lámparas colgadas del techo.
  for (const [x, z] of [[-3, -34], [3, -34], [-3, -39], [3, -39], [0, -32]]) b.set(x, F + 4, z, 'lantern');
  // Estandartes con la G en las paredes laterales.
  b.pattern(-10, F + 4, -39, 'z', SMALL_G_BANNER, BANNER_PALETTE);
  b.pattern(10, F + 4, -39, 'z', mirrored(SMALL_G_BANNER), BANNER_PALETTE);
  // Escalera a la primera planta (pegada a la pared este).
  // (4 bloques de hueco encima de cada peldaño: al saltar no se choca con el techo)
  b.stairs(9, F, -33, 0, -1, 6, 'white_stone', { width: 2, clear: 4 });
  b.stairways.push({ name: 'castillo: a la primera planta', x: 10, y: F, z: -32, dx: 0, dz: -1, rise: 7 });
  // Escalera a la sala de juegos (pegada a la pared oeste): el primer peldaño
  // está al nivel del suelo del salón y el último junto al suelo de abajo.
  b.stairs(-10, G, -31, 0, -1, 7, 'cobblestone', { width: 2, down: true, clear: 4 });
  b.stairways.push({ name: 'castillo: de la sala de juegos al salón', x: -9, y: G - 6, z: -39, dx: 0, dz: 1, rise: 7 });
}

function buildUpperFloor(b) {
  const y = F + 7; // primera altura libre de la primera planta
  // Tabique entre habitación (oeste) y biblioteca (este), con puerta.
  b.fillBox(0, y, -43, 0, y + 4, -31, 'pastel_lilac');
  b.fillBox(0, y, -37, 0, y + 1, -36, 'air');

  // --- Habitación de princesa ---
  b.fillBox(-10, y - 1, -43, -1, y - 1, -31, 'wool_pink'); // moqueta rosa
  // Cama con dosel: colchón, almohadas, cuatro postes y techo de tela.
  b.fillBox(-8, y, -42, -6, y, -40, 'wool_magenta');
  b.fillBox(-8, y, -42, -6, y, -42, 'wool_white');
  for (const [x, z] of [[-9, -43], [-5, -43], [-9, -39], [-5, -39]]) b.fillBox(x, y, z, x, y + 3, z, 'birch_log');
  b.fillBox(-9, y + 4, -43, -5, y + 4, -39, 'wool_white');
  b.fillBox(-8, y + 4, -42, -6, y + 4, -40, 'wool_pink');
  // Armario, tocador y macetas con flores.
  b.fillBox(-3, y, -43, -2, y + 2, -43, 'planks');
  b.set(-10, y, -36, 'quartz');
  b.set(-10, y + 1, -36, 'lantern');
  for (const [z, flower] of [[-33, 'flower_pink'], [-34, 'flower_yellow']]) {
    b.set(-10, y, z, 'dirt');
    b.set(-10, y + 1, z, flower);
  }
  b.set(-4, y + 4, -35, 'lantern');
  b.set(-10, y + 2, -38, paintingAt(-10, -38)); // cuadro de Brotis junto a la cama
  b.set(-7, y + 4, -33, 'lantern');

  // Balcón con vistas al patio y a la puerta.
  b.fillBox(-6, y, -30, -4, y + 1, -30, 'air');
  b.fillBox(-7, y - 1, -29, -3, y - 1, -27, 'quartz');
  b.fillBox(-7, y, -27, -3, y, -27, 'white_stone');
  b.fillBox(-7, y, -29, -7, y, -28, 'white_stone');
  b.fillBox(-3, y, -29, -3, y, -28, 'white_stone');
  b.set(-7, y + 1, -27, 'lantern');
  b.set(-3, y + 1, -27, 'lantern');

  // --- Biblioteca ---
  b.fillBox(1, y, -43, 10, y + 3, -43, 'bookshelf');
  b.fillBox(10, y, -42, 10, y + 3, -40, 'bookshelf'); // deja libre la salida de la escalera
  b.fillBox(1, y, -35, 1, y + 3, -31, 'bookshelf');
  b.fillBox(3, y - 1, -41, 7, y - 1, -34, 'wool_light_blue'); // alfombra
  b.fillBox(4, y, -38, 6, y, -37, 'planks'); // mesa de lectura
  b.set(5, y, -39, 'wool_red'); // asientos
  b.set(5, y, -36, 'wool_red');
  b.set(5, y + 4, -37, 'lantern');
  b.set(3, y + 4, -41, 'lantern');
}

// Las antiguas mazmorras, ahora sala de juegos bajo el palacio.
function buildPlayroom(b) {
  const floor = G - 7;
  b.hollowBox(-11, floor, -44, 11, G, -30, 'cobblestone');
  // Techo de cuarzo, por debajo del suelo del salón del trono (para que no
  // se vea la alfombra roja desde aquí).
  b.fillBox(-10, G - 1, -43, 10, G - 1, -31, 'quartz');
  // Suelo arcoíris en franjas.
  const rainbow = ['wool_red', 'wool_orange', 'wool_yellow', 'wool_lime', 'wool_light_blue', 'wool_purple'];
  for (let x = -10; x <= 10; x++) b.fillBox(x, floor, -43, x, floor, -31, rainbow[((x + 10) >> 1) % rainbow.length]);
  // Camas elásticas de nube.
  b.fillBox(4, floor, -36, 7, floor, -33, 'cloud');
  // Piscina de bolas: bloques de lana de colores dentro de un borde de cuarzo.
  const balls = ['wool_pink', 'wool_yellow', 'wool_light_blue', 'wool_lime', 'wool_orange', 'wool_magenta'];
  b.ring(-7, floor + 1, -43, -1, -37, 'quartz');
  for (let x = -6; x <= -2; x++) {
    for (let z = -42; z <= -38; z++) {
      const k = (((x * 7 + z * 3) % balls.length) + balls.length) % balls.length; // colores mezclados
      b.set(x, floor + 1, z, balls[k]);
    }
  }
  // Pared del fondo de arcoíris y luces.
  b.fillBox(-2, floor + 1, -44, 2, floor + 5, -44, 'rainbow');
  for (const [x, z] of [[-6, -34], [6, -40], [0, -37], [-6, -40], [6, -32]]) b.set(x, G - 2, z, 'lantern');
  b.set(0, G - 2, -43, 'star');
  // Cuadros de Brotis por las paredes.
  for (const [x, z] of [[-6, -43], [6, -43], [10, -37], [-10, -34]]) b.set(x, floor + 3, z, paintingAt(x, z));
}
