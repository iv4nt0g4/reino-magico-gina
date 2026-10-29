// Registro de bloques. Es datos puros (sin DOM) para poder usarlo también
// dentro de los Web Workers de mallado.
//
// Orden de caras usado en todo el motor:
//   0: +X (este)  1: -X (oeste)  2: +Y (arriba)  3: -Y (abajo)  4: +Z (sur)  5: -Z (norte)

// Colores compartidos por las familias de bloques de colores (lana, tejas, piedra pastel).
export const WOOL_COLORS = [
  { key: 'white', label: 'blanca', rgb: [238, 238, 238] },
  { key: 'light_gray', label: 'gris clara', rgb: [168, 168, 172] },
  { key: 'gray', label: 'gris', rgb: [96, 98, 104] },
  { key: 'black', label: 'negra', rgb: [40, 40, 46] },
  { key: 'brown', label: 'marrón', rgb: [124, 82, 52] },
  { key: 'red', label: 'roja', rgb: [204, 62, 62] },
  { key: 'orange', label: 'naranja', rgb: [240, 140, 50] },
  { key: 'yellow', label: 'amarilla', rgb: [250, 214, 60] },
  { key: 'lime', label: 'lima', rgb: [140, 210, 60] },
  { key: 'green', label: 'verde', rgb: [76, 140, 60] },
  { key: 'cyan', label: 'turquesa', rgb: [50, 170, 180] },
  { key: 'light_blue', label: 'celeste', rgb: [110, 180, 240] },
  { key: 'blue', label: 'azul', rgb: [60, 80, 190] },
  { key: 'purple', label: 'morada', rgb: [134, 70, 190] },
  { key: 'magenta', label: 'magenta', rgb: [200, 80, 190] },
  { key: 'pink', label: 'rosa', rgb: [246, 150, 190] },
];

export const PASTEL_COLORS = [
  { key: 'pink', label: 'rosa', rgb: [248, 196, 214] },
  { key: 'lilac', label: 'lila', rgb: [212, 190, 240] },
  { key: 'sky', label: 'celeste', rgb: [184, 222, 246] },
  { key: 'mint', label: 'menta', rgb: [188, 236, 210] },
  { key: 'peach', label: 'melocotón', rgb: [252, 210, 180] },
];

export const TILE_COLORS = [
  { key: 'red', label: 'rojas', rgb: [196, 74, 64] },
  { key: 'lilac', label: 'lilas', rgb: [168, 132, 214] },
  { key: 'sky', label: 'celestes', rgb: [110, 176, 226] },
  { key: 'pink', label: 'rosas', rgb: [232, 128, 172] },
  { key: 'green', label: 'verdes', rgb: [86, 160, 100] },
];

// Categorías del catálogo creativo (pestañas).
export const CATEGORIES = [
  { key: 'nature', icon: '🌿', label: 'Naturaleza' },
  { key: 'building', icon: '🧱', label: 'Construir' },
  { key: 'colors', icon: '🎨', label: 'Colores' },
  { key: 'magic', icon: '✨', label: 'Magia' },
];

// Atajos para definir texturas por cara.
const all = (t) => [t, t, t, t, t, t];
const column = (side, top, bottom = top) => [side, side, top, bottom, side, side];

// Definición de cada bloque. El id es su posición en la lista (0 = aire).
// IMPORTANTE: cuando exista el guardado (fase 3), los bloques nuevos se
// añaden siempre al final para no cambiar los ids de los mundos guardados.
//   solid:     colisiona con el jugador
//   opaque:    tapa por completo las caras de sus vecinos
//   cutout:    tiene píxeles transparentes (hojas, cristal)
//   cullSame:  entre dos bloques iguales no se dibuja la cara (cristal)
//   bounce:    el jugador rebota al caer encima (nube)
//   sound:     familia de sonidos de pasos y golpes
//   category:  pestaña del catálogo creativo
const DEFINITIONS = [
  { name: 'air', label: 'Aire', solid: false, opaque: false, category: null },

  // --- Naturaleza ---
  { name: 'grass', label: 'Hierba', faces: column('grass_side', 'grass_top', 'dirt'), sound: 'grass' },
  { name: 'dirt', label: 'Tierra', faces: all('dirt'), sound: 'gravel' },
  { name: 'stone', label: 'Piedra', faces: all('stone'), sound: 'stone' },
  { name: 'sand', label: 'Arena', faces: all('sand'), sound: 'sand' },
  { name: 'gravel', label: 'Grava', faces: all('gravel'), sound: 'gravel' },
  { name: 'snowy_grass', label: 'Hierba nevada', faces: column('snow_side', 'snow', 'dirt'), sound: 'snow' },
  { name: 'snow', label: 'Nieve', faces: all('snow'), sound: 'snow' },
  { name: 'ice', label: 'Hielo', faces: all('ice'), sound: 'glass' },
  { name: 'oak_log', label: 'Tronco de roble', faces: column('oak_log', 'log_top'), sound: 'wood' },
  { name: 'oak_leaves', label: 'Hojas de roble', faces: all('oak_leaves'), opaque: false, cutout: true, sound: 'grass' },
  { name: 'birch_log', label: 'Tronco de abedul', faces: column('birch_log', 'log_top'), sound: 'wood' },
  { name: 'birch_leaves', label: 'Hojas de abedul', faces: all('birch_leaves'), opaque: false, cutout: true, sound: 'grass' },
  { name: 'cherry_log', label: 'Tronco de cerezo', faces: column('cherry_log', 'log_top'), sound: 'wood' },
  { name: 'cherry_leaves', label: 'Hojas de cerezo', faces: all('cherry_leaves'), opaque: false, cutout: true, sound: 'grass' },
  { name: 'mushroom_cap', label: 'Sombrero de seta', faces: all('mushroom_cap'), sound: 'wool' },
  { name: 'mushroom_stem', label: 'Tallo de seta', faces: all('mushroom_stem'), sound: 'wool' },

  // --- Construir ---
  { name: 'planks', label: 'Tablones', faces: all('planks'), sound: 'wood', category: 'building' },
  { name: 'bricks', label: 'Ladrillos', faces: all('bricks'), sound: 'stone', category: 'building' },
  { name: 'cobblestone', label: 'Adoquines', faces: all('cobblestone'), sound: 'stone', category: 'building' },
  { name: 'white_stone', label: 'Piedra blanca', faces: all('white_stone'), sound: 'stone', category: 'building' },
  { name: 'quartz', label: 'Cuarzo blanco', faces: all('quartz'), sound: 'stone', category: 'building' },
  { name: 'glass', label: 'Cristal', faces: all('glass'), opaque: false, cutout: true, cullSame: true, sound: 'glass', category: 'building' },
  ...PASTEL_COLORS.map((c) => ({
    name: `pastel_${c.key}`,
    label: `Piedra ${c.label}`,
    faces: all(`pastel_${c.key}`),
    sound: 'stone',
    category: 'building',
  })),
  ...TILE_COLORS.map((c) => ({
    name: `tiles_${c.key}`,
    label: `Tejas ${c.label}`,
    faces: all(`tiles_${c.key}`),
    sound: 'stone',
    category: 'building',
  })),

  // --- Colores ---
  ...WOOL_COLORS.map((c) => ({
    name: `wool_${c.key}`,
    label: `Lana ${c.label}`,
    faces: all(`wool_${c.key}`),
    sound: 'wool',
    category: 'colors',
  })),

  // --- Magia ---
  { name: 'gold', label: 'Oro', faces: all('gold'), sound: 'stone', category: 'magic' },
  { name: 'shiny_stone', label: 'Piedra con brillo', faces: all('shiny_stone'), sound: 'glass', category: 'magic' },
  { name: 'rainbow', label: 'Arcoíris', faces: column('rainbow', 'rainbow_top'), sound: 'wool', category: 'magic' },
  { name: 'star', label: 'Estrella', faces: all('star'), sound: 'glass', category: 'magic' },
  { name: 'cloud', label: 'Nube', faces: all('cloud'), bounce: true, sound: 'wool', category: 'magic' },
  { name: 'candy', label: 'Caramelo', faces: all('candy'), sound: 'glass', category: 'magic' },
  { name: 'cookie', label: 'Galleta', faces: all('cookie'), sound: 'sand', category: 'magic' },
];

// Lista de texturas, en orden de aparición: el índice es la capa del DataArrayTexture.
export const TEXTURE_NAMES = [...new Set(DEFINITIONS.flatMap((d) => d.faces ?? []))];
const TEX = Object.fromEntries(TEXTURE_NAMES.map((name, i) => [name, i]));

export const BLOCKS = DEFINITIONS.map((def, id) => ({
  id,
  solid: true,
  opaque: true,
  cutout: false,
  cullSame: false,
  bounce: false,
  sound: 'stone',
  category: 'nature',
  ...def,
  textures: def.faces ?? null, // nombres de textura por cara
  faces: def.faces ? def.faces.map((t) => TEX[t]) : null, // capas por cara
}));

// Ids por nombre: BLOCK.stone, BLOCK.grass...
export const BLOCK = Object.fromEntries(BLOCKS.map((b) => [b.name, b.id]));

// Tablas planas para consultas rápidas en bucles calientes (mallado, física).
export const IS_SOLID = Uint8Array.from(BLOCKS, (b) => (b.solid ? 1 : 0));
export const IS_OPAQUE = Uint8Array.from(BLOCKS, (b) => (b.opaque ? 1 : 0));
export const IS_CUTOUT = Uint8Array.from(BLOCKS, (b) => (b.cutout ? 1 : 0));
export const CULL_SAME = Uint8Array.from(BLOCKS, (b) => (b.cullSame ? 1 : 0));
export const FACE_TEXTURE = new Int16Array(BLOCKS.length * 6).fill(-1);
BLOCKS.forEach((b) => b.faces?.forEach((t, f) => (FACE_TEXTURE[b.id * 6 + f] = t)));
