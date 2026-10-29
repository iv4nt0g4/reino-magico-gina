// Gestor de chunks: decide qué chunks cargar alrededor del jugador, pide a
// los workers su terreno y su malla, y descarga los que quedan lejos.
// Los datos de bloques viven en el hilo principal (los usa la física).
// Los chunks que Gina modifica se guardan (ver world/storage.js) y, al
// volver a cargarlos, se leen del guardado en vez de generarlos de nuevo.

import * as THREE from 'three';
import { CHUNK_SIZE, CHUNK_HEIGHT, blockIndex, chunkKey } from './constants.js';
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
  constructor(scene, materials, settings, storage) {
    this.scene = scene;
    this.materials = materials;
    this.settings = settings;
    this.storage = storage;
    this.chunks = new Map(); // clave "cx,cz" → chunk
    // Chunks modificados: se conservan en memoria aunque se descarguen.
    this.edited = new Map(); // clave → Uint8Array de bloques
    this.unsaved = new Set(); // claves con cambios aún sin guardar
    this.dirty = new Map(); // clave → urgente (true) | normal: pendientes de re-mallar
    this.jobs = 0;
    this.center = { cx: NaN, cz: NaN };
    // Se generan datos un anillo más allá de lo que se dibuja, porque una
    // malla necesita a sus 8 vecinos (para los bordes y para la luz).
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

  // Cambia un bloque. Devuelve false si no se puede (fuera del mundo o sin cargar).
  setBlock(x, y, z, id) {
    if (y < 0 || y >= CHUNK_HEIGHT) return false;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk?.blocks) return false;
    chunk.blocks[blockIndex(x - cx * CHUNK_SIZE, y, z - cz * CHUNK_SIZE)] = id;
    const key = chunkKey(cx, cz);
    this.edited.set(key, chunk.blocks);
    this.unsaved.add(key);

    // La luz llega hasta 15 bloques: re-mallar este chunk (primero) y sus 8 vecinos.
    this.dirty.set(key, true);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const k = chunkKey(cx + dx, cz + dz);
        if (!this.dirty.has(k)) this.dirty.set(k, false);
      }
    }
    return true;
  }

  // Lanza los re-mallados pendientes (una vez por fotograma, aunque haya
  // habido muchas ediciones seguidas, por ejemplo agua fluyendo).
  flushEdits() {
    if (this.dirty.size === 0) return;
    // Primero los chunks editados directamente, luego los vecinos.
    const ordered = [...this.dirty].sort((a, b) => b[1] - a[1]);
    this.dirty.clear();
    for (const [key, urgent] of ordered) {
      const chunk = this.chunks.get(key);
      if (!chunk?.blocks) continue;
      chunk.needsMesh = true;
      if (chunk.mesh || chunk.waterMesh || urgent) {
        if (this.#neighborsReady(chunk.cx, chunk.cz)) this.#buildMesh(chunk, true);
      }
    }
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
      if (this.getChunk(cx + dx, cz + dz)?.meshed) meshed++;
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
      if (!chunk) this.#load(x, z);
      else if (d <= meshRadius && chunk.blocks && chunk.needsMesh && !chunk.meshing && this.#neighborsReady(x, z)) {
        this.#buildMesh(chunk);
      }
    }
  }

  // Trae los bloques de un chunk: de memoria, del guardado o generándolo.
  #load(cx, cz) {
    const key = chunkKey(cx, cz);
    const chunk = { cx, cz, blocks: null, mesh: null, waterMesh: null, meshed: false, needsMesh: true, meshing: false, version: 0 };
    this.chunks.set(key, chunk);
    const ready = (blocks) => {
      if (this.getChunk(cx, cz) !== chunk) return; // se descargó mientras tanto
      chunk.blocks = blocks;
    };

    if (this.edited.has(key)) {
      ready(this.edited.get(key));
      return;
    }
    this.jobs++;
    const fromStorage = this.storage?.hasChunk(key) ? this.storage.loadChunk(key) : Promise.resolve(null);
    fromStorage
      .catch(() => null) // si falla la lectura, se genera de nuevo
      .then((saved) => {
        if (saved) {
          this.edited.set(key, saved);
          return { blocks: saved };
        }
        return this.pool.run({ type: 'generate', cx, cz, seed: this.settings.seed });
      })
      .then(({ blocks }) => {
        this.jobs--;
        ready(blocks);
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

  #buildMesh(chunk, urgent = false) {
    chunk.needsMesh = false;
    chunk.meshing = true;
    const version = ++chunk.version;
    // El chunk y sus 8 vecinos (se copian al enviarlos; los originales siguen aquí).
    const chunks = [];
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) chunks.push(this.getChunk(chunk.cx + dx, chunk.cz + dz).blocks);
    }
    this.jobs++;
    this.pool.run({ type: 'mesh', chunks }, [], urgent).then(({ mesh }) => {
      this.jobs--;
      if (version === chunk.version) chunk.meshing = false;
      // Descartar si se descargó o si ya hay un mallado más reciente en camino.
      if (this.getChunk(chunk.cx, chunk.cz) !== chunk || version !== chunk.version) return;
      this.#setMeshes(chunk, mesh);
    });
  }

  #createMesh(chunk, data, material) {
    if (data.indices.length === 0) return null;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
    geometry.setAttribute('aInfo', new THREE.BufferAttribute(data.info, 2));
    geometry.setAttribute('aLight', new THREE.BufferAttribute(data.light, 2));
    geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(chunk.cx * CHUNK_SIZE, 0, chunk.cz * CHUNK_SIZE);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.scene.add(mesh);
    return mesh;
  }

  #setMeshes(chunk, data) {
    this.#disposeMeshes(chunk);
    chunk.mesh = this.#createMesh(chunk, data.solid, this.materials.solid);
    chunk.waterMesh = this.#createMesh(chunk, data.water, this.materials.water);
    chunk.meshed = true;
  }

  #disposeMeshes(chunk) {
    for (const mesh of [chunk.mesh, chunk.waterMesh]) {
      if (!mesh) continue;
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    chunk.mesh = chunk.waterMesh = null;
  }

  // Descarga los chunks que quedan fuera de la distancia + margen.
  #unloadFar() {
    const limit = this.settings.renderDistance + 1 + this.settings.unloadMargin;
    for (const [key, chunk] of this.chunks) {
      const d = Math.hypot(chunk.cx - this.center.cx, chunk.cz - this.center.cz);
      if (d > limit) {
        this.#disposeMeshes(chunk);
        this.chunks.delete(key);
      }
    }
  }

  // Construye estructuras en un mundo nuevo: genera el terreno de cada chunk
  // afectado, le aplica los bloques del constructor y lo marca como editado
  // (así se guarda y ya no se vuelve a generar). `onProgress(hechos, total)`.
  async bakeStructures(builder, onProgress) {
    const keys = [...builder.chunks.keys()];
    let done = 0;
    await Promise.all(
      keys.map(async (key) => {
        const [cx, cz] = key.split(',').map(Number);
        const { blocks } = await this.pool.run({ type: 'generate', cx, cz, seed: this.settings.seed });
        builder.applyTo(key, blocks);
        this.edited.set(key, blocks);
        this.unsaved.add(key);
        onProgress?.(++done, keys.length);
      }),
    );
  }

  // Guarda los chunks con cambios pendientes.
  async saveEdits() {
    if (!this.storage || this.unsaved.size === 0) return;
    const entries = [...this.unsaved].map((key) => [key, this.edited.get(key)]);
    this.unsaved.clear();
    try {
      await this.storage.saveChunks(entries);
    } catch (error) {
      for (const [key] of entries) this.unsaved.add(key); // se reintentará la próxima vez
      throw error;
    }
  }

  // Estadísticas para el panel de depuración.
  stats() {
    let meshes = 0, triangles = 0;
    for (const chunk of this.chunks.values()) {
      if (!chunk.meshed) continue;
      meshes++;
      for (const mesh of [chunk.mesh, chunk.waterMesh]) if (mesh) triangles += mesh.geometry.index.count / 3;
    }
    return { loaded: this.chunks.size, meshes, triangles };
  }
}
