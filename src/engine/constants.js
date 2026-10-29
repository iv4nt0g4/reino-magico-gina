// Dimensiones del mundo, compartidas por el hilo principal y los workers.
export const CHUNK_SIZE = 16; // X y Z
export const CHUNK_HEIGHT = 128; // Y
export const CHUNK_VOLUME = CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT;

// Índice dentro de un chunk: Y es el eje más lento para que las columnas
// horizontales estén contiguas.
export function blockIndex(x, y, z) {
  return (y * CHUNK_SIZE + z) * CHUNK_SIZE + x;
}

export function chunkKey(cx, cz) {
  return `${cx},${cz}`;
}
