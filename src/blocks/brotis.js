// Brotis: el amiguito verde del reino (diseño original). Aquí se dibuja su
// cara en pixel art 16 × 16, en varias expresiones. La usan tanto los cuadros
// (bloques) como el propio bichito que pasea por el mundo.

// Hash entero → [0, 1) para el moteado de la piel.
function rand(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Piel: verde claro moteado con toques lima y menta.
export function skin(x, y, seed = 80) {
  const r = rand(x, y, seed);
  if (r < 0.18) return [150, 222, 120]; // lima claro
  if (r < 0.3) return [112, 196, 134]; // menta
  if (r < 0.36) return [98, 176, 92]; // un poco más oscuro
  return [128, 208, 108];
}

const EYE = [52, 40, 74]; // morado muy oscuro (más tierno que el negro)
const SHINE = [255, 255, 255];
const BLUSH = [250, 160, 186];
const MOUTH = [120, 60, 80];

// Ojos grandes (4 × 5) con brillo, en x 3–6 y 9–12.
function bigEye(x, y, left) {
  const x0 = left ? 3 : 9;
  const dx = x - x0, dy = y - 4;
  if (dx < 0 || dx > 3 || dy < 0 || dy > 4) return null;
  if ((dx === 0 || dx === 3) && (dy === 0 || dy === 4)) return null; // esquinas redondeadas
  if ((dx === 1 || dx === 2) && dy === 1) return SHINE; // brillo
  if (dx === 2 && dy === 3) return [96, 80, 128]; // reflejo suave
  return EYE;
}

// Ojo cerrado contento (^) o dormido (‿), en la misma posición.
function arcEye(x, y, left, happy) {
  const x0 = left ? 3 : 9;
  const dx = x - x0;
  if (dx < 0 || dx > 3) return null;
  const top = happy ? (dx === 0 || dx === 3 ? 7 : 6) : dx === 0 || dx === 3 ? 6 : 7;
  return y === top ? EYE : null;
}

// Mofletes y boquita sonriente.
function cheeksAndSmile(x, y, open = false) {
  if (y >= 10 && y <= 11 && (x <= 2 || x >= 13) && x >= 1 && x <= 14) return BLUSH;
  if (y === 11 && (x === 6 || x === 9)) return MOUTH;
  if (y === 12 && x >= 7 && x <= 8) return MOUTH;
  if (open && y === 12 && (x === 6 || x === 9)) return MOUTH;
  if (open && y === 13 && x >= 7 && x <= 8) return [230, 110, 130]; // lengüita
  return null;
}

// Expresiones: 'feliz', 'alegre' (ojos ^ ^), 'guino', 'dormido', 'flor'.
export function face(expression) {
  return (x, y) => {
    let c = null;
    if (expression === 'alegre') c = arcEye(x, y, true, true) ?? arcEye(x, y, false, true) ?? cheeksAndSmile(x, y, true);
    else if (expression === 'dormido') c = arcEye(x, y, true, false) ?? arcEye(x, y, false, false) ?? cheeksAndSmile(x, y);
    else if (expression === 'guino') c = bigEye(x, y, true) ?? arcEye(x, y, false, true) ?? cheeksAndSmile(x, y, true);
    else c = bigEye(x, y, true) ?? bigEye(x, y, false) ?? cheeksAndSmile(x, y);
    if (!c && expression === 'flor') {
      // Florecita rosa sobre la oreja derecha.
      const fx = x - 13, fy = y - 1;
      if (Math.abs(fx) + Math.abs(fy) === 1 && x <= 15) c = [255, 150, 200];
      if (fx === 0 && fy === 0) c = [255, 230, 90];
    }
    if (!c && expression === 'dormido' && ((x === 13 && y === 1) || (x === 14 && y === 2) || (x === 13 && y === 3) || (x === 14 && y === 3))) c = [255, 255, 255]; // "z"
    return c ?? skin(x, y);
  };
}

// Cuadro: la cara a tamaño real dentro de un marco de madera de un píxel.
export function painting(expression) {
  const inner = face(expression);
  return (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 ? [150, 104, 60] : inner(x, y));
}

export const PAINTING_EXPRESSIONS = ['feliz', 'guino', 'dormido', 'flor'];
