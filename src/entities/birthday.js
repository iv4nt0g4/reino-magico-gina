// Sorpresa de cumpleaños: el día del cumpleaños de Gina (config/gina.js) hay
// una tarta gigante de tres pisos en la Plaza del Carrusel, con una vela por
// cada año, confeti que cae sin parar alrededor y, al acercarse, suena
// "Cumpleaños feliz". La tarta es decoración: solo está ese día y no cambia el mundo.

import * as THREE from 'three';
import { GINA } from '../config/gina.js';
import { CITY_LEVEL } from '../world/terrain.js';
import { PLAZA } from '../structures/plaza.js';

export const CAKE = { x: PLAZA.x - 9.5, z: PLAZA.z + 2.5 }; // en la plaza, al lado del carrusel
const F = CITY_LEVEL + 1;
const CONFETTI = 260;
const CONFETTI_COLORS = [0xff7cc4, 0xffd84d, 0x7cd4ff, 0x9dff9a, 0xb59bff, 0xffffff, 0xff9a6c];
const SONG_DISTANCE = 9;
const SONG_EVERY = 90; // segundos entre una vez y la siguiente

// Textura pixel art de un piso de la tarta: bizcocho con nata rosa que gotea.
function tierTexture(cream, sponge) {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = sponge;
  ctx.fillRect(0, 0, 32, 16);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(0, 10, 32, 1); // capa de relleno
  ctx.fillStyle = cream;
  ctx.fillRect(0, 0, 32, 4);
  for (let x = 0; x < 32; x++) {
    const drip = [0, 2, 1, 3, 0, 1, 4, 2][x % 8];
    ctx.fillRect(x, 4, 1, drip);
  }
  // Bolitas de colores.
  const dots = ['#ffd84d', '#7cd4ff', '#ffffff', '#9dff9a'];
  for (let x = 2; x < 32; x += 5) {
    ctx.fillStyle = dots[x % dots.length];
    ctx.fillRect(x, 13, 2, 2);
  }
  return pixelTexture(canvas);
}

function topTexture(cream) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = cream;
  ctx.fillRect(0, 0, 16, 16);
  const sprinkles = ['#ffd84d', '#7cd4ff', '#ff7cc4', '#9dff9a', '#ffffff'];
  for (let i = 0; i < 22; i++) {
    ctx.fillStyle = sprinkles[i % sprinkles.length];
    ctx.fillRect((i * 7) % 16, (i * 11 + 3) % 16, 1, 1);
  }
  return pixelTexture(canvas);
}

function pixelTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Birthday {
  constructor(scene, music, sounds, hud) {
    Object.assign(this, { scene, music, sounds, hud });
    this.songTimer = 0;
    this.time = 0;
    this.materials = [];
    this.group = new THREE.Group();
    this.group.position.set(CAKE.x, F, CAKE.z);
    this.#buildCake();
    this.#buildConfetti();
    scene.add(this.group);
  }

  #mat(params) {
    const m = new THREE.MeshBasicMaterial(params);
    this.materials.push(m);
    return m;
  }

  #buildCake() {
    // Plato y tres pisos (rosa, blanco y lila), cada uno más pequeño.
    const plate = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.2, 5.6), this.#mat({ color: 0xffffff }));
    plate.position.y = 0.1;
    this.group.add(plate);
    const tiers = [
      [4.6, 1.3, '#ff9ad5', '#f3c98b'],
      [3.4, 1.1, '#ffffff', '#c98a5a'],
      [2.2, 1.0, '#d8b8ff', '#f3c98b'],
    ];
    let y = 0.2;
    for (const [size, height, cream, sponge] of tiers) {
      const side = this.#mat({ map: tierTexture(cream, sponge) });
      const top = this.#mat({ map: topTexture(cream) });
      const tier = new THREE.Mesh(new THREE.BoxGeometry(size, height, size), [side, side, top, side, side, side]);
      tier.position.y = y + height / 2;
      this.group.add(tier);
      y += height;
    }
    // Velas (una por año) en corro sobre el último piso, con su llamita.
    this.flames = [];
    const candleMat = this.#mat({ color: 0x9fdcff });
    const stripe = this.#mat({ color: 0xffffff });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffc23a }); // la llama brilla siempre
    const glow = new THREE.MeshBasicMaterial({ color: 0xfff3a0, transparent: true, opacity: 0.55 });
    const n = Math.max(1, GINA.edad);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const cx = Math.cos(a) * 0.7, cz = Math.sin(a) * 0.7;
      const candle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.14), i % 2 ? candleMat : stripe);
      candle.position.set(cx, y + 0.3, cz);
      const flame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.12), flameMat);
      flame.position.set(cx, y + 0.72, cz);
      const halo = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), glow);
      halo.position.copy(flame.position);
      this.group.add(candle, flame, halo);
      this.flames.push(flame, halo);
    }
  }

  #buildConfetti() {
    const positions = new Float32Array(CONFETTI * 3);
    const colors = new Float32Array(CONFETTI * 3);
    this.speeds = new Float32Array(CONFETTI);
    const color = new THREE.Color();
    for (let i = 0; i < CONFETTI; i++) {
      this.#resetPiece(positions, i, Math.random() * 12);
      color.setHex(CONFETTI_COLORS[i % CONFETTI_COLORS.length]);
      colors.set([color.r, color.g, color.b], i * 3);
      this.speeds[i] = 0.8 + Math.random() * 0.8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.confetti = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.18, vertexColors: true }));
    this.group.add(this.confetti);
  }

  #resetPiece(positions, i, y) {
    const a = Math.random() * Math.PI * 2;
    const r = 1 + Math.random() * 9;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(a) * r;
  }

  update(dt, player, light, sparkles) {
    this.time += dt;
    this.songTimer -= dt;
    for (const m of this.materials) m.color.setScalar(Math.max(0.45, light));
    // Las llamitas tiemblan.
    this.flames.forEach((f, i) => (f.scale.y = 1 + Math.sin(this.time * 12 + i * 1.7) * 0.2));
    // Confeti: cae dando vueltas y vuelve a salir arriba.
    const pos = this.confetti.geometry.attributes.position;
    for (let i = 0; i < CONFETTI; i++) {
      let y = pos.array[i * 3 + 1] - this.speeds[i] * dt;
      pos.array[i * 3] += Math.sin(this.time * 2 + i) * dt * 0.4;
      if (y < 0) {
        this.#resetPiece(pos.array, i, 12);
        y = 12;
      }
      pos.array[i * 3 + 1] = y;
    }
    pos.needsUpdate = true;
    // Al acercarse: "Cumpleaños feliz", mensaje y estrellas sobre la tarta.
    const p = player.position;
    if (Math.hypot(p.x - CAKE.x, p.z - CAKE.z) < SONG_DISTANCE && this.songTimer <= 0) {
      this.songTimer = SONG_EVERY;
      this.music.birthdaySong();
      this.hud.toast(`🎂 ¡Feliz cumpleaños, ${GINA.nombre}! 🎉`);
      this.hud.confetti();
      sparkles.burst(CAKE.x, F + 5, CAKE.z, 24, ['estrella', 'corazon']);
    }
  }
}
