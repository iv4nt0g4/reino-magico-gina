// Utilidades para las plantillas de edificios.
//
// Frame: construir en coordenadas "locales" de una parcela, como si se
// mirara el edificio desde su calle:
//   u = hacia la derecha a lo largo de la fachada
//   v = hacia dentro de la parcela, alejándose de la calle
//   y = altura (la del mundo)
// Así una misma plantilla sirve para casas que miran al norte, sur, este u oeste,
// y los carteles se leen bien desde la calle.

// Ejes de cada orientación (hacia dónde queda la calle).
const AXES = {
  south: { ux: 1, uz: 0, vx: 0, vz: -1 }, // calle al sur: se mira hacia el norte
  north: { ux: -1, uz: 0, vx: 0, vz: 1 },
  east: { ux: 0, uz: -1, vx: -1, vz: 0 },
  west: { ux: 0, uz: 1, vx: 1, vz: 0 },
};

export class Frame {
  // (x, z): esquina de la parcela que queda delante a la izquierda vista desde la calle.
  constructor(builder, x, z, facing) {
    this.b = builder;
    this.x = x;
    this.z = z;
    this.facing = facing;
    Object.assign(this, AXES[facing]);
  }

  // Coordenadas del mundo de un punto local.
  world(u, v) {
    return [this.x + u * this.ux + v * this.vx, this.z + u * this.uz + v * this.vz];
  }

  set(u, y, v, block) {
    const [x, z] = this.world(u, v);
    this.b.set(x, y, z, block);
  }

  get(u, y, v) {
    const [x, z] = this.world(u, v);
    return this.b.get(x, y, z);
  }

  fill(u0, y0, v0, u1, y1, v1, block) {
    for (let v = Math.min(v0, v1); v <= Math.max(v0, v1); v++) {
      for (let u = Math.min(u0, u1); u <= Math.max(u0, u1); u++) {
        for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(u, y, v, block);
      }
    }
  }

  // Caja hueca (paredes y, opcionalmente, suelo y techo distintos).
  hollow(u0, y0, v0, u1, y1, v1, wall, { floor = wall, ceiling = wall } = {}) {
    this.fill(u0, y0, v0, u1, y1, v1, wall);
    this.fill(u0 + 1, y0 + 1, v0 + 1, u1 - 1, y1 - 1, v1 - 1, 'air');
    if (floor !== wall) this.fill(u0 + 1, y0, v0 + 1, u1 - 1, y0, v1 - 1, floor);
    if (ceiling !== wall) this.fill(u0 + 1, y1, v0 + 1, u1 - 1, y1, v1 - 1, ceiling);
  }

  // Dibujo en la fachada (plano v fijo), leído de frente desde la calle.
  pattern(u, yTop, v, rows, palette) {
    rows.forEach((row, r) => {
      [...row].forEach((char, c) => {
        const block = palette[char];
        if (block !== undefined) this.set(u + c, yTop - r, v, block);
      });
    });
  }

  // Tejado a dos aguas sobre (u0..u1, v0..v1). ridge = 'u': la cumbrera va
  // paralela a la calle; 'v': perpendicular. Los extremos se cierran con `gable`.
  roof(u0, y, v0, u1, v1, block, { ridge = 'u', gable = null, overhang = 1 } = {}) {
    const alongU = ridge === 'u';
    const [a0, a1] = alongU ? [v0, v1] : [u0, u1];
    const [c0, c1] = alongU ? [u0 - overhang, u1 + overhang] : [v0 - overhang, v1 + overhang];
    for (let i = 0; a0 - overhang + i <= a1 + overhang - i; i++) {
      const lo = a0 - overhang + i;
      const hi = a1 + overhang - i;
      for (let c = c0; c <= c1; c++) {
        for (const a of [lo, hi]) this.set(alongU ? c : a, y + i, alongU ? a : c, block);
      }
      if (gable) {
        for (let a = Math.max(lo + 1, a0); a <= Math.min(hi - 1, a1); a++) {
          for (const c of [c0 + overhang, c1 - overhang]) this.set(alongU ? c : a, y + i, alongU ? a : c, gable);
        }
      }
    }
  }

  // Escalera de bloques enteros que sube hacia +u o -u (du = ±1) pegada a una
  // pared, con hueco de 4 bloques encima. Se registra para las pruebas.
  stairs(u, y, v, du, steps, block, name) {
    for (let i = 0; i < steps; i++) {
      this.set(u + du * i, y + i, v, block);
      for (let c = 1; c <= 4; c++) this.set(u + du * i, y + i + c, v, 'air');
    }
    // La prueba empieza un paso antes del primer peldaño y sube.
    const [x, z] = this.world(u - du, v);
    const [x1, z1] = this.world(u, v);
    this.b.stairways.push({ name, x, y, z, dx: x1 - x, dz: z1 - z, rise: steps });
  }

  // Puerta (hueco de 1 × 2) en la fachada en (u, v). Se registra para las pruebas.
  door(u, y, v, name) {
    this.fill(u, y, v, u, y + 1, v, 'air');
    const [x, z] = this.world(u, v);
    const [inX, inZ] = this.world(u, v + 1);
    const [outX, outZ] = this.world(u, v - 1);
    this.b.doors.push({ name, x, y, z, inX, inZ, outX, outZ });
  }
}

// Números aleatorios con semilla: la ciudad es variada pero siempre la misma.
export function createRandom(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (a, b) => a + Math.floor(next() * (b - a + 1)), // entero entre a y b (incluidos)
    pick: (list) => list[Math.floor(next() * list.length)],
    chance: (p) => next() < p,
  };
}

// Letras de 5 de alto para carteles con nombres (en mayúsculas).
const FONT = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  L: ['#..', '#..', '#..', '#..', '###'],
  N: ['#..#', '##.#', '#.##', '#..#', '#..#'], // (4 de ancho: en 3 parecería una H)
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  ' ': ['...', '...', '...', '...', '...'],
};

// Convierte un texto en filas para pattern(): '#' = letra, '.' = fondo.
export function textRows(text) {
  const letters = [...text.toUpperCase()].map((ch) => FONT[ch] ?? FONT[' ']);
  return [0, 1, 2, 3, 4].map((r) => letters.map((l) => l[r]).join('.'));
}
