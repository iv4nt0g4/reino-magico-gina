// Raycast de bloques: recorre las celdas que atraviesa un rayo (algoritmo
// DDA de Amanatides y Woo) hasta encontrar un bloque que no sea aire ni agua.

import { IS_LIQUID } from '../blocks/registry.js';

// Devuelve { x, y, z, id, normal: [nx, ny, nz] } o null si no hay nada al alcance.
// `normal` indica la cara por la que entró el rayo (donde se coloca un bloque nuevo).
export function raycastBlock(world, origin, direction, maxDistance) {
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);
  const stepX = Math.sign(direction.x);
  const stepY = Math.sign(direction.y);
  const stepZ = Math.sign(direction.z);
  // Distancia del rayo para cruzar una celda entera en cada eje.
  const deltaX = Math.abs(1 / direction.x);
  const deltaY = Math.abs(1 / direction.y);
  const deltaZ = Math.abs(1 / direction.z);
  // Distancia hasta el primer borde de celda en cada eje.
  const frac = (v, s) => (s > 0 ? Math.floor(v) + 1 - v : v - Math.floor(v));
  let tMaxX = stepX ? frac(origin.x, stepX) * deltaX : Infinity;
  let tMaxY = stepY ? frac(origin.y, stepY) * deltaY : Infinity;
  let tMaxZ = stepZ ? frac(origin.z, stepZ) * deltaZ : Infinity;
  const normal = [0, 0, 0];

  let t = 0;
  while (t <= maxDistance) {
    const id = world.getBlock(x, y, z);
    if (id < 0) return null; // chunk sin cargar
    if (id > 0 && !IS_LIQUID[id]) return { x, y, z, id, normal: [...normal] };

    // Avanzar al borde de celda más cercano.
    normal[0] = normal[1] = normal[2] = 0;
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX;
      t = tMaxX;
      tMaxX += deltaX;
      normal[0] = -stepX;
    } else if (tMaxY < tMaxZ) {
      y += stepY;
      t = tMaxY;
      tMaxY += deltaY;
      normal[1] = -stepY;
    } else {
      z += stepZ;
      t = tMaxZ;
      tMaxZ += deltaZ;
      normal[2] = -stepZ;
    }
  }
  return null;
}
