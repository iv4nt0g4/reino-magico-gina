// Mallado de chunks con "greedy meshing":
//  1. Solo se generan las caras visibles (las que tocan un bloque no opaco).
//  2. Las caras contiguas del mismo tipo se fusionan en rectángulos grandes,
//     lo que reduce muchísimo el número de triángulos.
//
// Entrada: volumen "acolchado" de (16+2)×128×(16+2) bloques: el chunk más un
// borde de 1 bloque de los chunks vecinos, para decidir bien las caras de
// los bordes (y, en la fase 3, calcular el ambient occlusion).

import { CHUNK_SIZE, CHUNK_HEIGHT } from './constants.js';
import { IS_OPAQUE, IS_CUTOUT, CULL_SAME, FACE_TEXTURE } from '../blocks/registry.js';

export const PAD = CHUNK_SIZE + 2;
export const PADDED_VOLUME = PAD * PAD * CHUNK_HEIGHT;

// Índice en el volumen acolchado; x y z van de -1 a 16.
export function paddedIndex(x, y, z) {
  return (y * PAD + (z + 1)) * PAD + (x + 1);
}

// Brillo fijo por orientación de cara (+X, -X, +Y, -Y, +Z, -Z).
// La iluminación real (luz de cielo, luz de bloque y AO) llega en la fase 3.
const FACE_SHADE = [0.8, 0.8, 1.0, 0.55, 0.65, 0.65];

const SIZE = [CHUNK_SIZE, CHUNK_HEIGHT, CHUNK_SIZE];
// Para cada eje normal: ejes del plano (u, v) de la cara.
//   X → (z, y)   Y → (x, z)   Z → (x, y)
const U_AXIS = [2, 0, 0];
const V_AXIS = [1, 2, 1];
// Signo de (U × V) respecto al eje normal, para orientar bien los triángulos.
const CROSS_SIGN = [-1, -1, 1];

// Array tipado que crece según se necesita.
class GrowableArray {
  constructor(Type, capacity = 4096) {
    this.Type = Type;
    this.data = new Type(capacity);
    this.length = 0;
  }
  push(...values) {
    if (this.length + values.length > this.data.length) {
      const bigger = new this.Type(this.data.length * 2);
      bigger.set(this.data);
      this.data = bigger;
    }
    for (const v of values) this.data[this.length++] = v;
  }
  result() {
    return this.data.slice(0, this.length);
  }
}

export function meshChunk(volume) {
  const positions = new GrowableArray(Float32Array);
  const uvs = new GrowableArray(Float32Array);
  const info = new GrowableArray(Float32Array); // (capa de textura, luz)
  const indices = new GrowableArray(Uint32Array);
  let vertexCount = 0;

  const pos = [0, 0, 0];
  const step = [0, 0, 0];
  const corner = [0, 0, 0];
  // Máscara de caras del corte actual: 0 = sin cara; si no, capa de textura + 1.
  const mask = new Int16Array(CHUNK_HEIGHT * CHUNK_SIZE);

  for (let face = 0; face < 6; face++) {
    const axis = face >> 1;
    const sign = face & 1 ? -1 : 1;
    const ua = U_AXIS[axis];
    const va = V_AXIS[axis];
    const uSize = SIZE[ua];
    const vSize = SIZE[va];
    const flip = sign * CROSS_SIGN[axis] < 0;
    const shade = FACE_SHADE[face];
    step[0] = step[1] = step[2] = 0;
    step[axis] = sign;

    for (let slice = 0; slice < SIZE[axis]; slice++) {
      // 1) Construir la máscara de caras visibles de este corte.
      let n = 0;
      for (let v = 0; v < vSize; v++) {
        for (let u = 0; u < uSize; u++, n++) {
          pos[axis] = slice;
          pos[ua] = u;
          pos[va] = v;
          const block = volume[paddedIndex(pos[0], pos[1], pos[2])];
          mask[n] = 0;
          if (block === 0) continue;

          const ny = pos[1] + step[1];
          let neighbor;
          if (ny < 0) neighbor = 1; // bajo el mundo: no se ve
          else if (ny >= CHUNK_HEIGHT) neighbor = 0; // sobre el mundo: aire
          else neighbor = volume[paddedIndex(pos[0] + step[0], ny, pos[2] + step[2])];

          // Cara visible si el vecino no es opaco. Entre dos bloques iguales
          // solo se dibuja en las hojas (recortadas y sin CULL_SAME), como en
          // el original; entre dos cristales no.
          if (IS_OPAQUE[neighbor]) continue;
          if (neighbor === block && (!IS_CUTOUT[block] || CULL_SAME[block])) continue;
          mask[n] = FACE_TEXTURE[block * 6 + face] + 1;
        }
      }

      // 2) Fusionar la máscara en rectángulos lo más grandes posible.
      n = 0;
      for (let v = 0; v < vSize; v++) {
        for (let u = 0; u < uSize; ) {
          const key = mask[n];
          if (key === 0) {
            u++;
            n++;
            continue;
          }
          // Anchura: mientras la cara siguiente sea igual.
          let w = 1;
          while (u + w < uSize && mask[n + w] === key) w++;
          // Altura: mientras toda la fila siguiente coincida.
          let h = 1;
          grow: for (; v + h < vSize; h++) {
            for (let k = 0; k < w; k++) {
              if (mask[n + k + h * uSize] !== key) break grow;
            }
          }

          // 3) Emitir el quad.
          const plane = slice + (sign > 0 ? 1 : 0);
          const quad = [
            [u, v],
            [u + w, v],
            [u + w, v + h],
            [u, v + h],
          ];
          for (const [qu, qv] of quad) {
            corner[axis] = plane;
            corner[ua] = qu;
            corner[va] = qv;
            positions.push(corner[0], corner[1], corner[2]);
            uvs.push(qu, qv);
            info.push(key - 1, shade);
          }
          const b = vertexCount;
          if (flip) indices.push(b, b + 2, b + 1, b, b + 3, b + 2);
          else indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
          vertexCount += 4;

          // Borrar de la máscara lo ya emitido.
          for (let hh = 0; hh < h; hh++) {
            for (let k = 0; k < w; k++) mask[n + k + hh * uSize] = 0;
          }
          u += w;
          n += w;
        }
      }
    }
  }

  return {
    positions: positions.result(),
    uvs: uvs.result(),
    info: info.result(),
    indices: indices.result(),
  };
}
