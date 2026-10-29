// Guardado de la partida en IndexedDB (dentro del navegador):
//  - "chunks": los chunks que Gina ha modificado (clave "cx,cz" → bloques).
//  - "meta":   el estado del jugador, la barra rápida, la hora del día, la semilla...
// Si el navegador no deja usar IndexedDB (por ejemplo en modo incógnito
// estricto), el juego funciona igual pero sin guardar.

const DB_NAME = 'reino-magico-gina';
const DB_VERSION = 1;
export const SAVE_VERSION = 1; // sube si cambia el formato del guardado

// Convierte una petición de IndexedDB en una promesa.
function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class Storage {
  constructor(db, chunkKeys) {
    this.db = db;
    this.chunkKeys = new Set(chunkKeys); // chunks guardados (para no preguntar uno a uno)
  }

  // Abre (o crea) la base de datos. Devuelve null si no se puede usar.
  static async open() {
    try {
      const open = indexedDB.open(DB_NAME, DB_VERSION);
      open.onupgradeneeded = () => {
        open.result.createObjectStore('chunks');
        open.result.createObjectStore('meta');
      };
      const db = await request(open);
      const keys = await request(db.transaction('chunks').objectStore('chunks').getAllKeys());
      return new Storage(db, keys);
    } catch (error) {
      console.warn('No se puede guardar la partida en este navegador:', error);
      return null;
    }
  }

  hasChunk(key) {
    return this.chunkKeys.has(key);
  }

  loadChunk(key) {
    return request(this.db.transaction('chunks').objectStore('chunks').get(key));
  }

  // Guarda varios chunks en una sola transacción. IndexedDB copia los datos
  // al llamar a put(), así que se guarda el estado de este instante.
  saveChunks(entries) {
    const tx = this.db.transaction('chunks', 'readwrite');
    const store = tx.objectStore('chunks');
    for (const [key, blocks] of entries) {
      store.put(blocks, key);
      this.chunkKeys.add(key);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  // Borra la partida entera (para empezar un mundo nuevo).
  clear() {
    const tx = this.db.transaction(['chunks', 'meta'], 'readwrite');
    tx.objectStore('chunks').clear();
    tx.objectStore('meta').clear();
    this.chunkKeys.clear();
    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  loadMeta() {
    return request(this.db.transaction('meta').objectStore('meta').get('game'));
  }

  saveMeta(meta) {
    return request(this.db.transaction('meta', 'readwrite').objectStore('meta').put(meta, 'game'));
  }
}
