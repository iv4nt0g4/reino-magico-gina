// Brotis, el amiguito verde del reino (diseño original): pasea por la hierba,
// mira a Gina cuando se acerca y, si está muy cerca, da un saltito de alegría
// con cara feliz, suelta flores, estrellas y corazones y hace un "pío".
// Nunca hace daño ni da miedo.

import * as THREE from 'three';
import { paintTexture, TEXTURE_SIZE } from '../blocks/textures.js';
import { BLOCK, IS_SOLID } from '../blocks/registry.js';
import { Creature, MAX_STEP } from './creature.js';

const MAX_ALIVE = 8; // como mucho, alrededor de Gina
const SPAWN_MIN = 14; // distancia de aparición (bloques)
const SPAWN_MAX = 40;
const DESPAWN = 70; // más lejos, desaparece
const SPAWN_EVERY = 2.5; // segundos entre intentos
const WALK_SPEED = 1.1;
const NOTICE = 9; // a esta distancia mira a Gina y se acerca
const FRIEND = 2.6; // a esta distancia se queda cerca de ella
const JOY = 3.5; // a esta distancia salta de alegría
const JOY_COOLDOWN = 6;

// Textura de un canvas 16 × 16 a partir de un dibujo de blocks/textures.js.
function texture(name) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TEXTURE_SIZE;
  canvas.getContext('2d').putImageData(new ImageData(paintTexture(name), TEXTURE_SIZE, TEXTURE_SIZE), 0, 0);
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Materiales compartidos por todos los Brotis.
function createMaterials() {
  const mat = (name) => new THREE.MeshBasicMaterial({ map: texture(name) });
  const skin = mat('brotis_piel');
  const faces = { feliz: mat('brotis_cara_feliz'), alegre: mat('brotis_cara_alegre'), dormido: mat('brotis_cara_dormido') };
  return { skin, feet: mat('brotis_pie'), leaf: new THREE.MeshBasicMaterial({ map: texture('brotis_hoja'), side: THREE.DoubleSide }), faces, all: [skin] };
}

// Modelo: cuerpo, cabeza con cara (mira hacia -z), cuatro patitas y un brote de dos hojas.
function createModel(m) {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.4), m.skin);
  body.position.y = 0.6;
  root.add(body);
  // Cabeza: la cara delante (caras de BoxGeometry: +x, -x, +y, -y, +z, -z).
  const headMats = [m.skin, m.skin, m.skin, m.skin, m.skin, m.faces.feliz];
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), headMats);
  head.position.y = 1.3;
  root.add(head);
  const feet = [];
  for (const [x, z] of [[-0.18, -0.24], [0.18, -0.24], [-0.18, 0.24], [0.18, 0.24]]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 0.22), m.feet);
    foot.position.set(x, 0.125, z);
    root.add(foot);
    feet.push(foot);
  }
  // Brote: tallito y dos hojas inclinadas.
  const sprout = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), m.feet);
  stem.position.y = 0.09;
  sprout.add(stem);
  for (const side of [-1, 1]) {
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.14), m.leaf);
    leaf.position.set(side * 0.12, 0.2, 0);
    leaf.rotation.z = side * 0.5;
    sprout.add(leaf);
  }
  sprout.position.y = 1.65;
  root.add(sprout);
  return { root, head, headMats, feet, sprout };
}

class Brotis extends Creature {
  constructor(materials, x, y, z) {
    super(x, y, z, { radius: 0.35, height: 1.8 });
    this.materials = materials;
    this.model = createModel(materials);
    this.timer = Math.random() * 3;
    this.joyCooldown = 0;
    this.joyTime = 0; // dura la cara de alegría
    this.blinkTime = 2 + Math.random() * 3;
  }

  update(dt, world, gina, fx) {
    const p = this.position;
    const toGina = new THREE.Vector2(gina.x - p.x, gina.z - p.z);
    const dist = Math.hypot(toGina.x, toGina.y, (gina.y - p.y) * 0.5);
    this.joyCooldown -= dt;
    this.joyTime -= dt;

    // --- Decidir qué hacer ---
    let speed = 0;
    if (dist < NOTICE) {
      // Mira a Gina y se acerca hasta quedarse a su lado.
      this.goal = Math.atan2(-toGina.x, -toGina.y);
      speed = dist > FRIEND ? WALK_SPEED : 0;
      if (dist < JOY && this.joyCooldown <= 0 && this.onGround) {
        this.vy = 6; // saltito de alegría
        this.joyTime = 1.4;
        this.joyCooldown = JOY_COOLDOWN + Math.random() * 3;
        fx.burst(p.x, p.y + 1.6, p.z);
        fx.chirp();
      }
    } else {
      // Paseo tranquilo: cambia de idea de vez en cuando.
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = 2 + Math.random() * 4;
        this.goal = Math.random() < 0.35 ? null : Math.random() * Math.PI * 2;
      }
      if (this.goal !== null) speed = WALK_SPEED * 0.7;
    }

    this.turn(dt);
    this.move(dt, world, speed);
    if (this.blocked) {
      this.goal = this.heading + Math.PI * (0.5 + Math.random()); // dar la vuelta
      this.timer = 1.5;
    }

    this.#animate(dt, speed);
  }

  #animate(dt, speed) {
    const { root, feet, sprout, headMats } = this.model;
    root.position.copy(this.position);
    root.rotation.y = this.heading;
    // Patitas que se mueven al andar y brote que se balancea.
    const swing = speed > 0 ? Math.sin(this.walkPhase) * 0.08 : 0;
    feet.forEach((foot, i) => (foot.position.y = 0.125 + Math.max(0, i % 2 ? swing : -swing)));
    sprout.rotation.z = Math.sin(performance.now() / 400 + this.position.x) * 0.15;
    // Cara: alegre tras el saltito; si no, parpadea de vez en cuando.
    this.blinkTime -= dt;
    if (this.blinkTime < -0.15) this.blinkTime = 2 + Math.random() * 4;
    const faces = this.materials.faces;
    headMats[5] = this.joyTime > 0 ? faces.alegre : this.blinkTime < 0 ? faces.dormido : faces.feliz;
    this.model.head.material = headMats;
  }
}

export class BrotisManager {
  constructor(scene, world, sounds) {
    this.scene = scene;
    this.world = world;
    this.sounds = sounds;
    this.materials = createMaterials();
    this.list = [];
    this.spawnTimer = 0;
  }

  // Busca un sitio con hierba al aire libre cerca de Gina (o devuelve null).
  #findSpot(gina, min, max) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const a = Math.random() * Math.PI * 2;
      const d = min + Math.random() * (max - min);
      const x = Math.floor(gina.x + Math.cos(a) * d);
      const z = Math.floor(gina.z + Math.sin(a) * d);
      const y = this.world.topSolidY(x, z);
      if (y < 0) continue;
      if (this.world.getBlock(x, y, z) !== BLOCK.grass) continue; // solo sobre hierba (no tejados ni agua)
      const above = this.world.getBlock(x, y + 1, z);
      if (above !== 0 && !(above === BLOCK.tall_grass || BLOCKS_PLANT.has(above))) continue;
      if (IS_SOLID[this.world.getBlock(x, y + 2, z)]) continue;
      return [x + 0.5, y + 1, z + 0.5];
    }
    return null;
  }

  // `light` (0–1): cuánta luz hay, para que de noche no brillen de más.
  update(dt, gina, light, sparkles) {
    // Aparecer y desaparecer.
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = SPAWN_EVERY;
      // Al principio aparecen un poco más cerca, para que Gina los vea pronto.
      const near = this.list.length === 0;
      if (this.list.length < MAX_ALIVE) {
        const spot = this.#findSpot(gina, near ? 8 : SPAWN_MIN, near ? 20 : SPAWN_MAX);
        if (spot) this.#spawn(...spot);
      }
    }
    for (const b of [...this.list]) {
      if (b.position.distanceTo(gina) > DESPAWN) this.#despawn(b);
    }

    // Luz (los materiales son compartidos: basta con ajustar uno de cada).
    const l = Math.max(0.35, light);
    for (const m of [this.materials.skin, this.materials.feet, this.materials.leaf, ...Object.values(this.materials.faces)]) m.color.setScalar(l);

    const fx = { burst: (x, y, z) => sparkles.burst(x, y, z), chirp: () => this.sounds.chirp() };
    const steps = Math.ceil(dt / MAX_STEP);
    for (const b of this.list) {
      for (let i = 0; i < steps; i++) b.update(dt / steps, this.world, gina, fx);
    }
  }

  #spawn(x, y, z) {
    const b = new Brotis(this.materials, x, y, z);
    this.scene.add(b.model.root);
    this.list.push(b);
  }

  #despawn(b) {
    this.scene.remove(b.model.root);
    this.list.splice(this.list.indexOf(b), 1);
  }
}

// Plantas sobre la hierba (un Brotis puede aparecer encima de ellas).
const BLOCKS_PLANT = new Set(['flower_red', 'flower_yellow', 'flower_blue', 'flower_pink', 'flower_white'].map((n) => BLOCK[n]));
