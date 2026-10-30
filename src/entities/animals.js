// Animalitos del reino (diseños originales hechos con bloques): conejos,
// ovejas de colores, patos, gatitos, ponis y capibaras. Pasean, miran a
// Gina cuando se acerca y la saludan con su sonido y unos corazoncitos.
// Nada hostil: ninguno hace daño ni huye asustado.
//
// Aparecen alrededor de Gina según el sitio: gatitos por las calles, patos
// en el agua, capibaras cerca del agua y el resto sobre la hierba.

import { Creature, MAX_STEP } from './creature.js';
import { buildModel, fur, wool, face, withFace } from './models.js';
import { BLOCK, IS_LIQUID } from '../blocks/registry.js';

const MAX_ALIVE = 12;
const MAX_PER_SPECIES = 4;
const SPAWN_MIN = 12;
const SPAWN_MAX = 40;
const DESPAWN = 70;
const SPAWN_EVERY = 2;
const NOTICE = 6; // a esta distancia miran a Gina
const GREET = 2.6; // a esta distancia la saludan
const STREET = new Set([BLOCK.cobblestone, BLOCK.gravel, BLOCK.white_stone]);
const ORANGE = [244, 150, 40];

// ---------- Especies ----------
// Cada especie: velocidad, si nada o salta, dónde aparece, colores y su modelo.

export const SPECIES = {
  conejo: {
    speed: 1.6,
    hops: true,
    where: ['hierba'],
    colors: [[244, 244, 244], [176, 132, 96], [160, 160, 166]],
    headY: 0.75,
    parts: (c) => [
      { name: 'body', size: [0.4, 0.34, 0.55], at: [0, 0.3, 0.05], tex: fur(c) },
      { name: 'head', size: [0.36, 0.34, 0.34], pivot: [0, 0.42, -0.2], at: [0, 0.58, -0.32], tex: withFace(fur(c), face(c, { nose: [250, 150, 170] })) },
      { name: 'earL', parent: 'head', size: [0.08, 0.32, 0.06], at: [-0.09, 0.47, -0.1], tex: fur(c) },
      { name: 'earR', parent: 'head', size: [0.08, 0.32, 0.06], at: [0.09, 0.47, -0.1], tex: fur(c) },
      { name: 'tail', size: [0.14, 0.14, 0.12], at: [0, 0.38, 0.36], tex: fur([250, 250, 250]) },
      ...legs(c, 0.12, 0.15, 0.17, 0.1),
    ],
  },
  oveja: {
    speed: 1.2,
    where: ['hierba'],
    colors: [[244, 244, 244], [248, 196, 214], [184, 222, 246], [250, 236, 160], [212, 190, 240], [188, 236, 210]],
    headY: 1.1,
    parts: (c) => {
      const skin = [232, 214, 196];
      return [
        { name: 'body', size: [0.8, 0.6, 1.0], at: [0, 0.75, 0.05], tex: wool(c) },
        { name: 'head', size: [0.4, 0.4, 0.42], pivot: [0, 0.85, -0.45], at: [0, 0.05, -0.18], tex: withFace(fur(skin), face(skin, { eyeY: 7, blush: [250, 170, 190] })) },
        { name: 'tuft', parent: 'head', size: [0.44, 0.12, 0.3], at: [0, 0.27, -0.12], tex: wool(c) },
        ...legs(skin, 0.24, 0.45, 0.3, 0.16),
      ];
    },
  },
  pato: {
    speed: 1.0,
    swims: true,
    waddles: true,
    where: ['agua', 'orilla'],
    colors: [[248, 248, 248], [252, 226, 110]],
    headY: 0.7,
    parts: (c) => {
      const orange = [246, 160, 60];
      return [
        { name: 'body', size: [0.42, 0.34, 0.6], at: [0, 0.3, 0.05], tex: fur(c, 0.06) },
        { name: 'tail', size: [0.22, 0.1, 0.12], at: [0, 0.42, 0.38], tex: fur(c, 0.06) },
        { name: 'head', size: [0.3, 0.3, 0.3], pivot: [0, 0.45, -0.18], at: [0, 0.16, -0.05], tex: withFace(fur(c, 0.06), face(c, { eyeY: 5, eyeGap: 3, eyeSize: 2, mouth: false })) },
        { name: 'beak', parent: 'head', size: [0.18, 0.08, 0.16], at: [0, 0.1, -0.26], tex: fur(orange, 0.05) },
        { name: 'legFL', size: [0.1, 0.06, 0.16], pivot: [-0.1, 0.06, -0.02], at: [-0.1, 0.03, -0.04], tex: fur(orange, 0.05) },
        { name: 'legFR', size: [0.1, 0.06, 0.16], pivot: [0.1, 0.06, -0.02], at: [0.1, 0.03, -0.04], tex: fur(orange, 0.05) },
      ];
    },
  },
  gato: {
    speed: 1.3,
    follows: true, // los gatitos se acercan a Gina
    where: ['calle'],
    colors: [[236, 160, 80], [160, 160, 168], [240, 226, 200], [246, 246, 246]],
    headY: 0.75,
    parts: (c) => [
      { name: 'body', size: [0.3, 0.3, 0.62], at: [0, 0.4, 0.05], tex: fur(c) },
      { name: 'head', size: [0.36, 0.32, 0.3], pivot: [0, 0.5, -0.24], at: [0, 0.08, -0.12], tex: withFace(fur(c), face(c, { nose: [250, 150, 170] })) },
      { name: 'earL', parent: 'head', size: [0.1, 0.12, 0.06], at: [-0.11, 0.29, -0.1], tex: fur(c) },
      { name: 'earR', parent: 'head', size: [0.1, 0.12, 0.06], at: [0.11, 0.29, -0.1], tex: fur(c) },
      { name: 'tail', size: [0.07, 0.07, 0.45], pivot: [0, 0.5, 0.34], at: [0, 0.5, 0.56], tex: fur(c) },
      ...legs(c, 0.1, 0.28, 0.22, 0.09),
    ],
  },
  poni: {
    speed: 1.8,
    where: ['hierba'],
    colors: [
      [[248, 248, 248], [250, 140, 196]],
      [[216, 196, 240], [120, 190, 250]],
      [[246, 220, 180], [180, 110, 220]],
    ],
    headY: 1.8,
    parts: ([c, mane]) => [
      { name: 'body', size: [0.6, 0.6, 1.1], at: [0, 0.95, 0.05], tex: fur(c, 0.06) },
      { name: 'head', size: [0.3, 0.55, 0.3], pivot: [0, 1.15, -0.45], at: [0, 0.2, -0.05], tex: fur(c, 0.06) },
      { name: 'face', parent: 'head', size: [0.34, 0.34, 0.5], at: [0, 0.5, -0.2], tex: withFace(fur(c, 0.06), face(c, { eyeY: 4, eyeGap: 4, nose: [200, 150, 160] })) },
      { name: 'mane', parent: 'head', size: [0.1, 0.6, 0.42], at: [0, 0.45, 0.08], tex: fur(mane, 0.15) },
      { name: 'tail', size: [0.14, 0.6, 0.14], pivot: [0, 1.15, 0.6], at: [0, 0.85, 0.65], tex: fur(mane, 0.15) },
      ...legs(c, 0.18, 0.68, 0.36, 0.16),
    ],
  },
  capibara: {
    speed: 1.1,
    swims: true,
    where: ['orilla', 'agua'],
    colors: [[156, 108, 68], [170, 120, 78]],
    headY: 1.0,
    parts: (c, { orange = false } = {}) => capybaraParts(c, orange),
  },
};

// Cuatro patas que giran desde la cadera: separación lateral, alto, separación
// delante-detrás y grosor.
function legs(c, side, height, front, thick) {
  return [
    ['legFL', -side, -front], ['legFR', side, -front], ['legBL', -side, front], ['legBR', side, front],
  ].map(([name, x, z]) => ({ name, size: [thick, height, thick], pivot: [x, height, z], at: [x, height / 2, z], tex: fur(c.map((v) => v * 0.92)) }));
}

export function capybaraParts(c, orange) {
  const dark = c.map((v) => v * 0.7);
  const parts = [
    { name: 'body', size: [0.7, 0.6, 1.05], at: [0, 0.55, 0.05], tex: fur(c, 0.14) },
    { name: 'head', size: [0.46, 0.44, 0.55], pivot: [0, 0.7, -0.45], at: [0, 0.02, -0.22], tex: withFace(fur(c, 0.14), face(c, { eyeY: 4, eyeGap: 4, eyeSize: 2, nose: [70, 46, 34], mouth: false })) },
    { name: 'earL', parent: 'head', size: [0.1, 0.1, 0.06], at: [-0.17, 0.27, -0.05], tex: fur(dark) },
    { name: 'earR', parent: 'head', size: [0.1, 0.1, 0.06], at: [0.17, 0.27, -0.05], tex: fur(dark) },
    ...legs(c, 0.2, 0.25, 0.35, 0.16),
  ];
  if (orange) {
    // La famosa mandarina en la cabeza, con su hojita.
    parts.push({ name: 'orange', parent: 'head', size: [0.2, 0.16, 0.2], at: [0, 0.32, -0.2], tex: fur(ORANGE, 0.1) });
    parts.push({ name: 'leaf', parent: 'head', size: [0.06, 0.04, 0.1], at: [0.04, 0.42, -0.2], tex: fur([90, 170, 70], 0.1) });
  }
  return parts;
}

// ---------- Un animalito ----------

export class Animal extends Creature {
  constructor(kind, x, y, z, model, color) {
    const sp = SPECIES[kind];
    super(x, y, z, { radius: 0.35, height: sp.headY, swims: !!sp.swims });
    Object.assign(this, { kind, sp, model, color });
    this.timer = Math.random() * 3;
    this.greetCooldown = 2 + Math.random() * 4;
    this.lookAt = null; // ángulo absoluto hacia Gina, o null
  }

  update(dt, world, gina, fx) {
    const sp = this.sp;
    const p = this.position;
    const dx = gina.x - p.x, dz = gina.z - p.z;
    const dist = Math.hypot(dx, dz, (gina.y - p.y) * 0.5);
    this.greetCooldown -= dt;
    this.lookAt = null;

    let speed = 0;
    if (dist < NOTICE) {
      this.lookAt = Math.atan2(-dx, -dz);
      if (sp.follows && dist > 1.8) {
        this.goal = this.lookAt;
        speed = sp.speed;
      }
      if (dist < GREET && this.greetCooldown <= 0) {
        this.greetCooldown = 8 + Math.random() * 6;
        if (this.onGround) this.vy = 4.5; // saltito de alegría
        fx.hearts(p.x, p.y + sp.headY + 0.3, p.z);
        fx.sound(this.kind, Math.max(0.3, 1 - dist / 10));
      }
    } else {
      // Paseo tranquilo: cambia de idea de vez en cuando.
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = 2 + Math.random() * 5;
        this.goal = Math.random() < 0.4 ? null : Math.random() * Math.PI * 2;
      }
      if (this.goal !== null) speed = sp.speed * 0.7;
      // A veces hacen su sonido aunque Gina no esté cerca (si se oye).
      if (Math.random() < dt * 0.02 && dist < 20) fx.sound(this.kind, 0.5 * (1 - dist / 20));
    }

    if (sp.hops && speed > 0 && this.onGround) this.vy = 4.2; // los conejos van a saltitos
    this.turn(dt);
    this.move(dt, world, speed);
    if (this.blocked) {
      this.goal = this.heading + Math.PI * (0.5 + Math.random());
      this.timer = 1.5;
    }
    animate(this, dt, speed);
  }
}

// Movimiento de las partes del modelo: patas, cabeza mirando a Gina, colas.
export function animate(a, dt, speed, { sitting = false } = {}) {
  const { root, parts } = a.model;
  root.position.copy(a.position);
  root.rotation.y = a.heading;
  const swing = speed > 0 && !a.inWater ? Math.sin(a.walkPhase) * 0.6 : 0;
  for (const [name, sign] of [['legFL', 1], ['legBR', 1], ['legFR', -1], ['legBL', -1]]) {
    if (parts[name]) parts[name].rotation.x = sitting && name.startsWith('legB') ? -1.2 : swing * sign;
  }
  if (a.sp?.waddles) root.rotation.z = speed > 0 && !a.inWater ? Math.sin(a.walkPhase) * 0.12 : 0;
  // La cabeza gira hacia Gina (sin pasarse de lado).
  if (parts.head) {
    const target = a.lookAt === null ? 0 : Math.max(-1, Math.min(1, Math.atan2(Math.sin(a.lookAt - a.heading), Math.cos(a.lookAt - a.heading))));
    parts.head.rotation.y += (target - parts.head.rotation.y) * Math.min(1, dt * 6);
  }
  const t = performance.now() / 1000 + a.position.x;
  if (parts.tail && a.kind === 'gato') parts.tail.rotation.set(-0.9, Math.sin(t * 2) * 0.4, 0);
  if (parts.tail && a.kind === 'poni') parts.tail.rotation.x = 0.2 + Math.sin(t * 1.5) * 0.15;
  // Sentado: la parte de atrás baja.
  root.rotation.x = sitting ? -0.2 : 0;
  if (sitting) root.position.y -= 0.12;
}

// ---------- Gestor de animalitos ----------

export class AnimalManager {
  constructor(scene, world, sounds) {
    Object.assign(this, { scene, world, sounds });
    this.materialCache = new Map();
    this.list = [];
    this.spawnTimer = 0;
  }

  // Bloque más alto de la columna (agua incluida), o null si no está cargada.
  #surface(x, z) {
    for (let y = 110; y > 20; y--) {
      const id = this.world.getBlock(x, y, z);
      if (id < 0) return null;
      if (id !== 0) return { y, id };
    }
    return null;
  }

  #nearWater(x, y, z) {
    for (const [dx, dz] of [[6, 0], [-6, 0], [0, 6], [0, -6], [4, 4], [-4, -4], [4, -4], [-4, 4]]) {
      const id = this.world.getBlock(x + dx, y, z + dz);
      if (id > 0 && IS_LIQUID[id]) return true;
    }
    return false;
  }

  // Busca un sitio y una especie que encaje con él.
  #pickSpawn(gina) {
    const a = Math.random() * Math.PI * 2;
    const d = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
    const x = Math.floor(gina.x + Math.cos(a) * d);
    const z = Math.floor(gina.z + Math.sin(a) * d);
    const s = this.#surface(x, z);
    if (!s) return null;
    let place = null;
    if (IS_LIQUID[s.id]) place = 'agua';
    else if (s.id === BLOCK.grass || s.id === BLOCK.sand) place = this.#nearWater(x, s.y, z) ? 'orilla' : 'hierba';
    else if (STREET.has(s.id)) place = 'calle';
    if (!place) return null;
    const count = (k) => this.list.filter((an) => an.kind === k).length;
    // En la orilla también valen los animales de hierba.
    const fits = (k) => SPECIES[k].where.includes(place) || (place === 'orilla' && SPECIES[k].where.includes('hierba'));
    const options = Object.keys(SPECIES).filter((k) => fits(k) && count(k) < MAX_PER_SPECIES);
    if (!options.length) return null;
    const kind = options[Math.floor(Math.random() * options.length)];
    const y = IS_LIQUID[s.id] ? s.y : s.y + 1;
    return { kind, x: x + 0.5, y, z: z + 0.5 };
  }

  spawn(kind, x, y, z, { orange = false } = {}) {
    const sp = SPECIES[kind];
    const color = sp.colors[Math.floor(Math.random() * sp.colors.length)];
    const model = buildModel(sp.parts(color, { orange }), this.materialCache);
    const animal = new Animal(kind, x, y, z, model, color);
    this.scene.add(model.root);
    this.list.push(animal);
    return animal;
  }

  update(dt, gina, light, sparkles) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = SPAWN_EVERY;
      // Varios intentos: en la ciudad muchos puntos caen en tejados.
      for (let attempt = 0; attempt < 5 && this.list.length < MAX_ALIVE; attempt++) {
        const spot = this.#pickSpawn(gina);
        if (!spot) continue;
        this.spawn(spot.kind, spot.x, spot.y, spot.z, { orange: spot.kind === 'capibara' && Math.random() < 0.3 });
        break;
      }
    }
    for (const a of [...this.list]) {
      if (a.position.distanceTo(gina) > DESPAWN) {
        this.scene.remove(a.model.root);
        this.list.splice(this.list.indexOf(a), 1);
      }
    }
    // Luz del día (los materiales son compartidos entre animales).
    const l = Math.max(0.35, light);
    for (const m of this.materialCache.values()) m.color.setScalar(l);

    const fx = {
      hearts: (x, y, z) => sparkles.burst(x, y, z, 6, ['corazon']),
      sound: (kind, volume) => this.sounds.animal(kind, volume),
    };
    const steps = Math.ceil(dt / MAX_STEP);
    for (const a of this.list) {
      for (let i = 0; i < steps; i++) a.update(dt / steps, this.world, gina, fx);
    }
  }
}
