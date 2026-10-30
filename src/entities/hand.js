// La mano de Gina en primera persona: abajo a la derecha se ve su brazo (manga
// rosa) sujetando el bloque elegido en la barra rápida. Se balancea al andar,
// da un golpecito al romper o colocar, y baja y sube al cambiar de bloque.
//
// Se dibuja en una escena aparte, encima del mundo (sin que las paredes
// cercanas la tapen), con su propia cámara.

import * as THREE from 'three';
import { BLOCKS } from '../blocks/registry.js';
import { TEXTURE_SIZE } from '../blocks/textures.js';
import { blockMesh, allMaterials } from '../blocks/blockMesh.js';

const SWING_TIME = 0.25; // segundos que dura el golpecito
const SWITCH_TIME = 0.22; // segundos que dura bajar y subir al cambiar de bloque

// Posiciones en el espacio de la cámara (x a la derecha, y arriba, -z delante).
// El bloque queda a la derecha, por encima de la barra rápida.
const HELD = new THREE.Vector3(0.44, -0.17, -0.6);
const HAND = new THREE.Vector3(0.47, -0.29, -0.57); // justo debajo del bloque
const SHOULDER = new THREE.Vector3(0.8, -0.62, -0.32); // fuera de la pantalla

function canvasTexture(draw) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TEXTURE_SIZE;
  draw(canvas.getContext('2d'));
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Brazo: piel con un poco de grano y una manga rosa en la parte de arriba.
function armTexture() {
  return canvasTexture((ctx) => {
    for (let y = 0; y < TEXTURE_SIZE; y++) {
      for (let x = 0; x < TEXTURE_SIZE; x++) {
        const sleeve = y < 7;
        const n = ((x * 7 + y * 13) % 5) * 3;
        ctx.fillStyle = sleeve
          ? (y === 6 ? '#e86aa8' : `rgb(${246 - n}, ${150 - n}, ${196 - n})`)
          : `rgb(${246 - n}, ${200 - n}, ${170 - n})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
}

export class Hand {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 10);
    this.root = new THREE.Group(); // se desplaza con el balanceo al andar
    this.scene.add(this.root);
    // El "hombro", fuera de la pantalla abajo a la derecha: brazo y bloque giran
    // juntos alrededor de este punto al dar el golpecito.
    this.pivot = new THREE.Group();
    this.pivot.position.copy(SHOULDER);
    this.root.add(this.pivot);
    this.materials = []; // para oscurecerlos de noche
    this.cache = new Map(); // id de bloque → malla
    this.blockMaterials = new Map(); // id de bloque → materiales

    // Brazo: sale de la esquina inferior derecha hacia delante y un poco hacia
    // el centro; la mano queda justo debajo del bloque que sujeta.
    const armMaterial = new THREE.MeshBasicMaterial({ map: armTexture() });
    this.materials.push(armMaterial);
    this.arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.62), armMaterial);
    const hand = HAND.clone().sub(SHOULDER);
    this.arm.position.copy(hand).multiplyScalar(0.55); // centro del brazo, cerca de la mano
    this.pivot.add(this.arm);
    this.arm.lookAt(this.pivot.localToWorld(hand.clone())); // a lo largo, del hombro a la mano

    this.held = null; // malla del bloque en la mano
    this.heldId = -1;
    this.swingTime = 0;
    this.switchTime = 0;
    this.pendingId = null;
    this.bob = 0;

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  // Malla de un bloque para sujetarlo (cubo con sus texturas, o plano para flores y antorchas).
  #meshFor(id) {
    if (this.cache.has(id)) return this.cache.get(id);
    const mesh = blockMesh(id, 0.16, this.blockMaterials);
    if (BLOCKS[id].shape === 'cross') mesh.rotation.y = -0.4;
    else mesh.rotation.set(0.25, 0.8, 0);
    this.cache.set(id, mesh);
    return mesh;
  }

  #setHeld(id) {
    if (this.held) this.pivot.remove(this.held);
    this.held = id ? this.#meshFor(id) : null;
    this.heldId = id;
    if (this.held) {
      // Encima de la mano.
      this.held.position.copy(HELD).sub(SHOULDER);
      this.pivot.add(this.held);
    }
  }

  // Golpecito al romper o colocar.
  swing() {
    this.swingTime = SWING_TIME;
  }

  // Llamar en cada fotograma. `speed`: velocidad horizontal de Gina; `light`: 0–1.
  update(dt, heldId, speed, onGround, light) {
    // Cambio de bloque: bajar la mano, cambiar el bloque a mitad y volver a subir.
    if (heldId !== this.heldId && this.pendingId !== heldId) {
      this.pendingId = heldId;
      this.switchTime = SWITCH_TIME;
    }
    let dip = 0;
    if (this.switchTime > 0) {
      this.switchTime -= dt;
      const t = 1 - Math.max(0, this.switchTime) / SWITCH_TIME; // 0 → 1
      if (t >= 0.5 && this.pendingId !== null) {
        this.#setHeld(this.pendingId);
        this.pendingId = null;
      }
      dip = Math.sin(t * Math.PI) * 0.35;
    }

    // Balanceo al caminar.
    if (onGround && speed > 0.5) this.bob += dt * speed * 2.2;
    const walk = onGround ? Math.min(1, speed / 4) : 0;
    const bobX = Math.sin(this.bob) * 0.025 * walk;
    const bobY = -Math.abs(Math.cos(this.bob)) * 0.03 * walk;

    // Golpecito: el brazo gira hacia delante y hacia el centro desde el hombro, y vuelve.
    let swing = 0;
    if (this.swingTime > 0) {
      this.swingTime -= dt;
      swing = Math.sin((1 - Math.max(0, this.swingTime) / SWING_TIME) * Math.PI);
    }

    this.root.position.set(bobX, bobY - dip, 0);
    this.pivot.rotation.set(-swing * 0.35, swing * 0.45, 0); // hacia delante y hacia el centro
    const l = Math.max(0.4, light);
    for (const m of this.materials) m.color.setScalar(l);
    for (const m of allMaterials(this.blockMaterials)) m.color.setScalar(l);
  }

  render(renderer) {
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = true;
  }
}
