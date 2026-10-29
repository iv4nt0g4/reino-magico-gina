// La ciudad inicial, "El Reino Mágico de Gina". Se construye una sola vez
// al crear un mundo nuevo; después es parte del mundo y Gina puede cambiarla.
//
// Plano (norte = z negativa; el castillo está al norte del punto de aparición):
//
//                      ═══════ Barrio del Norte ═══════
//            [Palacio de Hielo*]      CASTILLO       [Bahía del Pirata*]
//   [Barrio Alto O]  [Barrio del Castillo O]  [Barrio del Castillo E]  [Barrio Alto E]
//                 [Parque + unicornio]   ·   [Mercado]
//   ════════════════════════ Avenida del Castillo ════════════════════════
//   [Bosque Encantado*]  [Barrio O] ║ tiendas ║ Calle  ║ tiendas ║ [Barrio E]  [Feria*]
//                                   ║        Principal          ║
//   [Jardín de las Hadas*]  [Casa de Gina]  (Plaza del Carrusel)  [Estación] [Molino]
//                      ═══════ Calle de la Luna ═══════
//
// * Zonas de la fase 6: se dejan libres (naturaleza) para construirlas después.

import { CITY_LEVEL } from '../world/terrain.js';
import { StructureBuilder } from './builder.js';
import { Frame, createRandom } from './frame.js';
import { buildCastle, CASTLE_SPAWN } from './castle.js';
import { house, shop, SHOP_TYPES } from './house.js';
import { townHall } from './townHall.js';
import { plaza } from './plaza.js';
import { station, railway } from './station.js';
import { ginaHouse } from './ginaHouse.js';
import { windmill, fields, farmyard } from './farm.js';
import { well, marketStall, bench, cart, barrels, plantedTree, unicornStatue } from './props.js';
import { buildTown, townRoad } from './town.js';

const G = CITY_LEVEL;
const F = G + 1;
const CITY_SEED = 7_2019; // la ciudad es siempre la misma

// Donde aparece Gina en un mundo nuevo: delante de la puerta del castillo.
export const CITY_SPAWN = CASTLE_SPAWN;

// Zonas reservadas para la fase 6 (rectángulos x0, z0, x1, z1).
export const RESERVED_ZONES = {
  feria: [46, -8, 85, 38],
  bosqueEncantado: [-85, -8, -46, 44],
  palacioDeHielo: [-85, -85, -46, -52],
  bahiaDelPirata: [46, -85, 85, -52],
  jardinDeLasHadas: [-85, 46, -46, 85],
};

export function buildCity() {
  const b = new StructureBuilder();
  const rng = createRandom(CITY_SEED);

  buildCastle(b);
  streets(b);
  plaza(b);
  mainStreet(b, rng);
  neighborhoods(b, rng);
  castleFront(b, rng);
  specialPlaces(b, rng);
  // La Aldea de las Siete Estrellas, al sur, con su camino desde la Calle de la Luna.
  buildTown(b);
  townRoad(b);
  return b;
}

// ---------- Calles ----------

// Calle entre dos esquinas: calzada y, opcionalmente, bordillos de otro material.
function road(b, x0, z0, x1, z1, material = 'cobblestone') {
  b.fillBox(x0, G, z0, x1, G, z1, material);
  b.fillBox(x0, F, z0, x1, F + 3, z1, 'air');
}

function streets(b) {
  // Avenida del Castillo (este-oeste), con aceras y farolas.
  road(b, -47, 9, 47, 13);
  b.fillBox(-47, G, 9, 47, G, 9, 'white_stone');
  b.fillBox(-47, G, 13, 47, G, 13, 'white_stone');
  for (let x = -44; x <= 44; x += 8) {
    if (Math.abs(x) > 5) b.lampPost(x, F, 8);
  }
  // Calle Principal (hacia el sur, hasta la plaza), con aceras.
  road(b, -4, 14, 4, 50);
  b.fillBox(-4, G, 14, -4, G, 50, 'white_stone');
  b.fillBox(4, G, 14, 4, G, 50, 'white_stone');
  // Calles de los barrios, más viejas (grava y adoquines mezclados).
  oldRoad(b, -22, 14, -20, 94);
  oldRoad(b, 20, 14, 22, 94);
  oldRoad(b, -31, -50, -29, 8);
  oldRoad(b, 29, -50, 31, 8);
  oldRoad(b, -47, -66, -45, -12);
  oldRoad(b, 45, -66, 47, -12);
  oldRoad(b, -47, -66, 47, -64); // Barrio del Norte
  oldRoad(b, -70, 92, 70, 94); // Calle de la Luna
  for (let x = -40; x <= 40; x += 10) {
    b.lampPost(x, F, -63);
    b.lampPost(x + 5, F, 91);
  }
  oldRoad(b, -47, -13, -29, -11);
  oldRoad(b, 29, -13, 47, -11);
  for (const sx of [-1, 1]) {
    for (let z = 18; z <= 50; z += 10) b.lampPost(sx * 23, F, z);
    for (let z = -46; z <= 4; z += 10) b.lampPost(sx * 28, F, z);
  }
  // Caminos de la plaza a la casa de Gina, a la estación y a la granja.
  road(b, -24, 62, -17, 64, 'white_stone');
  road(b, 17, 68, 23, 70, 'white_stone');
  road(b, -1, 84, 1, 91, 'white_stone'); // salida sur de la plaza
  oldRoad(b, 40, 52, 42, 66);
}

// Calle con el empedrado gastado por los años: grava y adoquines mezclados.
function oldRoad(b, x0, z0, x1, z1) {
  road(b, x0, z0, x1, z1, 'gravel');
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      if ((x * 7 + z * 13) % 5 < 2) b.set(x, G, z, 'cobblestone');
    }
  }
}

// ---------- Calle Principal ----------

function mainStreet(b, rng) {
  // Tiendas al oeste (miran al este) y al este (miran al oeste).
  const west = [[14, 25, 'heladeria'], [26, 36, 'pasteleria'], [37, 47, 'jugueteria']];
  const east = [[14, 25, 'floristeria'], [26, 36, 'disfraces']];
  for (const [z0, z1, type] of west) shop(new Frame(b, -6, z1, 'east'), rng, { width: z1 - z0 + 1, depth: 14, type, name: type });
  for (const [z0, z1, type] of east) shop(new Frame(b, 6, z0, 'west'), rng, { width: z1 - z0 + 1, depth: 14, type, name: type });
  townHall(new Frame(b, 6, 37, 'west'), { width: 11, depth: 14 });
}

// ---------- Barrios ----------

// Parcelas en fila a lo largo de una calle. `facing` es hacia dónde queda la calle.
function lots(b, rng, { x, zFrom, zTo, size, depth, facing, area, shopChance = 0 }) {
  for (let z0 = zFrom; z0 + size - 1 <= zTo; z0 += size) {
    const z1 = z0 + size - 1;
    const frame = facing === 'east' ? new Frame(b, x, z1, 'east') : new Frame(b, x, z0, 'west');
    const name = `casa de ${area} (${x}, ${z0})`;
    if (rng.chance(shopChance)) {
      const type = rng.pick(SHOP_TYPES.slice(5)); // tiendas de barrio: librería, panadería...
      shop(frame, rng, { width: size, depth, type, name: `${type} de ${area}` });
    } else {
      house(frame, rng, { width: size, depth, name });
    }
  }
}

function neighborhoods(b, rng) {
  // Detrás de la Calle Principal, a los dos lados.
  lots(b, rng, { x: -23, zFrom: 14, zTo: 47, size: 11, depth: 14, facing: 'east', area: 'la Calle del Sauce', shopChance: 0.35 });
  lots(b, rng, { x: 23, zFrom: 14, zTo: 47, size: 11, depth: 14, facing: 'west', area: 'la Calle del Rosal', shopChance: 0.35 });
  // Junto al castillo.
  lots(b, rng, { x: -32, zFrom: -50, zTo: 4, size: 11, depth: 10, facing: 'east', area: 'el Barrio del Castillo' });
  lots(b, rng, { x: 32, zFrom: -50, zTo: 4, size: 11, depth: 10, facing: 'west', area: 'el Barrio del Castillo' });
  // Barrio Alto, más allá.
  lots(b, rng, { x: -48, zFrom: -48, zTo: -14, size: 11, depth: 13, facing: 'east', area: 'el Barrio Alto' });
  lots(b, rng, { x: 48, zFrom: -48, zTo: -14, size: 11, depth: 13, facing: 'west', area: 'el Barrio Alto' });
  lots(b, rng, { x: 23, zFrom: 48, zTo: 58, size: 11, depth: 14, facing: 'west', area: 'la Calle del Rosal' });
  // Barrio del Norte, detrás del castillo (las casas miran al sur, a su calle).
  for (let x = -44; x + 10 <= 44; x += 11) {
    house(new Frame(b, x, -67, 'south'), rng, { width: 11, depth: 12, name: `casa del Barrio del Norte (${x})` });
  }
  // Calle de la Luna: casas a los dos lados (al norte, sin tapar la salida de la plaza).
  for (const x of [-44, -33, -22, 12, 23, 34]) {
    house(new Frame(b, x, 91, 'south'), rng, { width: 11, depth: 11, name: `casa de la Calle de la Luna (${x}, norte)` });
  }
  for (let x = 66; x - 10 >= -66; x -= 11) {
    if (x - 10 <= 3 && x >= -3) continue; // hueco para el camino a la Aldea de las Siete Estrellas
    const frame = new Frame(b, x, 95, 'north');
    if (rng.chance(0.25)) shop(frame, rng, { width: 11, depth: 12, type: rng.pick(SHOP_TYPES.slice(5)), name: `tienda de la Calle de la Luna (${x})` });
    else house(frame, rng, { width: 11, depth: 12, name: `casa de la Calle de la Luna (${x}, sur)` });
  }
  // Huertos y árboles detrás de las casas del Barrio Alto y del castillo.
  for (const sx of [-1, 1]) {
    for (let z = -46; z <= -16; z += 10) plantedTree(b, sx * 43, F, z, rng.pick(['oak', 'cherry', 'birch']));
  }
}

// ---------- Delante del castillo: parque y mercado ----------

function castleFront(b, rng) {
  // Parque al oeste del camino: estatua del unicornio, bancos, árboles y flores.
  b.fillBox(-26, F, -4, -6, F, 7, 'air');
  unicornStatue(b, -16, F, 2);
  for (const [x, z] of [[-22, -2], [-10, -2], [-22, 6], [-10, 6]]) plantedTree(b, x, F, z, 'cherry');
  for (const [x, z] of [[-19, 2], [-13, 2]]) bench(b, x, F, z, 'z');
  for (let x = -25; x <= -7; x++) b.set(x, F, 7, ['flower_pink', 'flower_white', 'flower_yellow'][(x + 25) % 3]);
  // Mercado al este del camino: puestos, pozo, carreta y barriles.
  b.fillBox(6, F, -4, 26, F + 4, 7, 'air');
  b.fillBox(6, G, -4, 26, G, 7, 'cobblestone');
  for (const [x, z] of [[8, -2], [14, -2], [20, -2], [8, 4], [20, 4]]) marketStall(b, x, F, z, rng);
  well(b, 15, F, 4);
  cart(b, 24, F, 1, 'wool_orange');
  barrels(b, 25, F, -3, rng);
  barrels(b, 7, F, 6, rng);
}

// ---------- Lugares especiales ----------

function specialPlaces(b, rng) {
  // Casa de Gina, al oeste de la plaza, mirando hacia ella.
  ginaHouse(new Frame(b, -24, 74, 'east'), rng, { width: 21, depth: 19 });
  // Estación al este de la plaza, con el andén y las vías al sur.
  station(b, new Frame(b, 24, 70, 'south'));
  railway(b, 19, 46, 71);
  // Granja del molino al sureste.
  windmill(b, 52, 58);
  fields(b, 44, 42, 56, 50);
  farmyard(b, rng, 60, 48);
  house(new Frame(b, 60, 52, 'west'), rng, { width: 11, depth: 11, name: 'casa de la granja', style: 'cottage' });
  // Detalles alrededor de la plaza.
  for (const [x, z] of [[-20, 52], [20, 52]]) plantedTree(b, x, F, z, 'oak');
  well(b, -40, F, 80);
  bench(b, 30, F, 80);
}
