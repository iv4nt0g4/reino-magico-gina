// Recetas de la Aventura suave (cuadrícula de 3 × 3). Todas aparecen en el
// libro de recetas con dibujos, así que Gina no tiene que memorizarlas.
//
// Dos tipos:
//  - Con forma: `pattern` (filas de letras; espacio = hueco vacío) y `key`
//    (letra → bloque, o lista de bloques que valen igual). Puede ponerse en
//    cualquier sitio de la cuadrícula y también al revés (en espejo).
//  - Sin forma: `items`, los ingredientes en cualquier orden y posición.
// `result`: [bloque, cantidad]. `book`: pestaña del libro.

import { BLOCK, WOOL_COLORS, PASTEL_COLORS, TILE_COLORS } from './registry.js';

const LOGS = ['oak_log', 'birch_log', 'cherry_log'];
const WOOLS = WOOL_COLORS.map((c) => `wool_${c.key}`);

// Flores con las que se tiñe (la mezcla da colores nuevos, como con pinturas).
const DYES = {
  red: ['flower_red'],
  yellow: ['flower_yellow'],
  blue: ['flower_blue'],
  pink: ['flower_pink'],
  orange: ['flower_red', 'flower_yellow'],
  purple: ['flower_red', 'flower_blue'],
  magenta: ['flower_pink', 'flower_blue'],
  light_blue: ['flower_blue', 'flower_white'],
  green: ['flower_yellow', 'flower_blue'],
  lime: ['flower_yellow', 'flower_blue', 'flower_white'],
  cyan: ['flower_blue', 'flower_blue', 'flower_yellow'],
  brown: ['dirt'],
  gray: ['gravel'],
  light_gray: ['gravel', 'flower_white'],
  black: ['gravel', 'gravel'],
};
const PASTEL_DYES = {
  pink: ['flower_pink'],
  lilac: ['flower_pink', 'flower_blue'],
  sky: ['flower_blue'],
  mint: ['flower_yellow', 'flower_blue'],
  peach: ['flower_pink', 'flower_yellow'],
};
const TILE_DYES = {
  red: ['flower_red'],
  lilac: ['flower_pink', 'flower_blue'],
  sky: ['flower_blue'],
  pink: ['flower_pink'],
  green: ['flower_yellow', 'flower_blue'],
};

export const BOOK_TABS = [
  { key: 'basic', icon: '🪵', label: 'Básicos' },
  { key: 'colors', icon: '🎨', label: 'Colores' },
  { key: 'magic', icon: '✨', label: 'Magia' },
];

const DEFINITIONS = [
  // --- Básicos ---
  { book: 'basic', items: [LOGS], result: ['planks', 4] },
  { book: 'basic', pattern: ['Y', 'P'], key: { Y: 'flower_yellow', P: 'planks' }, result: ['torch', 4] },
  { book: 'basic', pattern: ['SS', 'SS'], key: { S: 'sand' }, result: ['glass', 4] },
  { book: 'basic', pattern: ['GTG'], key: { G: 'glass', T: 'torch' }, result: ['lantern', 1] },
  { book: 'basic', pattern: ['SS', 'SS'], key: { S: 'stone' }, result: ['cobblestone', 4] },
  { book: 'basic', pattern: ['DS', 'SD'], key: { D: 'dirt', S: 'sand' }, result: ['bricks', 4] },
  { book: 'basic', items: ['stone', 'flower_white'], result: ['white_stone', 2] },
  { book: 'basic', pattern: ['WW', 'WW'], key: { W: 'white_stone' }, result: ['quartz', 4] },
  { book: 'basic', pattern: ['NN', 'NN'], key: { N: 'snow' }, result: ['ice', 2] },
  { book: 'basic', pattern: ['PPP', 'WWW', 'PPP'], key: { P: 'planks', W: WOOLS }, result: ['bookshelf', 1] },
  { book: 'basic', items: ['oak_leaves', 'flower_pink'], result: ['cherry_leaves', 1] },
  { book: 'basic', items: ['oak_leaves', 'flower_blue'], result: ['purple_leaves', 1] },

  // --- Colores: lana blanca (de las ovejas) + flores ---
  ...Object.entries(DYES).map(([color, dyes]) => ({ book: 'colors', items: ['wool_white', ...dyes], result: [`wool_${color}`, 1] })),
  ...Object.entries(PASTEL_DYES).map(([color, dyes]) => ({ book: 'colors', items: ['white_stone', ...dyes], result: [`pastel_${color}`, 2] })),
  ...Object.entries(TILE_DYES).map(([color, dyes]) => ({ book: 'colors', items: ['bricks', ...dyes], result: [`tiles_${color}`, 2] })),

  // --- Magia ---
  { book: 'magic', pattern: ['YY', 'YY'], key: { Y: 'flower_yellow' }, result: ['gold', 1] },
  { book: 'magic', pattern: [' T ', 'TOT', ' T '], key: { T: 'torch', O: 'gold' }, result: ['star', 2] },
  { book: 'magic', pattern: [' S ', 'SXS', ' S '], key: { S: 'stone', X: 'star' }, result: ['shiny_stone', 4] },
  { book: 'magic', pattern: ['RYB', 'WWW'], key: { R: 'flower_red', Y: 'flower_yellow', B: 'flower_blue', W: 'wool_white' }, result: ['rainbow', 3] },
  { book: 'magic', pattern: ['WW', 'WW'], key: { W: 'wool_white' }, result: ['cloud', 2] },
  { book: 'magic', items: ['ice', 'flower_pink'], result: ['candy', 2] },
  { book: 'magic', items: ['sand', 'dirt'], result: ['cookie', 2] },
  { book: 'magic', items: ['glass', 'flower_blue'], result: ['crystal_sky', 2] },
  { book: 'magic', items: ['star', 'wool_orange'], result: ['star_orb', 2] },
  { book: 'magic', items: ['gold', 'torch'], result: ['golden_hair', 2] },
  { book: 'magic', items: ['oak_leaves', 'stone'], result: ['dragon_scales', 2] },
  ...[['wool_lime', 'feliz'], ['wool_green', 'guino'], ['wool_light_blue', 'dormido'], ['flower_pink', 'flor']].map(([center, e]) => ({
    book: 'magic',
    pattern: ['PPP', 'PCP', 'PPP'],
    key: { P: 'planks', C: center },
    result: [`cuadro_brotis_${e}`, 1],
  })),
];

// Nombre (o lista de nombres) → conjunto de ids.
const ids = (names) => new Set((Array.isArray(names) ? names : [names]).map((n) => {
  if (BLOCK[n] === undefined) throw new Error(`Receta con un bloque que no existe: ${n}`);
  return BLOCK[n];
}));

export const RECIPES = DEFINITIONS.map((def, index) => {
  const recipe = { index, book: def.book, result: { id: BLOCK[def.result[0]], count: def.result[1] } };
  if (recipe.result.id === undefined) throw new Error(`Receta de un bloque que no existe: ${def.result[0]}`);
  if (def.pattern) {
    const width = Math.max(...def.pattern.map((row) => row.length));
    recipe.width = width;
    recipe.height = def.pattern.length;
    // Celdas de la forma: null (vacía) o conjunto de ids válidos.
    recipe.cells = def.pattern.flatMap((row) => [...row.padEnd(width)].map((ch) => (ch === ' ' ? null : ids(def.key[ch]))));
  } else {
    recipe.items = def.items.map(ids);
  }
  return recipe;
});

// ---------- Comprobar la cuadrícula ----------

// Recorta la cuadrícula (9 ids, 0 = vacío) a la caja que ocupan los ingredientes.
function trim(grid) {
  let x0 = 3, y0 = 3, x1 = -1, y1 = -1;
  for (let i = 0; i < 9; i++) {
    if (!grid[i]) continue;
    const x = i % 3, y = Math.floor(i / 3);
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  if (x1 < 0) return null;
  const width = x1 - x0 + 1, height = y1 - y0 + 1;
  const cells = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cells.push(grid[y * 3 + x]);
  return { width, height, cells };
}

function matchesShape(recipe, box, mirror) {
  if (box.width !== recipe.width || box.height !== recipe.height) return false;
  for (let y = 0; y < box.height; y++) {
    for (let x = 0; x < box.width; x++) {
      const want = recipe.cells[y * recipe.width + (mirror ? recipe.width - 1 - x : x)];
      const have = box.cells[y * box.width + x];
      if (want === null ? have !== 0 : !want.has(have)) return false;
    }
  }
  return true;
}

function matchesItems(recipe, grid) {
  const have = grid.filter((id) => id);
  if (have.length !== recipe.items.length) return false;
  const used = new Array(have.length).fill(false);
  // Pocos ingredientes: basta con ir emparejando uno a uno.
  return recipe.items.every((want) => {
    const i = have.findIndex((id, k) => !used[k] && want.has(id));
    if (i < 0) return false;
    used[i] = true;
    return true;
  });
}

// Receta que encaja con la cuadrícula, o null.
export function findRecipe(grid) {
  const box = trim(grid);
  if (!box) return null;
  return (
    RECIPES.find((r) => (r.cells ? matchesShape(r, box, false) || matchesShape(r, box, true) : matchesItems(r, grid))) ?? null
  );
}

// ---------- Para el libro de recetas ----------

// Cómo dibujar la receta en una cuadrícula de 3 × 3: un id por celda (el
// primero de cada lista de alternativas) o 0.
export function recipePicture(recipe) {
  const grid = new Array(9).fill(0);
  if (recipe.cells) {
    recipe.cells.forEach((set, i) => {
      if (set) grid[Math.floor(i / recipe.width) * 3 + (i % recipe.width)] = [...set][0];
    });
  } else {
    recipe.items.forEach((set, i) => (grid[i] = [...set][0]));
  }
  return grid;
}

// Ingredientes necesarios: lista de { ids (conjunto), count }.
export function recipeNeeds(recipe) {
  const sets = recipe.cells ? recipe.cells.filter(Boolean) : recipe.items;
  const needs = [];
  for (const set of sets) {
    const same = needs.find((n) => n.ids === set || (n.ids.size === set.size && [...set].every((id) => n.ids.has(id))));
    if (same) same.count++;
    else needs.push({ ids: set, count: 1 });
  }
  return needs;
}
