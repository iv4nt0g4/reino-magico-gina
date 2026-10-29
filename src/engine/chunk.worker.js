// Web Worker: genera el terreno de los chunks y construye sus mallas fuera
// del hilo principal, para que el juego nunca se congele.

import { createTerrain } from '../world/terrain.js';
import { meshChunk } from './mesher.js';

let terrain = null;

self.onmessage = ({ data: msg }) => {
  if (msg.type === 'generate') {
    if (!terrain || terrain.seed !== msg.seed) {
      terrain = { seed: msg.seed, ...createTerrain(msg.seed) };
    }
    const blocks = terrain.generateChunk(msg.cx, msg.cz);
    self.postMessage({ id: msg.id, blocks }, [blocks.buffer]);
  } else if (msg.type === 'mesh') {
    const mesh = meshChunk(msg.volume);
    self.postMessage({ id: msg.id, mesh }, [
      mesh.positions.buffer,
      mesh.uvs.buffer,
      mesh.info.buffer,
      mesh.indices.buffer,
    ]);
  }
};
