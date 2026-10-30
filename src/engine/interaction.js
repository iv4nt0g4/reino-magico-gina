// Interacción con los bloques: bloque apuntado con contorno de selección,
// romper (clic izquierdo), colocar (clic derecho) y copiar a la mano (clic central).
// En modo creativo romper es instantáneo; manteniendo el botón se repite.

import * as THREE from 'three';
import { raycastBlock } from './raycast.js';
import { BLOCKS, IS_REPLACEABLE, IS_SOLID, IS_LIQUID } from '../blocks/registry.js';

export class Interaction {
  constructor({ scene, camera, world, water, player, hotbar, sounds, settings }) {
    Object.assign(this, { camera, world, water, player, hotbar, sounds, settings });
    this.target = null;
    this.nextBreak = 0;
    this.nextPlace = 0;
    this.direction = new THREE.Vector3();
    this.onAction = null; // aviso al romper o colocar (para mover la mano)

    // Contorno: aristas de un cubo un poco más grande que el bloque.
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004));
    this.outline = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x1a1030, transparent: true, opacity: 0.55 }),
    );
    this.outline.visible = false;
    scene.add(this.outline);
  }

  // Llamado al pulsar un botón: actúa en el acto (aunque el clic sea tan
  // rápido que se suelte antes del siguiente fotograma) y programa la repetición.
  mouseDown(button) {
    const now = performance.now();
    this.#updateTarget();
    if (button === 0 && this.#break()) this.nextBreak = now + this.settings.breakRepeatMs;
    if (button === 2 && this.#place()) this.nextPlace = now + this.settings.placeRepeatMs;
    if (button === 1) this.#pick();
  }

  update(buttons, now) {
    this.#updateTarget();
    if (buttons.has(0) && now >= this.nextBreak) {
      if (this.#break()) this.nextBreak = now + this.settings.breakRepeatMs;
    }
    if (buttons.has(2) && now >= this.nextPlace) {
      if (this.#place()) this.nextPlace = now + this.settings.placeRepeatMs;
    }
  }

  hideOutline() {
    this.outline.visible = false;
    this.target = null;
  }

  #updateTarget() {
    this.camera.getWorldDirection(this.direction);
    this.target = raycastBlock(this.world, this.camera.position, this.direction, this.settings.reach);
    this.outline.visible = !!this.target;
    if (this.target) this.outline.position.set(this.target.x + 0.5, this.target.y + 0.5, this.target.z + 0.5);
  }

  #break() {
    const t = this.target;
    if (!t) return false;
    if (!this.world.setBlock(t.x, t.y, t.z, 0)) return false;
    this.sounds.play(BLOCKS[t.id].sound, 'break');
    this.onAction?.();
    // Flores y antorchas encima se caen con el bloque.
    const above = this.world.getBlock(t.x, t.y + 1, t.z);
    if (above > 0 && BLOCKS[above].needsSupport) this.world.setBlock(t.x, t.y + 1, t.z, 0);
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
    this.sounds.play(BLOCKS[id].sound, 'place');
    this.onAction?.();
    this.water.notify(x, y, z);
    this.#updateTarget();
    return true;
  }

  #pick() {
    if (this.target) this.hotbar.pick(this.target.id);
  }
}
