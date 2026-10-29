// Registro de bloques. Es datos puros (sin DOM) para poder usarlo también
// dentro de los Web Workers de mallado.
//
// Orden de caras usado en todo el motor:
//   0: +X (este)  1: -X (oeste)  2: +Y (arriba)  3: -Y (abajo)  4: +Z (sur)  5: -Z (norte)

// Lista de texturas: el índice en esta lista es la capa del DataArrayTexture.
export const TEXTURE_NAMES = [
  'grass_top',
  'grass_side',
  'dirt',
  'stone',
  'sand',
  'gravel',
  'snow',
  'snow_side',
  'log_top',
  'oak_log',
  'oak_leaves',
  'birch_log',
  'birch_leaves',
  'cherry_log',
  'cherry_leaves',
  'planks',
  'bricks',
];

const TEX = Object.fromEntries(TEXTURE_NAMES.map((name, i) => [name, i]));

// Atajos para definir texturas por cara.
const all = (t) => [t, t, t, t, t, t];
const column = (side, top, bottom = top) => [side, side, top, bottom, side, side];

// Definición de cada bloque. El id es su posición en la lista (0 = aire).
//   solid:       colisiona con el jugador
//   opaque:      tapa por completo las caras de sus vecinos
//   cutout:      tiene píxeles transparentes (hojas)
const DEFINITIONS = [
  { name: 'air', label: 'Aire', solid: false, opaque: false },
  { name: 'grass', label: 'Hierba', faces: column('grass_side', 'grass_top', 'dirt') },
  { name: 'dirt', label: 'Tierra', faces: all('dirt') },
  { name: 'stone', label: 'Piedra', faces: all('stone') },
  { name: 'sand', label: 'Arena', faces: all('sand') },
  { name: 'gravel', label: 'Grava', faces: all('gravel') },
  { name: 'snowy_grass', label: 'Hierba nevada', faces: column('snow_side', 'snow', 'dirt') },
  { name: 'snow', label: 'Nieve', faces: all('snow') },
  { name: 'oak_log', label: 'Tronco de roble', faces: column('oak_log', 'log_top') },
  { name: 'oak_leaves', label: 'Hojas de roble', faces: all('oak_leaves'), opaque: false, cutout: true },
  { name: 'birch_log', label: 'Tronco de abedul', faces: column('birch_log', 'log_top') },
  { name: 'birch_leaves', label: 'Hojas de abedul', faces: all('birch_leaves'), opaque: false, cutout: true },
  { name: 'cherry_log', label: 'Tronco de cerezo', faces: column('cherry_log', 'log_top') },
  { name: 'cherry_leaves', label: 'Hojas de cerezo', faces: all('cherry_leaves'), opaque: false, cutout: true },
  { name: 'planks', label: 'Tablones', faces: all('planks') },
  { name: 'bricks', label: 'Ladrillos', faces: all('bricks') },
];

export const BLOCKS = DEFINITIONS.map((def, id) => ({
  id,
  solid: true,
  opaque: true,
  cutout: false,
  ...def,
  faces: def.faces ? def.faces.map((t) => TEX[t]) : null,
}));

// Ids por nombre: BLOCK.stone, BLOCK.grass...
export const BLOCK = Object.fromEntries(BLOCKS.map((b) => [b.name, b.id]));

// Tablas planas para consultas rápidas en bucles calientes (mallado, física).
export const IS_SOLID = Uint8Array.from(BLOCKS, (b) => (b.solid ? 1 : 0));
export const IS_OPAQUE = Uint8Array.from(BLOCKS, (b) => (b.opaque ? 1 : 0));
export const IS_CUTOUT = Uint8Array.from(BLOCKS, (b) => (b.cutout ? 1 : 0));
export const FACE_TEXTURE = new Int16Array(BLOCKS.length * 6).fill(-1);
BLOCKS.forEach((b) => b.faces?.forEach((t, f) => (FACE_TEXTURE[b.id * 6 + f] = t)));
