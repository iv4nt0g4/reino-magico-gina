// Chispitas de alegría: flores, estrellas y corazones que saltan y caen
// despacio, desapareciendo poco a poco.

import * as THREE from 'three';

const MAX = 160;
const LIFE = 1.6; // segundos
const GRAVITY = 4;

// Pequeñas imágenes pixel art (8 × 8) para cada tipo de chispa.
const SHAPES = {
  flor: ['..p..p..', '.ppppp..', 'pppyppp.', '.ppppp..', '..p..p..', '........', '........', '........'],
  estrella: ['...y....', '...y....', '.yyyyy..', '..yyy...', '..y.y...', '.y...y..', '........', '........'],
  corazon: ['.rr.rr..', 'rrrrrrr.', 'rrrrrrr.', '.rrrrr..', '..rrr...', '...r....', '........', '........'],
};
const COLORS = { p: '#ff9ccd', y: '#ffe066', r: '#ff6f9c' };

function shapeTexture(rows) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 8;
  const ctx = canvas.getContext('2d');
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (!COLORS[ch]) return;
      ctx.fillStyle = COLORS[ch];
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class Sparkles {
  constructor(scene) {
    this.scene = scene;
    this.textures = Object.fromEntries(Object.entries(SHAPES).map(([k, rows]) => [k, shapeTexture(rows)]));
    this.live = [];
  }

  // Lluvia de chispas desde (x, y, z).
  burst(x, y, z, count = 14) {
    const kinds = Object.keys(this.textures);
    for (let i = 0; i < count; i++) {
      if (this.live.length >= MAX) this.#remove(this.live[0]);
      const material = new THREE.SpriteMaterial({ map: this.textures[kinds[i % kinds.length]], transparent: true, depthWrite: false });
      const sprite = new THREE.Sprite(material);
      sprite.scale.setScalar(0.35);
      sprite.position.set(x, y, z);
      const a = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 1.5;
      sprite.userData = { vx: Math.cos(a) * speed, vy: 2.5 + Math.random() * 2, vz: Math.sin(a) * speed, age: 0 };
      this.scene.add(sprite);
      this.live.push(sprite);
    }
  }

  update(dt) {
    for (const s of [...this.live]) {
      const d = s.userData;
      d.age += dt;
      if (d.age >= LIFE) {
        this.#remove(s);
        continue;
      }
      d.vy -= GRAVITY * dt;
      s.position.x += d.vx * dt;
      s.position.y += d.vy * dt;
      s.position.z += d.vz * dt;
      s.material.opacity = 1 - (d.age / LIFE) ** 2;
      s.material.rotation += dt * 2;
    }
  }

  #remove(sprite) {
    this.scene.remove(sprite);
    sprite.material.dispose();
    this.live.splice(this.live.indexOf(sprite), 1);
  }
}
