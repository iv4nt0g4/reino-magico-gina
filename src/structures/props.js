// Objetos pequeños que dan vida a la ciudad: pozos, puestos de mercado,
// bancos, carretas, barriles, cajas, jardineras y estatuas. Todos se colocan
// en coordenadas del mundo, apoyados sobre el suelo en la altura y.

// Pozo de piedra con agua, dos postes y tejadillo.
export function well(b, x, y, z, roof = 'tiles_red') {
  b.fillBox(x - 1, y, z - 1, x + 1, y, z + 1, 'cobblestone');
  b.set(x, y, z, 'water');
  b.fillBox(x - 1, y - 3, z - 1, x + 1, y - 1, z + 1, 'cobblestone'); // pozo hondo
  b.fillBox(x, y - 3, z, x, y - 1, z, 'water');
  for (const dx of [-1, 1]) b.fillBox(x + dx, y + 1, z, x + dx, y + 2, z, 'oak_log');
  b.fillBox(x - 1, y + 3, z - 1, x + 1, y + 3, z + 1, roof);
  b.set(x, y + 4, z, roof);
}

// Puesto de mercado: cuatro postes, toldo de rayas y mostrador con mercancía.
export function marketStall(b, x, y, z, rng, axis = 'x') {
  const stripes = rng.pick([['wool_red', 'wool_white'], ['wool_blue', 'wool_white'], ['wool_yellow', 'wool_pink'], ['wool_lime', 'wool_white']]);
  const goods = rng.pick([
    ['flower_red', 'flower_yellow', 'flower_pink'],
    ['cookie', 'candy', 'cookie'],
    ['wool_orange', 'wool_red', 'wool_yellow'], // fruta
    ['wool_light_blue', 'wool_pink', 'wool_purple'], // telas
  ]);
  const along = (k) => (axis === 'x' ? [x + k, z] : [x, z + k]);
  const across = (k, j) => (axis === 'x' ? [x + k, z + j] : [x + j, z + k]);
  for (const k of [-1, 2]) {
    for (const j of [0, 1]) {
      const [px, pz] = across(k, j);
      b.fillBox(px, y, pz, px, y + 2, pz, 'birch_log');
    }
  }
  for (let k = -1; k <= 2; k++) {
    for (let j = 0; j <= 1; j++) {
      const [px, pz] = across(k, j);
      b.set(px, y + 3, pz, stripes[(k + 1) % 2]);
    }
  }
  for (let k = 0; k <= 1; k++) {
    const [px, pz] = along(k);
    b.set(px, y, pz, 'planks');
    const good = goods[(k + 1) % goods.length];
    b.set(px, y + 1, pz, good);
  }
}

// Banco de madera de dos plazas.
export function bench(b, x, y, z, axis = 'x') {
  b.set(x, y, z, 'planks');
  if (axis === 'x') b.set(x + 1, y, z, 'planks');
  else b.set(x, y, z + 1, 'planks');
}

// Carreta: caja de madera con dos ruedas de tronco.
export function cart(b, x, y, z, load = 'wool_yellow') {
  b.fillBox(x, y, z, x + 1, y, z, 'oak_log'); // ruedas
  b.fillBox(x, y + 1, z - 1, x + 1, y + 1, z + 1, 'planks');
  b.set(x, y + 2, z, load);
  b.set(x + 1, y + 2, z, load);
}

// Barril (tronco de pie) y cajas de madera apiladas.
export function barrels(b, x, y, z, rng) {
  b.set(x, y, z, 'oak_log');
  if (rng.chance(0.6)) b.set(x + 1, y, z, 'oak_log');
  if (rng.chance(0.6)) b.set(x, y, z + 1, 'planks');
  if (rng.chance(0.4)) b.set(x, y + 1, z, 'planks');
}

// Árbol en una jardinera de piedra.
export function plantedTree(b, x, y, z, type = 'cherry') {
  b.fillBox(x - 1, y - 1, z - 1, x + 1, y - 1, z + 1, 'cobblestone');
  b.set(x, y - 1, z, 'grass');
  b.tree(x, y, z, type, 4);
}

// Estatua de un unicornio de cuarzo con cuerno de oro, sobre un pedestal.
// Mira hacia -z.
export function unicornStatue(b, x, y, z) {
  b.fillBox(x - 1, y, z - 2, x + 1, y, z + 2, 'white_stone'); // pedestal
  b.set(x, y + 1, z - 1, 'quartz'); // patas
  b.set(x, y + 1, z + 1, 'quartz');
  b.fillBox(x, y + 2, z - 1, x, y + 2, z + 1, 'quartz'); // cuerpo
  b.set(x, y + 3, z - 1, 'quartz'); // cuello
  b.set(x, y + 4, z - 1, 'quartz'); // cabeza
  b.set(x, y + 4, z - 2, 'quartz'); // hocico
  b.set(x, y + 5, z - 1, 'gold'); // cuerno
  b.set(x, y + 3, z, 'wool_pink'); // crin
  b.set(x, y + 2, z + 2, 'wool_light_blue'); // cola
  b.set(x - 1, y + 1, z + 2, 'flower_pink');
  b.set(x + 1, y + 1, z + 2, 'flower_white');
}
