// Mallado de chunks (se ejecuta en los workers).
//
// Cubos: "greedy meshing" con ambient occlusion y luz suave por vértice.
//  1. Solo se generan las caras visibles (las que tocan un bloque no opaco).
//  2. Cada esquina de cada cara recibe su AO (cuántos bloques opacos la
//     rodean) y la media de la luz de las celdas que la tocan.
//  3. Las caras contiguas con la misma textura, AO y luz se fusionan en
//     rectángulos grandes, lo que reduce muchísimo el número de triángulos.
// Plantas y antorcha: dos planos cruzados en X, visibles por las dos caras.
// Agua: malla aparte (translúcida), con la superficie algo más baja.
//
// Trabaja sobre la región de 3×3 chunks de lighting.js; el chunk a mallar es
// el del centro (x, z de 16 a 31).

import { CHUNK_SIZE, CHUNK_HEIGHT } from './constants.js';
import { STRIDE_Y, STRIDE_Z, regionIndex } from './lighting.js';
import {
  IS_OPAQUE, IS_CUTOUT, CULL_SAME, FACE_TEXTURE, SHAPE, SHAPE_CUBE, SHAPE_CROSS, SHAPE_LIQUID, IS_LIQUID, LIQUID_LEVEL,
} from '../blocks/registry.js';

const OFFSET = CHUNK_SIZE; // el chunk central empieza en x = z = 16

// Brillo fijo por orientación de cara (+X, -X, +Y, -Y, +Z, -Z), como en el original.
const FACE_SHADE = [0.8, 0.8, 1.0, 0.55, 0.65, 0.65];
// Oscurecimiento por AO: 0 = esquina muy encerrada, 3 = libre.
const AO_CURVE = [0.5, 0.67, 0.83, 1.0];
// Brillo según el nivel de luz en cuartos (0–60): cada nivel menos, un 14 % más
// oscuro (algo más generoso que el original, para que las antorchas luzcan).
const BRIGHTNESS = Float32Array.from({ length: 61 }, (_, q) => Math.pow(0.86, 15 - q / 4));
// Altura de la superficie del agua según su nivel (0 = fuente).
const WATER_HEIGHT = [0.875, 0.72, 0.56, 0.4];

const SIZE = [CHUNK_SIZE, CHUNK_HEIGHT, CHUNK_SIZE];
// Para cada eje normal: ejes del plano (u, v) de la cara.
//   X → (z, y)   Y → (x, z)   Z → (x, y)
const U_AXIS = [2, 0, 0];
const V_AXIS = [1, 2, 1];
// Signo de (U × V) respecto al eje normal, para orientar bien los triángulos.
const CROSS_SIGN = [-1, -1, 1];
const AXIS_STRIDE = [1, STRIDE_Y, STRIDE_Z]; // x, y, z en la región
// Esquinas del quad en (u, v), en orden: (-,-) (+,-) (+,+) (-,+)
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

// Geometría en construcción: posición, uv (en bloques), info (capa, sombreado)
// y luz (cielo, bloque). Escribe en arrays tipados que crecen según se necesita.
const FLOATS_PER_VERTEX = 9;

class MeshBuilder {
  constructor() {
    this.vertices = new Float32Array(4096 * FLOATS_PER_VERTEX);
    this.indices = new Uint32Array(4096 * 1.5);
    this.vertexCount = 0;
    this.indexCount = 0;
  }
  vertex(x, y, z, u, v, layer, shade, sky, block) {
    if ((this.vertexCount + 1) * FLOATS_PER_VERTEX > this.vertices.length) {
      const bigger = new Float32Array(this.vertices.length * 2);
      bigger.set(this.vertices);
      this.vertices = bigger;
    }
    const o = this.vertexCount++ * FLOATS_PER_VERTEX;
    const d = this.vertices;
    d[o] = x; d[o + 1] = y; d[o + 2] = z;
    d[o + 3] = u; d[o + 4] = v;
    d[o + 5] = layer; d[o + 6] = shade;
    d[o + 7] = sky; d[o + 8] = block;
  }
  // Dos triángulos con los 4 últimos vértices; `diagonal13` cambia la diagonal de corte.
  quad(flip, diagonal13 = false) {
    if (this.indexCount + 6 > this.indices.length) {
      const bigger = new Uint32Array(this.indices.length * 2);
      bigger.set(this.indices);
      this.indices = bigger;
    }
    const b = this.vertexCount - 4;
    const [p, q, r, t] = diagonal13 ? [b + 1, b + 2, b + 3, b] : [b, b + 1, b + 2, b + 3];
    const ix = this.indices;
    const k = this.indexCount;
    // Triángulos (p, q, r) y (p, r, t); con flip se invierte el sentido.
    ix[k] = p; ix[k + 1] = flip ? r : q; ix[k + 2] = flip ? q : r;
    ix[k + 3] = p; ix[k + 4] = flip ? t : r; ix[k + 5] = flip ? r : t;
    this.indexCount += 6;
  }
  // Separa los atributos en arrays propios (los que usa Three.js).
  result() {
    const n = this.vertexCount;
    const out = {
      positions: new Float32Array(n * 3),
      uvs: new Float32Array(n * 2),
      info: new Float32Array(n * 2),
      light: new Float32Array(n * 2),
      indices: this.indices.slice(0, this.indexCount),
    };
    const d = this.vertices;
    for (let i = 0; i < n; i++) {
      const o = i * FLOATS_PER_VERTEX;
      out.positions[i * 3] = d[o]; out.positions[i * 3 + 1] = d[o + 1]; out.positions[i * 3 + 2] = d[o + 2];
      out.uvs[i * 2] = d[o + 3]; out.uvs[i * 2 + 1] = d[o + 4];
      out.info[i * 2] = d[o + 5]; out.info[i * 2 + 1] = d[o + 6];
      out.light[i * 2] = d[o + 7]; out.light[i * 2 + 1] = d[o + 8];
    }
    return out;
  }
}

export function meshChunk(region, sky, blockLight) {
  const solid = new MeshBuilder();
  const water = new MeshBuilder();

  meshCubes(region, sky, blockLight, solid);
  meshSpecial(region, sky, blockLight, solid, water);

  return { solid: solid.result(), water: water.result() };
}

// ---------- Cubos (greedy meshing con AO y luz suave) ----------

function meshCubes(region, sky, blockLight, out) {
  const maxCells = CHUNK_HEIGHT * CHUNK_SIZE;
  // Máscara del corte actual: textura + 1 (0 = sin cara), AO de las 4 esquinas
  // (2 bits cada una) y luz de cielo y de bloque de las 4 esquinas (6 bits cada una).
  const mask = new Int16Array(maxCells);
  const maskAo = new Uint8Array(maxCells);
  const maskSky = new Uint32Array(maxCells);
  const maskBlock = new Uint32Array(maxCells);
  const pos = [0, 0, 0];
  const corner = [0, 0, 0];
  const ao = [0, 0, 0, 0];
  // ¿Dos caras de la máscara se pueden fusionar? (misma textura, AO y luz)
  const sameFace = (a, b) =>
    mask[a] === mask[b] && maskAo[a] === maskAo[b] && maskSky[a] === maskSky[b] && maskBlock[a] === maskBlock[b];

  for (let face = 0; face < 6; face++) {
    const axis = face >> 1;
    const sign = face & 1 ? -1 : 1;
    const ua = U_AXIS[axis];
    const va = V_AXIS[axis];
    const uSize = SIZE[ua];
    const vSize = SIZE[va];
    const flip = sign * CROSS_SIGN[axis] < 0;
    const shade = FACE_SHADE[face];
    const front = sign * AXIS_STRIDE[axis];
    const uStride = AXIS_STRIDE[ua];
    const vStride = AXIS_STRIDE[va];

    for (let slice = 0; slice < SIZE[axis]; slice++) {
      // 1) Máscara de caras visibles de este corte, con su AO y luz.
      let n = 0;
      for (let v = 0; v < vSize; v++) {
        for (let u = 0; u < uSize; u++, n++) {
          pos[axis] = slice;
          pos[ua] = u;
          pos[va] = v;
          const i = regionIndex(pos[0] + OFFSET, pos[1], pos[2] + OFFSET);
          const block = region[i];
          mask[n] = 0;
          if (block === 0 || SHAPE[block] !== SHAPE_CUBE) continue;

          const c = i + front; // celda delante de la cara
          const neighbor = region[c];
          // Cara visible si el vecino no es opaco. Entre dos bloques iguales
          // solo se dibuja en las hojas (recortadas y sin CULL_SAME), como en
          // el original; entre dos cristales no.
          if (IS_OPAQUE[neighbor]) continue;
          if (neighbor === block && (!IS_CUTOUT[block] || CULL_SAME[block])) continue;

          let ao = 0, skyPack = 0, blockPack = 0;
          for (let k = 0; k < 4; k++) {
            const du = CORNERS[k][0] * uStride;
            const dv = CORNERS[k][1] * vStride;
            const s1 = IS_OPAQUE[region[c + du]];
            const s2 = IS_OPAQUE[region[c + dv]];
            const cr = IS_OPAQUE[region[c + du + dv]];
            const occlusion = s1 && s2 ? 0 : 3 - s1 - s2 - cr;
            // Luz suave: media de las celdas no opacas que tocan la esquina.
            let skySum = sky[c], blockSum = blockLight[c], count = 1;
            if (!s1) { skySum += sky[c + du]; blockSum += blockLight[c + du]; count++; }
            if (!s2) { skySum += sky[c + dv]; blockSum += blockLight[c + dv]; count++; }
            if (!cr && !(s1 && s2)) { skySum += sky[c + du + dv]; blockSum += blockLight[c + du + dv]; count++; }
            ao |= occlusion << (k * 2);
            skyPack |= Math.round((skySum * 4) / count) << (k * 6);
            blockPack |= Math.round((blockSum * 4) / count) << (k * 6);
          }
          mask[n] = FACE_TEXTURE[block * 6 + face] + 1;
          maskAo[n] = ao;
          maskSky[n] = skyPack;
          maskBlock[n] = blockPack;
        }
      }

      // 2) Fusionar la máscara en rectángulos lo más grandes posible.
      n = 0;
      for (let v = 0; v < vSize; v++) {
        for (let u = 0; u < uSize; ) {
          if (mask[n] === 0) {
            u++;
            n++;
            continue;
          }
          // Anchura: mientras la cara siguiente sea igual.
          let w = 1;
          while (u + w < uSize && sameFace(n, n + w)) w++;
          // Altura: mientras toda la fila siguiente coincida.
          let h = 1;
          grow: for (; v + h < vSize; h++) {
            for (let k = 0; k < w; k++) {
              if (!sameFace(n, n + k + h * uSize)) break grow;
            }
          }

          // 3) Emitir el quad.
          const plane = slice + (sign > 0 ? 1 : 0);
          const layer = mask[n] - 1;
          for (let k = 0; k < 4; k++) ao[k] = (maskAo[n] >> (k * 2)) & 3;
          for (let k = 0; k < 4; k++) {
            const qu = u + (CORNERS[k][0] > 0 ? w : 0);
            const qv = v + (CORNERS[k][1] > 0 ? h : 0);
            corner[axis] = plane;
            corner[ua] = qu;
            corner[va] = qv;
            out.vertex(
              corner[0], corner[1], corner[2], qu, qv, layer,
              shade * AO_CURVE[ao[k]],
              BRIGHTNESS[(maskSky[n] >> (k * 6)) & 63],
              BRIGHTNESS[(maskBlock[n] >> (k * 6)) & 63],
            );
          }
          // Cortar el quad por la diagonal que evita "pliegues" raros del AO.
          out.quad(flip, ao[0] + ao[2] < ao[1] + ao[3]);

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
}

// ---------- Plantas (en X) y agua ----------

function meshSpecial(region, sky, blockLight, solid, water) {
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const i = regionIndex(x + OFFSET, y, z + OFFSET);
        const block = region[i];
        const shape = SHAPE[block];
        if (shape === SHAPE_CROSS) meshCross(solid, x, y, z, block, sky[i], blockLight[i]);
        else if (shape === SHAPE_LIQUID) meshWater(water, region, sky, blockLight, i, x, y, z, block);
      }
    }
  }
}

// Dos planos diagonales, cada uno con sus dos caras.
function meshCross(out, x, y, z, block, skyLevel, blockLevel) {
  const layer = FACE_TEXTURE[block * 6];
  const s = BRIGHTNESS[skyLevel * 4];
  const b = BRIGHTNESS[blockLevel * 4];
  const a = 0.15, c = 0.85; // un poco más estrechas que el bloque
  const planes = [
    [x + a, z + a, x + c, z + c],
    [x + c, z + a, x + a, z + c],
  ];
  for (const [x0, z0, x1, z1] of planes) {
    for (const flip of [false, true]) {
      out.vertex(x0, y, z0, 0, 0, layer, 0.9, s, b);
      out.vertex(x1, y, z1, 1, 0, layer, 0.9, s, b);
      out.vertex(x1, y + 1, z1, 1, 1, layer, 0.9, s, b);
      out.vertex(x0, y + 1, z0, 0, 1, layer, 0.9, s, b);
      out.quad(flip);
    }
  }
}

function meshWater(out, region, sky, blockLight, i, x, y, z, block) {
  const layer = FACE_TEXTURE[block * 6];
  const above = region[i + STRIDE_Y];
  const height = IS_LIQUID[above] ? 1 : WATER_HEIGHT[LIQUID_LEVEL[block]];
  // Luz: la más alta entre la propia celda y la de encima (la superficie brilla con el cielo).
  const light = (c) => [BRIGHTNESS[Math.max(sky[i], sky[c]) * 4], BRIGHTNESS[Math.max(blockLight[i], blockLight[c]) * 4]];
  const visible = (c) => !IS_LIQUID[region[c]] && !IS_OPAQUE[region[c]];

  // Arriba (solo si encima no hay agua) y abajo.
  if (!IS_LIQUID[above] && !IS_OPAQUE[above]) {
    const [s, b] = light(i + STRIDE_Y);
    const h = y + height;
    out.vertex(x, h, z, x, z, layer, 1, s, b);
    out.vertex(x + 1, h, z, x + 1, z, layer, 1, s, b);
    out.vertex(x + 1, h, z + 1, x + 1, z + 1, layer, 1, s, b);
    out.vertex(x, h, z + 1, x, z + 1, layer, 1, s, b);
    out.quad(true);
  }
  if (y > 0 && visible(i - STRIDE_Y)) {
    const [s, b] = light(i - STRIDE_Y);
    out.vertex(x, y, z, x, z, layer, 0.55, s, b);
    out.vertex(x + 1, y, z, x + 1, z, layer, 0.55, s, b);
    out.vertex(x + 1, y, z + 1, x + 1, z + 1, layer, 0.55, s, b);
    out.vertex(x, y, z + 1, x, z + 1, layer, 0.55, s, b);
    out.quad(false);
  }

  // Lados: [desplazamiento en la región, esquinas (x0, z0, x1, z1), sombreado, orientación]
  const sides = [
    [1, x + 1, z + 1, x + 1, z, 0.8],
    [-1, x, z, x, z + 1, 0.8],
    [STRIDE_Z, x, z + 1, x + 1, z + 1, 0.65],
    [-STRIDE_Z, x + 1, z, x, z, 0.65],
  ];
  for (const [d, x0, z0, x1, z1, shade] of sides) {
    if (!visible(i + d)) continue;
    const [s, b] = light(i + d);
    const u0 = x0 + z0, u1 = x1 + z1;
    out.vertex(x0, y, z0, u0, y, layer, shade, s, b);
    out.vertex(x1, y, z1, u1, y, layer, shade, s, b);
    out.vertex(x1, y + height, z1, u1, y + height, layer, shade, s, b);
    out.vertex(x0, y + height, z0, u0, y + height, layer, shade, s, b);
    out.quad(false);
  }
}
