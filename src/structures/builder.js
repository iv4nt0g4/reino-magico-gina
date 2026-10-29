// Pequeño sistema de construcción: funciones reutilizables para levantar
// edificios bloque a bloque en coordenadas del mundo.
//
// No toca el mundo directamente: apunta cada bloque en un mapa por chunk.
// Al crear un mundo nuevo, ese mapa se aplica sobre el terreno generado
// (ver ChunkManager.bakeStructures) y los chunks resultantes se guardan.
// Si dos órdenes ponen bloque en el mismo sitio, gana la última.

import { CHUNK_SIZE, CHUNK_HEIGHT, blockIndex, chunkKey } from '../engine/constants.js';
import { BLOCK } from '../blocks/registry.js';

// Acepta un id o un nombre de bloque ('stone', 'wool_pink'...).
const idOf = (block) => (typeof block === 'string' ? BLOCK[block] : block);

export class StructureBuilder {
  constructor() {
    this.chunks = new Map(); // "cx,cz" → Map(índice en el chunk → id)
    // Registro para las pruebas automáticas: puertas (deben tener paso) y
    // escaleras (deben poder subirse con la física real del jugador).
    this.doors = []; // { name, x, y, z, inX, inZ, outX, outZ }
    this.stairways = []; // { name, x, y, z (pie), dx, dz (dirección), rise (altura que se sube) }
  }

  // ---------- Bloques sueltos ----------

  set(x, y, z, block) {
    if (y < 0 || y >= CHUNK_HEIGHT) return;
    const id = idOf(block);
    if (id === undefined) throw new Error(`Bloque desconocido: ${block}`);
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const key = chunkKey(cx, cz);
    let edits = this.chunks.get(key);
    if (!edits) this.chunks.set(key, (edits = new Map()));
    edits.set(blockIndex(x - cx * CHUNK_SIZE, y, z - cz * CHUNK_SIZE), id);
  }

  // Bloque ya apuntado en (x, y, z), o undefined si no se ha tocado.
  get(x, y, z) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    return this.chunks.get(chunkKey(cx, cz))?.get(blockIndex(x - cx * CHUNK_SIZE, y, z - cz * CHUNK_SIZE));
  }

  // ---------- Cajas ----------

  // Caja maciza entre dos esquinas (incluidas, en cualquier orden).
  fillBox(x0, y0, z0, x1, y1, z1, block) {
    [x0, x1] = [Math.min(x0, x1), Math.max(x0, x1)];
    [y0, y1] = [Math.min(y0, y1), Math.max(y0, y1)];
    [z0, z1] = [Math.min(z0, z1), Math.max(z0, z1)];
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) this.set(x, y, z, block);
      }
    }
  }

  // Caja hueca: paredes de `wall`, interior de aire; suelo y techo opcionales.
  hollowBox(x0, y0, z0, x1, y1, z1, wall, { floor = wall, ceiling = wall, inside = 'air' } = {}) {
    this.fillBox(x0, y0, z0, x1, y1, z1, wall);
    this.fillBox(x0 + 1, y0 + 1, z0 + 1, x1 - 1, y1 - 1, z1 - 1, inside);
    if (floor !== wall) this.fillBox(x0 + 1, y0, z0 + 1, x1 - 1, y0, z1 - 1, floor);
    if (ceiling !== wall) this.fillBox(x0 + 1, y1, z0 + 1, x1 - 1, y1, z1 - 1, ceiling);
  }

  // Anillo rectangular de un bloque de alto (bordes de una caja a una altura).
  ring(x0, y, z0, x1, z1, block) {
    this.fillBox(x0, y, z0, x1, y, z0, block);
    this.fillBox(x0, y, z1, x1, y, z1, block);
    this.fillBox(x0, y, z0, x0, y, z1, block);
    this.fillBox(x1, y, z0, x1, y, z1, block);
  }

  // ---------- Formas redondas ----------

  // ¿(dx, dz) está dentro de un círculo de radio r? (bordes redondeados agradables)
  static inCircle(dx, dz, r) {
    return dx * dx + dz * dz <= r * r + r * 0.8;
  }

  // Cilindro vertical centrado en (cx, cz). Hueco: solo la pared de 1 bloque.
  cylinder(cx, y0, cz, r, height, block, { hollow = false, inside = 'air' } = {}) {
    for (let y = y0; y < y0 + height; y++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (!StructureBuilder.inCircle(dx, dz, r)) continue;
          const edge = !StructureBuilder.inCircle(Math.abs(dx) + 1, dz, r) || !StructureBuilder.inCircle(dx, Math.abs(dz) + 1, r);
          if (!hollow || edge) this.set(cx + dx, y, cz + dz, block);
          else if (inside !== null) this.set(cx + dx, y, cz + dz, inside);
        }
      }
    }
  }

  // Cono (tejado de torre) que empieza con radio r y se estrecha hasta la punta.
  cone(cx, y0, cz, r, height, block) {
    for (let k = 0; k < height; k++) {
      const radius = Math.max(0, Math.round(r * (1 - k / height)));
      if (radius === 0) {
        this.set(cx, y0 + k, cz, block);
        continue;
      }
      this.cylinder(cx, y0 + k, cz, radius, 1, block, { hollow: true, inside: null });
    }
  }

  // ---------- Escaleras y tejados ----------

  // Farola: poste de piedra blanca con un farolillo encima.
  lampPost(x, y, z) {
    this.fillBox(x, y, z, x, y + 1, z, 'white_stone');
    this.set(x, y + 2, z, 'lantern');
  }

  // Escalera de bloques enteros: `steps` peldaños que suben en la dirección
  // (dx, dz), de `width` de ancho hacia el lado (sx, sz). Se despeja `clear`
  // bloques por encima de cada peldaño para que quepa la cabeza.
  stairs(x, y, z, dx, dz, steps, block, { width = 1, sx = 1, sz = 0, clear = 3, down = false } = {}) {
    for (let i = 0; i < steps; i++) {
      const sy = down ? y - i : y + i;
      for (let w = 0; w < width; w++) {
        const px = x + dx * i + sx * w;
        const pz = z + dz * i + sz * w;
        this.set(px, sy, pz, block);
        for (let c = 1; c <= clear; c++) this.set(px, sy + c, pz, 'air');
      }
    }
  }

  // Tejado a dos aguas sobre el rectángulo (x0..x1, z0..z1) que empieza en la
  // altura y. `ridge` = 'x' (la cumbrera va a lo largo de x) o 'z'. Los
  // triángulos de los extremos se rellenan con `gable`.
  roof(x0, y, z0, x1, z1, block, { ridge = 'x', gable = null, overhang = 1 } = {}) {
    const alongX = ridge === 'x';
    const [a0, a1] = alongX ? [z0, z1] : [x0, x1]; // dirección de la pendiente
    const [b0, b1] = alongX ? [x0 - overhang, x1 + overhang] : [z0 - overhang, z1 + overhang];
    for (let i = 0; a0 - overhang + i <= a1 + overhang - i; i++) {
      const lo = a0 - overhang + i;
      const hi = a1 + overhang - i;
      for (let b = b0; b <= b1; b++) {
        for (const a of [lo, hi]) {
          if (alongX) this.set(b, y + i, a, block);
          else this.set(a, y + i, b, block);
        }
      }
      // Triángulos de los extremos, por debajo del tejado.
      if (gable) {
        for (let a = Math.max(lo + 1, a0); a <= Math.min(hi - 1, a1); a++) {
          for (const b of [b0 + overhang, b1 - overhang]) {
            if (alongX) this.set(b, y + i, a, gable);
            else this.set(a, y + i, b, gable);
          }
        }
      }
    }
  }

  // ---------- Detalles ----------

  // Ventana: rectángulo de `width` × `height` en una pared. `axis` es el eje a
  // lo largo del cual va la pared ('x' o 'z').
  window(x, y, z, axis, width, height, block = 'glass') {
    for (let h = 0; h < height; h++) {
      for (let w = 0; w < width; w++) {
        if (axis === 'x') this.set(x + w, y + h, z, block);
        else this.set(x, y + h, z + w, block);
      }
    }
  }

  // Dibujo en un plano vertical a partir de filas de texto (la primera fila es
  // la de arriba). Cada carácter se traduce con `palette`; ' ' no pone nada.
  // `axis` = 'x' dibuja hacia +x (se lee de frente desde +z); 'z' dibuja hacia
  // -z (se lee de frente desde +x).
  pattern(x, yTop, z, axis, rows, palette) {
    rows.forEach((row, r) => {
      [...row].forEach((char, c) => {
        const block = palette[char];
        if (block === undefined) return;
        if (axis === 'x') this.set(x + c, yTop - r, z, block);
        else this.set(x, yTop - r, z - c, block);
      });
    });
  }

  // Árbol pequeño hecho a mano (para jardines). Las hojas solo ocupan
  // huecos libres: no sustituyen muros ya construidos.
  tree(x, y, z, type = 'cherry', height = 4) {
    const log = `${type}_log`;
    const leaves = `${type}_leaves`;
    for (let dy = height - 2; dy <= height + 1; dy++) {
      const r = dy >= height ? 1 : 2;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) === r && Math.abs(dz) === r && r > 1) continue;
          const current = this.get(x + dx, y + dy, z + dz);
          if (current === undefined || current === BLOCK.air) this.set(x + dx, y + dy, z + dz, leaves);
        }
      }
    }
    for (let dy = 0; dy < height; dy++) this.set(x, y + dy, z, log);
  }

  // ---------- Aplicar al mundo ----------

  // Aplica lo apuntado a los bloques de un chunk recién generado.
  applyTo(key, blocks) {
    const edits = this.chunks.get(key);
    if (!edits) return blocks;
    for (const [index, id] of edits) blocks[index] = id;
    return blocks;
  }
}
