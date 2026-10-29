// Gestor de chunks: decide qué chunks cargar alrededor del jugador, pide a
// los workers su terreno y su malla, y descarga los que quedan lejos.
// Los datos de bloques viven en el hilo principal (los usa la física).

import * as THREE from 'three';
import { CHUNK_SIZE, CHUNK_HEIGHT, blockIndex, chunkKey } from './constants.js';
import { PADDED_VOLUME, paddedIndex } from './mesher.js';
import { WorkerPool } from './workerPool.js';
import { IS_SOLID } from '../blocks/registry.js';

// Desplazamientos de chunk ordenados por distancia: se carga primero lo cercano.
function spiralOffsets(radius) {
  const list = [];
  for (let dz = -radius; dz <= radius; dz++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const d = Math.hypot(dx, dz);
      if (d <= radius + 0.5) list.push({ dx, dz, d });
    }
  }
  return list.sort((a, b) => a.d - b.d);
}

export class ChunkManager {
  constructor(scene, material, settings) {
    this.scene = scene;
    this.material = material;
    this.settings = settings;
    this.chunks = new Map(); // clave "cx,cz" → chunk
    this.jobs = 0;
    this.center = { cx: NaN, cz: NaN };
    // Se generan datos un anillo más allá de lo que se dibuja, porque una
    // malla necesita a sus 8 vecinos para mallar sus bordes.
    this.offsets = spiralOffsets(settings.renderDistance + 1);
    this.pool = new WorkerPool(
      settings.workerCount,
      () => new Worker(new URL('./chunk.worker.js', import.meta.url), { type: 'module' }),
    );
  }

  // ---- Consulta de bloques (coordenadas de mundo) ----

  getChunk(cx, cz) {
    return this.chunks.get(chunkKey(cx, cz));
  }

  // Devuelve el id del bloque, o -1 si su chunk aún no está cargado.
  getBlock(x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return 0;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk?.blocks) return -1;
    return chunk.blocks[blockIndex(x - cx * CHUNK_SIZE, y, z - cz * CHUNK_SIZE)];
  }

  // Para la física, lo que no está cargado se trata como sólido: así nunca
  // se cae uno al vacío mientras el terreno termina de llegar.
  isSolid(x, y, z) {
    const id = this.getBlock(x, y, z);
    return id < 0 || IS_SOLID[id] === 1;
  }

  // Altura del bloque sólido más alto de una columna (o -1).
  topSolidY(x, z) {
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
      const id = this.getBlock(x, y, z);
      if (id < 0) return -1;
      if (IS_SOLID[id]) return y;
    }
    return -1;
  }

  // Número de chunks cercanos ya dibujados (para la pantalla de carga).
  countMeshedAround(cx, cz, radius) {
    let meshed = 0, total = 0;
    for (const { dx, dz, d } of this.offsets) {
      if (d > radius) break;
      total++;
      if (this.getChunk(cx + dx, cz + dz)?.mesh) meshed++;
    }
    return { meshed, total };
  }

  // ---- Ciclo de carga ----

  update(playerX, playerZ) {
    const cx = Math.floor(playerX / CHUNK_SIZE);
    const cz = Math.floor(playerZ / CHUNK_SIZE);
    if (cx !== this.center.cx || cz !== this.center.cz) {
      this.center = { cx, cz };
      this.#unloadFar();
    }

    const maxJobs = this.settings.maxChunkJobs;
    const meshRadius = this.settings.renderDistance;
    for (const { dx, dz, d } of this.offsets) {
      if (this.jobs >= maxJobs) break;
      const x = cx + dx;
      const z = cz + dz;
      const chunk = this.getChunk(x, z);
      if (!chunk) this.#generate(x, z);
      else if (d <= meshRadius && chunk.blocks && chunk.needsMesh && !chunk.meshing && this.#neighborsReady(x, z)) {
        this.#buildMesh(chunk);
      }
    }
  }

  #generate(cx, cz) {
    const chunk = { cx, cz, blocks: null, mesh: null, needsMesh: true, meshing: false, version: 0 };
    this.chunks.set(chunkKey(cx, cz), chunk);
    this.jobs++;
    this.pool.run({ type: 'generate', cx, cz, seed: this.settings.seed }).then(({ blocks }) => {
      this.jobs--;
      if (this.getChunk(cx, cz) !== chunk) return; // se descargó mientras tanto
      chunk.blocks = blocks;
    });
  }

  #neighborsReady(cx, cz) {
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!this.getChunk(cx + dx, cz + dz)?.blocks) return false;
      }
    }
    return true;
  }

  // Copia el chunk y un borde de 1 bloque de sus vecinos al volumen acolchado.
  #buildPaddedVolume(cx, cz) {
    const volume = new Uint8Array(PADDED_VOLUME);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const src = this.getChunk(cx + dx, cz + dz).blocks;
        // Rango local (en el vecino) que cae dentro del volumen acolchado.
        const x0 = dx < 0 ? CHUNK_SIZE - 1 : 0;
        const x1 = dx > 0 ? 0 : CHUNK_SIZE - 1;
        const z0 = dz < 0 ? CHUNK_SIZE - 1 : 0;
        const z1 = dz > 0 ? 0 : CHUNK_SIZE - 1;
        const offX = dx * CHUNK_SIZE;
        const offZ = dz * CHUNK_SIZE;
        const rowLength = x1 - x0 + 1;
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          for (let z = z0; z <= z1; z++) {
            const from = blockIndex(x0, y, z);
            volume.set(src.subarray(from, from + rowLength), paddedIndex(x0 + offX, y, z + offZ));
          }
        }
      }
    }
    return volume;
  }

  #buildMesh(chunk) {
    chunk.needsMesh = false;
    chunk.meshing = true;
    const version = ++chunk.version;
    const volume = this.#buildPaddedVolume(chunk.cx, chunk.cz);
    this.jobs++;
    this.pool.run({ type: 'mesh', volume }, [volume.buffer]).then(({ mesh }) => {
      this.jobs--;
      chunk.meshing = false;
      if (this.getChunk(chunk.cx, chunk.cz) !== chunk || version !== chunk.version) return;
      this.#setMesh(chunk, mesh);
    });
  }

  #setMesh(chunk, data) {
    this.#disposeMesh(chunk);
    if (data.indices.length === 0) return;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
    geometry.setAttribute('aInfo', new THREE.BufferAttribute(data.info, 2));
    geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.position.set(chunk.cx * CHUNK_SIZE, 0, chunk.cz * CHUNK_SIZE);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.scene.add(mesh);
    chunk.mesh = mesh;
  }

  #disposeMesh(chunk) {
    if (!chunk.mesh) return;
    this.scene.remove(chunk.mesh);
    chunk.mesh.geometry.dispose();
    chunk.mesh = null;
  }

  // Descarga los chunks que quedan fuera de la distancia + margen.
  #unloadFar() {
    const limit = this.settings.renderDistance + 1 + this.settings.unloadMargin;
    for (const [key, chunk] of this.chunks) {
      const d = Math.hypot(chunk.cx - this.center.cx, chunk.cz - this.center.cz);
      if (d > limit) {
        this.#disposeMesh(chunk);
        this.chunks.delete(key);
      }
    }
  }

  // Estadísticas para el panel de depuración.
  stats() {
    let meshes = 0, triangles = 0;
    for (const chunk of this.chunks.values()) {
      if (!chunk.mesh) continue;
      meshes++;
      triangles += chunk.mesh.geometry.index.count / 3;
    }
    return { loaded: this.chunks.size, meshes, triangles };
  }
}
