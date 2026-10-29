// Iconos isométricos de los bloques (para la barra rápida y el catálogo),
// dibujados en un canvas a partir de las mismas texturas que usa el mundo.

import { BLOCKS } from './registry.js';
import { TEXTURE_SIZE, paintTexture } from './textures.js';

const ICON_SIZE = 64;
const cache = new Map(); // id de bloque → URL de imagen

// Canvas 16×16 con una textura.
function textureCanvas(name) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(new ImageData(paintTexture(name), TEXTURE_SIZE, TEXTURE_SIZE), 0, 0);
  return canvas;
}

// Dibuja una cara: transforma el cuadrado de la textura en un rombo y la oscurece.
function drawFace(ctx, texture, transform, darkness) {
  const k = 1 / TEXTURE_SIZE;
  ctx.setTransform(transform[0] * k, transform[1] * k, transform[2] * k, transform[3] * k, transform[4], transform[5]);
  ctx.drawImage(texture, 0, 0);
  if (darkness > 0) {
    // Oscurecer solo los píxeles dibujados (respeta los huecos de hojas y cristal).
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
    ctx.globalCompositeOperation = 'source-over';
  }
}

export function getBlockIcon(id) {
  if (cache.has(id)) return cache.get(id);
  const block = BLOCKS[id];
  const S = ICON_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Plantas y antorcha: el dibujo plano, como en el original.
  if (block.shape === 'cross') {
    ctx.drawImage(textureCanvas(block.textures[0]), 0, 0, S, S);
    const url = canvas.toDataURL();
    cache.set(id, url);
    return url;
  }

  // Cada cara en su propio canvas para que el oscurecido no afecte a las demás.
  const faces = [
    // [cara, transformación (ejes x, y y origen), oscuridad]
    [2, [S / 2, S / 4, -S / 2, S / 4, S / 2, 0], 0], // arriba
    [4, [S / 2, S / 4, 0, S / 2, 0, S / 4], 0.25], // izquierda (sur)
    [0, [S / 2, -S / 4, 0, S / 2, S / 2, S / 2], 0.42], // derecha (este)
  ];
  for (const [face, transform, darkness] of faces) {
    const layer = document.createElement('canvas');
    layer.width = layer.height = S;
    const lctx = layer.getContext('2d');
    lctx.imageSmoothingEnabled = false;
    drawFace(lctx, textureCanvas(block.textures[face]), transform, darkness);
    ctx.drawImage(layer, 0, 0);
  }

  const url = canvas.toDataURL();
  cache.set(id, url);
  return url;
}
