// Generación completa de un chunk: terreno natural más las aldeas y rincones
// que caen en él. (La ciudad no va aquí: se construye una sola vez al crear
// el mundo y se guarda; ver structures/city.js.)

import { createTerrain } from './terrain.js';
import { createVillagePlanner } from './villages.js';

export function createWorldGen(seed) {
  const terrain = createTerrain(seed);
  const villages = createVillagePlanner(terrain, seed);
  return {
    terrain,
    villages,
    generateChunk(cx, cz) {
      const blocks = terrain.generateChunk(cx, cz, { isTreeBlocked: villages.isTreeBlocked });
      return villages.applyToChunk(cx, cz, blocks);
    },
  };
}
