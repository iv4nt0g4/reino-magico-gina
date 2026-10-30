// Carteles de madera por la ciudad, con los nombres de la familia y postes
// con flechas que señalan los sitios del reino. Son decoración (no bloques):
// se ven y se leen, pero no se rompen ni estorban al pasar. Como no forman
// parte del mundo guardado, salen también en las partidas ya empezadas.

import * as THREE from 'three';
import { GINA, joinNames } from '../config/gina.js';
import { blockTexture } from '../blocks/blockMesh.js';
import { CITY_LEVEL } from '../world/terrain.js';
import { PLAZA } from '../structures/plaza.js';
import { FAIR } from '../structures/fair.js';
import { FOREST } from '../structures/forest.js';
import { ICE } from '../structures/icePalace.js';
import { BAY } from '../structures/pirateBay.js';
import { GARDEN } from '../structures/fairyGarden.js';
import { TOWN } from '../world/terrain.js';

const F = CITY_LEVEL + 1; // suelo de la ciudad
const LINE = 0.3; // alto de cada línea de texto (en bloques)
const PX = 200; // píxeles de la textura por bloque
const VISIBLE = 110; // más lejos no se dibujan

const center = (r) => ({ x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 });
const PLACES = {
  castillo: { x: 0, z: -30, text: '🏰 Castillo' },
  plaza: { x: PLAZA.x, z: PLAZA.z, text: '🎠 Plaza del Carrusel' },
  casa: { x: -32, z: 64, text: `🏡 Casa de ${GINA.nombre}` },
  estacion: { x: 30, z: 76, text: '🚂 Estación' },
  feria: { ...center(FAIR), text: '🎡 Feria' },
  bosque: { ...center(FOREST), text: '🍄 Bosque Encantado' },
  hielo: { ...center(ICE), text: '❄️ Palacio de Hielo' },
  bahia: { ...center(BAY), text: '🏴 Bahía del Pirata' },
  jardin: { ...center(GARDEN), text: '🧚 Jardín de las Hadas' },
  aldea: { x: TOWN.x, z: TOWN.z, text: '⭐ Aldea de las Siete Estrellas' },
};

// Lista de carteles. Carteles con texto: { x, z, facing (ángulo hacia donde
// mira el frente: 0 = sur, π/2 = este), lines }. Postes con flechas: { x, z, to: [sitios] }.
function signList() {
  const family = GINA.familia.map((f) => f.comoLaLlama);
  const shops = GINA.tiendasDeLaFamilia;
  return [
    { x: 4.5, z: 7.5, facing: 0, lines: [`👑 Castillo de ${GINA.nombre}`, `¡Bienvenida a tu reino, ${GINA.nombre}!`] },
    { x: -21.5, z: 60.5, facing: Math.PI / 2, lines: ['🏡 Aquí viven', joinNames([GINA.nombre, ...family, `${GINA.mascota.nombre} 🐰`])] },
    shops.pasteleria && { x: -4.5, z: 31.5, facing: Math.PI / 2, lines: [`🧁 Pastelería de ${shops.pasteleria}`] },
    shops.jugueteria && { x: -4.5, z: 42.5, facing: Math.PI / 2, lines: [`🧸 Juguetería de ${shops.jugueteria}`] },
    // Poste en el cruce de la Avenida del Castillo con la Calle Principal.
    { x: 6.5, z: 15.5, to: ['castillo', 'plaza', 'feria', 'bosque', 'bahia', 'hielo'] },
    // Poste a la entrada de la plaza.
    { x: 6.5, z: 49.5, to: ['casa', 'estacion', 'jardin', 'aldea'] },
  ].filter(Boolean);
}

// Textura de madera con texto (una o varias líneas).
function textBoard(lines) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `bold ${Math.round(LINE * PX * 0.62)}px "Trebuchet MS", sans-serif`;
  ctx.font = font;
  const width = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width))) + PX * 0.3;
  canvas.width = width;
  canvas.height = Math.round((lines.length * LINE + 0.12) * PX);
  // Madera clara con vetas.
  ctx.fillStyle = '#d9a86c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(140, 90, 40, 0.18)';
  for (let y = 6; y < canvas.height; y += 14) ctx.fillRect(0, y, canvas.width, 3);
  ctx.strokeStyle = '#8a5a2c';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  ctx.font = font;
  ctx.fillStyle = '#4a2a14';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => ctx.fillText(line, canvas.width / 2, (0.06 + (i + 0.55) * LINE) * PX));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, w: canvas.width / PX, h: canvas.height / PX };
}

export class Signs {
  constructor(scene) {
    this.scene = scene;
    this.materials = [];
    this.wood = this.#material(blockTexture('planks'));
    this.post = this.#material(blockTexture('oak_log'));
    this.groups = signList().map((s) => {
      const group = s.to ? this.#signpost(s) : this.#sign(s);
      group.position.set(s.x, F, s.z);
      scene.add(group);
      return group;
    });
  }

  #material(map) {
    const m = new THREE.MeshBasicMaterial({ map });
    this.materials.push(m);
    return m;
  }

  // Cartel con texto sobre dos postes.
  #sign({ lines, facing }) {
    const group = new THREE.Group();
    const { texture, w, h } = textBoard(lines);
    const text = this.#material(texture);
    const bottom = 1.1;
    const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), [this.wood, this.wood, this.wood, this.wood, text, text]);
    board.position.y = bottom + h / 2;
    group.add(board);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, bottom + h + 0.1, 0.12), this.post);
      post.position.set(side * (w / 2 - 0.12), (bottom + h + 0.1) / 2, -0.1);
      group.add(post);
    }
    group.rotation.y = facing;
    return group;
  }

  // Poste con tablas en forma de flecha que apuntan a cada sitio.
  #signpost({ x, z, to }) {
    const group = new THREE.Group();
    const height = 1.4 + to.length * 0.38;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, height, 0.16), this.post);
    post.position.y = height / 2;
    group.add(post);
    to.forEach((key, i) => {
      const place = PLACES[key];
      const { texture, w, h } = textBoard([place.text]);
      const text = this.#material(texture);
      const dx = place.x - x, dz = place.z - z;
      const len = Math.hypot(dx, dz);
      const arm = new THREE.Group();
      arm.rotation.y = Math.atan2(-dz / len, dx / len); // el eje x de la tabla apunta al sitio
      arm.position.y = height - 0.25 - i * 0.38;
      const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.07), [this.wood, this.wood, this.wood, this.wood, text, text]);
      board.position.x = 0.1 + w / 2;
      // Punta de flecha: un rombo de madera medio metido en el extremo de la tabla.
      const tip = new THREE.Mesh(new THREE.BoxGeometry(h * 0.71, h * 0.71, 0.06), this.wood);
      tip.position.x = 0.1 + w;
      tip.rotation.z = Math.PI / 4;
      arm.add(board, tip);
      group.add(arm);
    });
    return group;
  }

  update(player, light) {
    const l = Math.max(0.35, light);
    for (const m of this.materials) m.color.setScalar(l);
    const p = player.position;
    for (const g of this.groups) g.visible = Math.hypot(g.position.x - p.x, g.position.z - p.z) < VISIBLE;
  }
}
