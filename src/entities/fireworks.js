// Fuegos artificiales sobre el castillo cada noche: cohetes que suben con
// una estela y estallan en una lluvia de chispas de colores que caen
// despacio y se apagan. Con sonidos suaves (nada de estruendos).

import * as THREE from 'three';

const CASTLE = new THREE.Vector3(0, 70, -40); // por encima del castillo
const MAX_DISTANCE = 300; // más lejos, no se lanzan
const SPARKS = 130; // chispas por estallido
const SPARK_LIFE = 2.2; // segundos
const PALETTES = [
  [0xff6fb5, 0xffc2e0], // rosa
  [0x7fd8ff, 0xffffff], // celeste
  [0xffe066, 0xffa53d], // dorado
  [0xa98bff, 0xff9ce8], // lila
  [0x8bff9e, 0xfff27a], // verde y amarillo
  [0xff7a7a, 0xffe066], // rojo y oro
];

// Puntito redondo y suave para las chispas.
function dotTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 16);
  return new THREE.CanvasTexture(canvas);
}

export class Fireworks {
  constructor(scene, sounds) {
    this.scene = scene;
    this.sounds = sounds;
    this.texture = dotTexture();
    this.rockets = [];
    this.bursts = [];
    this.timer = 1;
  }

  #material(size) {
    return new THREE.PointsMaterial({
      size,
      map: this.texture,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  // `night`: 0 de día, 1 de noche cerrada. `listener`: posición de Gina.
  update(dt, night, listener) {
    const near = listener.distanceTo(CASTLE) < MAX_DISTANCE;
    this.timer -= dt;
    if (night > 0.6 && near && this.timer <= 0) {
      this.timer = 0.9 + Math.random() * 2;
      this.#launch(listener);
      if (Math.random() < 0.25) this.#launch(listener); // a veces, dos a la vez
    }
    this.#updateRockets(dt, listener);
    this.#updateBursts(dt);
  }

  #launch(listener) {
    const start = new THREE.Vector3(CASTLE.x + (Math.random() - 0.5) * 30, CASTLE.y - 25, CASTLE.z + (Math.random() - 0.5) * 20);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute([1, 0.9, 0.7], 3));
    const points = new THREE.Points(geometry, this.#material(1.2));
    points.position.copy(start);
    points.frustumCulled = false;
    this.scene.add(points);
    const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    this.rockets.push({ points, velocity: new THREE.Vector3((Math.random() - 0.5) * 4, 26 + Math.random() * 8, (Math.random() - 0.5) * 4), fuse: 1.2 + Math.random() * 0.6, palette });
    this.sounds.whistle(this.#volume(start, listener));
  }

  #updateRockets(dt, listener) {
    for (const r of [...this.rockets]) {
      r.fuse -= dt;
      r.velocity.y -= 6 * dt;
      r.points.position.addScaledVector(r.velocity, dt);
      if (r.fuse > 0) continue;
      this.scene.remove(r.points);
      r.points.geometry.dispose();
      r.points.material.dispose();
      this.rockets.splice(this.rockets.indexOf(r), 1);
      this.#explode(r.points.position, r.palette);
      this.sounds.pop(this.#volume(r.points.position, listener));
    }
  }

  // Estallido: chispas en todas direcciones (en una esfera), con dos colores.
  #explode(center, palette) {
    const positions = new Float32Array(SPARKS * 3);
    const colors = new Float32Array(SPARKS * 3);
    const velocities = [];
    const color = new THREE.Color();
    for (let i = 0; i < SPARKS; i++) {
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const speed = 13 + Math.random() * 4;
      velocities.push(new THREE.Vector3(Math.cos(a) * s * speed, u * speed, Math.sin(a) * s * speed));
      color.setHex(palette[i % 2]);
      colors.set([color.r, color.g, color.b], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(geometry, this.#material(3));
    points.position.copy(center);
    points.frustumCulled = false;
    this.scene.add(points);
    this.bursts.push({ points, velocities, age: 0 });
  }

  #updateBursts(dt) {
    for (const burst of [...this.bursts]) {
      burst.age += dt;
      if (burst.age >= SPARK_LIFE) {
        this.scene.remove(burst.points);
        burst.points.geometry.dispose();
        burst.points.material.dispose();
        this.bursts.splice(this.bursts.indexOf(burst), 1);
        continue;
      }
      const attr = burst.points.geometry.getAttribute('position');
      const drag = Math.exp(-0.9 * dt); // se frenan poco a poco: la palmera se abre bien
      burst.velocities.forEach((v, i) => {
        v.multiplyScalar(drag);
        v.y -= 3 * dt; // caen despacio
        attr.array[i * 3] += v.x * dt;
        attr.array[i * 3 + 1] += v.y * dt;
        attr.array[i * 3 + 2] += v.z * dt;
      });
      attr.needsUpdate = true;
      burst.points.material.opacity = 1 - (burst.age / SPARK_LIFE) ** 2;
    }
  }

  // Volumen según la distancia (cerca, normal; lejos, flojito).
  #volume(position, listener) {
    return Math.max(0, 1 - listener.distanceTo(position) / MAX_DISTANCE);
  }
}
