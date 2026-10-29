// Web Worker: genera el terreno de los chunks y construye sus mallas
// (con su iluminación) fuera del hilo principal, para que el juego nunca se congele.

import { createTerrain } from '../world/terrain.js';
import { buildRegion, computeLight } from './lighting.js';
import { meshChunk } from './mesher.js';

let terrain = null;

const buffersOf = (mesh) => [mesh.positions.buffer, mesh.uvs.buffer, mesh.info.buffer, mesh.light.buffer, mesh.indices.buffer];

self.onmessage = ({ data: msg }) => {
  if (msg.type === 'generate') {
    if (!terrain || terrain.seed !== msg.seed) {
      terrain = { seed: msg.seed, ...createTerrain(msg.seed) };
    }
    const blocks = terrain.generateChunk(msg.cx, msg.cz);
    self.postMessage({ id: msg.id, blocks }, [blocks.buffer]);
  } else if (msg.type === 'mesh') {
    // msg.chunks: los bloques del chunk y sus 8 vecinos.
    const region = buildRegion(msg.chunks);
    const { sky, block } = computeLight(region);
    const mesh = meshChunk(region, sky, block);
    self.postMessage({ id: msg.id, mesh }, [...buffersOf(mesh.solid), ...buffersOf(mesh.water)]);
  }
};
