// Piezas para montar los modelos de los animalitos con cajas: texturas de
// pelo y caritas dibujadas en canvas (pixel art 16 × 16), y una función para
// construir un modelo a partir de una lista de partes. Todos miran hacia -z.

import * as THREE from 'three';

const SIZE = 16;
const textureCache = new Map();
const geometryCache = new Map();

function rand(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const hex = (c) => `rgb(${c.map((v) => Math.max(0, Math.min(255, Math.round(v)))).join(',')})`;

// Canvas 16 × 16 → textura nítida (sin suavizar).
function canvasTexture(key, paint) {
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const c = paint(x, y);
      if (!c) continue;
      ctx.fillStyle = hex(c);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, t);
  return t;
}

// Pelo: el color con un poco de grano.
export function fur(rgb, grain = 0.12, seed = 1) {
  return canvasTexture(`fur:${rgb}:${grain}:${seed}`, (x, y) => {
    const k = 1 + (rand(x, y, seed) - 0.5) * grain;
    return rgb.map((v) => v * k);
  });
}

// Lana: rizos claros y oscuros.
export function wool(rgb) {
  return canvasTexture(`wool:${rgb}`, (x, y) => {
    const curl = (x + (y % 2) * 2) % 4 === 0 ? 0.92 : 1.04;
    return rgb.map((v) => v * curl * (1 + (rand(x, y, 7) - 0.5) * 0.08));
  });
}

// Carita: el pelo de fondo con ojos grandes y brillantes, mofletes y,
// opcionalmente, nariz y boquita. `eyeY`: fila de los ojos; `eyeGap`:
// distancia del centro a cada ojo.
export function face(rgb, { eyeY = 6, eyeGap = 4, eyeSize = 3, nose = null, mouth = true, blush = [250, 160, 186] } = {}) {
  const key = `face:${rgb}:${eyeY}:${eyeGap}:${eyeSize}:${nose}:${mouth}:${blush}`;
  return canvasTexture(key, (x, y) => {
    for (const side of [-1, 1]) {
      const ex = 7.5 + side * eyeGap;
      const dx = x - Math.floor(ex - eyeSize / 2 + 0.5);
      const dy = y - eyeY;
      if (dx >= 0 && dx < eyeSize && dy >= 0 && dy < eyeSize + 1) {
        if (dx === 0 && dy === 0) return [255, 255, 255]; // brillo
        return [52, 40, 74];
      }
    }
    if (blush && y === eyeY + eyeSize + 1 && (Math.abs(x - 7.5 - eyeGap - 1) < 1.5 || Math.abs(x - 7.5 + eyeGap + 1) < 1.5)) return blush;
    if (nose && y === eyeY + eyeSize + 1 && (x === 7 || x === 8)) return nose;
    if (mouth && y === eyeY + eyeSize + 2 && (x === 6 || x === 9)) return [110, 70, 80];
    if (mouth && y === eyeY + eyeSize + 3 && (x === 7 || x === 8)) return [110, 70, 80];
    const k = 1 + (rand(x, y, 3) - 0.5) * 0.1;
    return rgb.map((v) => v * k);
  });
}

function boxGeometry(w, h, d) {
  const key = `${w}:${h}:${d}`;
  if (!geometryCache.has(key)) geometryCache.set(key, new THREE.BoxGeometry(w, h, d));
  return geometryCache.get(key);
}

// Construye un modelo. Cada parte: { name, size: [w, h, d], at: [x, y, z],
// tex (textura o lista de 6 por cara), parent, pivot (punto de giro, para
// patas y cola) }. Devuelve { root, parts, materials }.
export function buildModel(parts, materialCache) {
  const root = new THREE.Group();
  const byName = { root };
  const materials = new Set();
  const materialFor = (tex) => {
    if (!materialCache.has(tex)) materialCache.set(tex, new THREE.MeshBasicMaterial({ map: tex }));
    const m = materialCache.get(tex);
    materials.add(m);
    return m;
  };
  for (const part of parts) {
    const mat = Array.isArray(part.tex) ? part.tex.map(materialFor) : materialFor(part.tex);
    const mesh = new THREE.Mesh(boxGeometry(...part.size), mat);
    const parent = byName[part.parent ?? 'root'];
    if (part.pivot) {
      // Grupo en el punto de giro y la caja colgando de él.
      const group = new THREE.Group();
      group.position.set(...part.pivot);
      mesh.position.set(part.at[0] - part.pivot[0], part.at[1] - part.pivot[1], part.at[2] - part.pivot[2]);
      group.add(mesh);
      parent.add(group);
      byName[part.name] = group;
    } else {
      mesh.position.set(...part.at);
      if (part.rotation) mesh.rotation.set(...part.rotation);
      parent.add(mesh);
      byName[part.name] = mesh;
    }
  }
  return { root, parts: byName, materials: [...materials] };
}

// Lista de 6 texturas para una caja con la cara delante (-z) y pelo en el resto.
export const withFace = (body, front) => [body, body, body, body, body, front];
