// Web Worker: genera los chunks (terreno, aldeas y rincones) y construye sus mallas
// (con su iluminación) fuera del hilo principal, para que el juego nunca se congele.

import { createWorldGen } from '../world/worldgen.js';
import { buildRegion, computeLight } from './lighting.js';
import { meshChunk } from './mesher.js';

let worldgen = null;

const buffersOf = (mesh) => [mesh.positions.buffer, mesh.uvs.buffer, mesh.info.buffer, mesh.light.buffer, mesh.indices.buffer];

self.onmessage = ({ data: msg }) => {
  if (msg.type === 'generate') {
    if (!worldgen || worldgen.seed !== msg.seed) {
      worldgen = { seed: msg.seed, ...createWorldGen(msg.seed) };
    }
    const blocks = worldgen.generateChunk(msg.cx, msg.cz);
    self.postMessage({ id: msg.id, blocks }, [blocks.buffer]);
  } else if (msg.type === 'mesh') {
    // msg.chunks: los bloques del chunk y sus 8 vecinos.
    const region = buildRegion(msg.chunks);
    const { sky, block } = computeLight(region);
    const mesh = meshChunk(region, sky, block);
    self.postMessage({ id: msg.id, mesh }, [...buffersOf(mesh.solid), ...buffersOf(mesh.water)]);
  }
};
