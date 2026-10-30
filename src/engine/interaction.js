// Interacción con los bloques: bloque apuntado con contorno de selección,
// romper (clic izquierdo), colocar (clic derecho) y copiar a la mano (clic central).
// En creativo romper es instantáneo y, manteniendo el botón, se repite. En la
// Aventura suave se rompe poco a poco (salen grietas) y colocar gasta bloques.
// Clic derecho sobre un animalito (o Capi o un Brotis) le hace una caricia.

import * as THREE from 'three';
import { raycastBlock } from './raycast.js';
import { BLOCKS, IS_REPLACEABLE, IS_SOLID, IS_LIQUID } from '../blocks/registry.js';
import { TEXTURE_SIZE } from '../blocks/textures.js';

const CRACK_STAGES = 8;
const HIT_EVERY = 0.24; // segundos entre golpecitos mientras se rompe
const AFTER_BREAK_MS = 180; // pausa en aventura antes de empezar el siguiente bloque

// Texturas de grietas (pixel art): rayitas finas que salen del centro y se
// alargan (y se ramifican) en cada etapa. Se dibujan una vez, con un azar fijo.
function crackTextures() {
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const S = TEXTURE_SIZE;
  // Cada rayita: ángulo de salida y pequeños giros a lo largo del camino.
  const rays = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rand() * 0.6;
    rays.push({ a, wiggle: Array.from({ length: 12 }, () => (rand() - 0.5) * 0.9), start: i < 4 ? 0 : 0.35 });
  }
  const stages = [];
  for (let stage = 0; stage < CRACK_STAGES; stage++) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = S;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(25, 14, 34, 0.8)';
    const grow = (stage + 1) / CRACK_STAGES; // 0 → 1
    for (const ray of rays) {
      const length = (grow - ray.start) * 11; // las ramas tardías empiezan más tarde
      let x = S / 2 - 0.5, y = S / 2 - 0.5, a = ray.a;
      for (let r = 0; r < length; r++) {
        a += ray.wiggle[r % ray.wiggle.length];
        x += Math.cos(a);
        y += Math.sin(a);
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    const t = new THREE.CanvasTexture(canvas);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    stages.push(t);
  }
  return stages;
}

// Distancia a la que un rayo entra en una caja, o Infinity si no la toca.
function rayBox(o, d, min, max) {
  let t0 = 0, t1 = Infinity;
  for (const a of ['x', 'y', 'z']) {
    if (Math.abs(d[a]) < 1e-9) {
      if (o[a] < min[a] || o[a] > max[a]) return Infinity;
      continue;
    }
    let ta = (min[a] - o[a]) / d[a], tb = (max[a] - o[a]) / d[a];
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return Infinity;
  }
  return t0;
}

export class Interaction {
  constructor({ scene, camera, world, water, player, hotbar, sounds, settings }) {
    Object.assign(this, { camera, world, water, player, hotbar, sounds, settings });
    this.target = null;
    this.nextBreak = 0;
    this.nextPlace = 0;
    this.direction = new THREE.Vector3();
    this.adventure = false; // modo Aventura suave
    this.onAction = null; // aviso al romper o colocar (para mover la mano)
    this.onBreak = null; // (x, y, z, id): bloque roto (para soltar lo que se recoge)
    this.creatures = null; // () => lista de seres a los que se puede acariciar
    this.onPet = null; // (ser)
    this.breaking = null; // { x, y, z, progress, nextHit } mientras se rompe poco a poco

    // Contorno: aristas de un cubo un poco más grande que el bloque.
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004));
    this.outline = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x1a1030, transparent: true, opacity: 0.55 }),
    );
    this.outline.visible = false;
    scene.add(this.outline);

    // Grietas sobre el bloque que se está rompiendo.
    this.cracks = crackTextures();
    this.crack = new THREE.Mesh(
      new THREE.BoxGeometry(1.006, 1.006, 1.006),
      new THREE.MeshBasicMaterial({ map: this.cracks[0], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }),
    );
    this.crack.visible = false;
    scene.add(this.crack);
  }

  // Llamado al pulsar un botón: actúa en el acto (aunque el clic sea tan
  // rápido que se suelte antes del siguiente fotograma) y programa la repetición.
  mouseDown(button) {
    const now = performance.now();
    this.#updateTarget();
    if (button === 0) {
      // En aventura se rompe poco a poco (en update); las flores, al instante.
      const instant = !this.adventure || (this.target && BLOCKS[this.target.id].hardness === 0);
      if (instant && this.#break()) this.nextBreak = now + this.settings.breakRepeatMs;
    }
    if (button === 2) {
      if (this.#pet()) this.nextPlace = now + 400;
      else if (this.#place()) this.nextPlace = now + this.settings.placeRepeatMs;
    }
    if (button === 1) this.#pick();
  }

  update(buttons, now, dt) {
    this.#updateTarget();
    if (this.adventure) this.#breakSlowly(buttons.has(0), now, dt);
    else if (buttons.has(0) && now >= this.nextBreak) {
      if (this.#break()) this.nextBreak = now + this.settings.breakRepeatMs;
    }
    if (buttons.has(2) && now >= this.nextPlace) {
      if (this.#place()) this.nextPlace = now + this.settings.placeRepeatMs;
    }
  }

  hideOutline() {
    this.outline.visible = false;
    this.target = null;
    this.#stopBreaking();
  }

  #updateTarget() {
    this.camera.getWorldDirection(this.direction);
    this.target = raycastBlock(this.world, this.camera.position, this.direction, this.settings.reach);
    this.outline.visible = !!this.target;
    if (this.target) this.outline.position.set(this.target.x + 0.5, this.target.y + 0.5, this.target.z + 0.5);
  }

  // Aventura: manteniendo el clic, el bloque se va agrietando hasta romperse.
  #breakSlowly(holding, now, dt) {
    const t = this.target;
    if (!holding || !t || now < this.nextBreak) {
      this.#stopBreaking();
      return;
    }
    let b = this.breaking;
    if (!b || b.x !== t.x || b.y !== t.y || b.z !== t.z) {
      b = this.breaking = { x: t.x, y: t.y, z: t.z, progress: 0, nextHit: 0 };
    }
    const hardness = BLOCKS[t.id].hardness;
    b.progress = hardness > 0 ? b.progress + dt / hardness : 1;
    b.nextHit -= dt;
    if (b.nextHit <= 0 && b.progress < 1) {
      b.nextHit = HIT_EVERY;
      this.sounds.play(BLOCKS[t.id].sound, 'step', 0.8);
      this.onAction?.();
    }
    if (b.progress >= 1) {
      this.#stopBreaking();
      if (this.#break()) this.nextBreak = now + AFTER_BREAK_MS;
      return;
    }
    this.crack.material.map = this.cracks[Math.min(CRACK_STAGES - 1, Math.floor(b.progress * CRACK_STAGES))];
    this.crack.position.set(t.x + 0.5, t.y + 0.5, t.z + 0.5);
    this.crack.visible = true;
  }

  #stopBreaking() {
    this.breaking = null;
    this.crack.visible = false;
  }

  #break() {
    const t = this.target;
    if (!t || t.y <= 0) return false; // el fondo del mundo no se rompe
    if (!this.world.setBlock(t.x, t.y, t.z, 0)) return false;
    this.sounds.play(BLOCKS[t.id].sound, 'break');
    this.onAction?.();
    this.onBreak?.(t.x, t.y, t.z, t.id);
    // Flores y antorchas encima se caen con el bloque.
    const above = this.world.getBlock(t.x, t.y + 1, t.z);
    if (above > 0 && BLOCKS[above].needsSupport) {
      this.world.setBlock(t.x, t.y + 1, t.z, 0);
      this.onBreak?.(t.x, t.y + 1, t.z, above);
    }
    this.water.notify(t.x, t.y, t.z); // el agua de al lado puede entrar en el hueco
    this.#updateTarget();
    return true;
  }

  #place() {
    const t = this.target;
    const id = this.hotbar.selectedBlock();
    if (!t || !id) return false;
    // Sobre hierba alta se coloca en su sitio (la sustituye); si no, en la cara apuntada.
    const replaceTarget = IS_REPLACEABLE[t.id];
    const x = replaceTarget ? t.x : t.x + t.normal[0];
    const y = replaceTarget ? t.y : t.y + t.normal[1];
    const z = replaceTarget ? t.z : t.z + t.normal[2];
    const existing = this.world.getBlock(x, y, z);
    if (existing !== 0 && !IS_REPLACEABLE[existing]) return false; // ocupado o sin cargar
    if (BLOCKS[id].solid && this.player.intersectsBlock(x, y, z)) return false; // no encerrarse
    if (BLOCKS[id].needsSupport) {
      const below = this.world.getBlock(x, y - 1, z);
      if (below < 0 || !IS_SOLID[below] || IS_LIQUID[below]) return false; // las flores necesitan suelo
    }
    if (!this.world.setBlock(x, y, z, id)) return false;
    this.hotbar.useSelected();
    this.sounds.play(BLOCKS[id].sound, 'place');
    this.onAction?.();
    this.water.notify(x, y, z);
    this.#updateTarget();
    return true;
  }

  // Caricia: el ser más cercano bajo el punto de mira, si está más cerca que el bloque apuntado.
  #pet() {
    const list = this.creatures?.();
    if (!list?.length) return false;
    const o = this.camera.position, d = this.direction;
    const t = this.target;
    let maxDist = this.settings.reach;
    if (t) maxDist = Math.min(maxDist, Math.hypot(t.x + 0.5 - o.x, t.y + 0.5 - o.y, t.z + 0.5 - o.z));
    let best = null, bestDist = maxDist;
    for (const c of list) {
      const p = c.position, r = c.radius + 0.1;
      const dist = rayBox(o, d, { x: p.x - r, y: p.y, z: p.z - r }, { x: p.x + r, y: p.y + c.height, z: p.z + r });
      if (dist < bestDist) {
        best = c;
        bestDist = dist;
      }
    }
    if (!best) return false;
    this.onAction?.();
    this.onPet?.(best);
    return true;
  }

  #pick() {
    if (this.target) this.hotbar.pick(this.target.id);
  }
}
