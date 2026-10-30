// Bloques en pequeño como objetos 3D (el de la mano de Gina y los que quedan
// en el suelo al romper en la Aventura suave): un cubo con las texturas del
// bloque, o un plano para flores y antorchas.

import * as THREE from 'three';
import { BLOCKS } from './registry.js';
import { paintTexture, TEXTURE_SIZE } from './textures.js';

const textures = new Map(); // nombre de textura → THREE.Texture
const geometries = new Map();

export function blockTexture(name) {
  if (textures.has(name)) return textures.get(name);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TEXTURE_SIZE;
  canvas.getContext('2d').putImageData(new ImageData(paintTexture(name), TEXTURE_SIZE, TEXTURE_SIZE), 0, 0);
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  textures.set(name, t);
  return t;
}

function geometry(key, make) {
  if (!geometries.has(key)) geometries.set(key, make());
  return geometries.get(key);
}

// Malla de un bloque de lado `size`. `materials` (Map id → material o lista)
// guarda los materiales para compartirlos y poder oscurecerlos de noche.
export function blockMesh(id, size, materials) {
  const block = BLOCKS[id];
  const cross = block.shape === 'cross';
  if (!materials.has(id)) {
    materials.set(
      id,
      cross
        ? new THREE.MeshBasicMaterial({ map: blockTexture(block.textures[0]), alphaTest: 0.5, side: THREE.DoubleSide })
        : // Mismo orden de caras en BoxGeometry y en el registro: +x, -x, +y, -y, +z, -z.
          block.textures.map(
            (name) =>
              new THREE.MeshBasicMaterial({
                map: blockTexture(name),
                transparent: block.liquidLevel >= 0,
                opacity: block.liquidLevel >= 0 ? 0.75 : 1,
                alphaTest: block.cutout ? 0.5 : 0,
              }),
          ),
    );
  }
  const geo = cross
    ? geometry(`plane:${size}`, () => new THREE.PlaneGeometry(size * 1.5, size * 1.5))
    : geometry(`box:${size}`, () => new THREE.BoxGeometry(size, size, size));
  return new THREE.Mesh(geo, materials.get(id));
}

// Todos los materiales de un Map de blockMesh, para cambiarles el brillo.
export function* allMaterials(materials) {
  for (const m of materials.values()) {
    if (Array.isArray(m)) yield* m;
    else yield m;
  }
}
