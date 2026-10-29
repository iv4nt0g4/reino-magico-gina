// Comprueba las construcciones del juego:
//  - la ciudad que se construye al crear un mundo nuevo;
//  - las aldeas y casitas que aparecen por el mapa (sobre el terreno real).
// En todas: cada puerta tiene paso (hueco libre, y sitio delante y detrás) y
// cada escalera se puede subir con la física real del jugador.
// Uso: npm run verificar

globalThis.navigator ??= { hardwareConcurrency: 4 }; // settings.js lo consulta

const { SETTINGS } = await import('../src/config/settings.js');
const { Player } = await import('../src/entities/player.js');
const { buildCity } = await import('../src/structures/city.js');
const { CITY_LEVEL } = await import('../src/world/terrain.js');
const { createWorldGen } = await import('../src/world/worldgen.js');
const { CHUNK_SIZE, blockIndex } = await import('../src/engine/constants.js');
const { IS_SOLID, BLOCKS, BLOCK } = await import('../src/blocks/registry.js');

const VILLAGE_CELLS = 3; // se revisan las aldeas de las celdas -3..3 en cada eje
let problems = 0;

// Revisa las puertas y escaleras registradas por un constructor.
function check(label, builder, getBlock) {
  const isSolid = (x, y, z) => IS_SOLID[getBlock(x, y, z)] === 1;
  const world = { getBlock, isSolid };
  const nameAt = (x, y, z) => BLOCKS[getBlock(x, y, z)].name;
  for (const door of builder.doors) {
    const issues = [];
    for (const [where, x, z] of [['hueco', door.x, door.z], ['dentro', door.inX, door.inZ], ['fuera', door.outX, door.outZ]]) {
      if (isSolid(x, door.y, z) || isSolid(x, door.y + 1, z)) issues.push(`${where} tapado (${nameAt(x, door.y, z)}/${nameAt(x, door.y + 1, z)})`);
      if (!isSolid(x, door.y - 1, z)) issues.push(`${where} sin suelo`);
    }
    if (issues.length) {
      problems++;
      console.log(`✗ [${label}] puerta de ${door.name} en (${door.x}, ${door.y}, ${door.z}): ${issues.join('; ')}`);
    }
  }
  const walkUp = { forward: 1, strafe: 0, jump: true, sneak: false, sprint: false };
  for (const stairs of builder.stairways) {
    const player = new Player(SETTINGS);
    player.spawnAt(stairs.x + 0.5, stairs.y, stairs.z + 0.5);
    player.yaw = Math.atan2(-stairs.dx, -stairs.dz); // mirando hacia donde sube
    const target = stairs.y + stairs.rise;
    for (let t = 0; t < 15 * 60 && !(player.position.y >= target && player.onGround); t++) player.step(1 / 60, walkUp, world);
    if (player.position.y < target) {
      problems++;
      console.log(`✗ [${label}] ${stairs.name} desde (${stairs.x}, ${stairs.y}, ${stairs.z}): llega a y=${player.position.y.toFixed(2)}, no a ${target}`);
    }
  }
  return builder.doors.length + builder.stairways.length;
}

// ---- Ciudad (sobre terreno llano) ----
let start = performance.now();
const city = buildCity();
let blocks = 0;
for (const edits of city.chunks.values()) blocks += edits.size;
const cityChecks = check('ciudad', city, (x, y, z) => city.get(x, y, z) ?? (y <= CITY_LEVEL ? BLOCK.grass : BLOCK.air));
console.log(`Ciudad: ${city.chunks.size} chunks, ${blocks} bloques, ${city.doors.length} puertas y ${city.stairways.length} escaleras (${(performance.now() - start).toFixed(0)} ms).`);

// ---- Aldeas y casitas (sobre el terreno generado de verdad) ----
start = performance.now();
const worldgen = createWorldGen(SETTINGS.seed);
const chunkCache = new Map();
const getBlock = (x, y, z) => {
  if (y < 0) return BLOCK.stone;
  if (y >= 128) return BLOCK.air;
  const cx = Math.floor(x / CHUNK_SIZE), cz = Math.floor(z / CHUNK_SIZE);
  const key = `${cx},${cz}`;
  if (!chunkCache.has(key)) chunkCache.set(key, worldgen.generateChunk(cx, cz));
  return chunkCache.get(key)[blockIndex(x - cx * CHUNK_SIZE, y, z - cz * CHUNK_SIZE)];
};
let sites = 0, checks = 0;
for (let j = -VILLAGE_CELLS; j <= VILLAGE_CELLS; j++) {
  for (let i = -VILLAGE_CELLS; i <= VILLAGE_CELLS; i++) {
    for (const kind of ['aldea', 'rincon']) {
      for (const [di, dj] of kind === 'aldea' ? [[0, 0]] : [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const site = worldgen.villages.site(kind, kind === 'aldea' ? i : i * 2 + di, kind === 'aldea' ? j : j * 2 + dj);
        if (!site) continue;
        sites++;
        checks += check(`${site.kind} ${site.type} (${site.x}, ${site.z})`, worldgen.villages.builderFor(site), getBlock);
      }
    }
  }
}
console.log(`Aldeas y rincones: ${sites} sitios, ${checks} puertas y escaleras (${(performance.now() - start).toFixed(0)} ms).`);

if (problems) {
  console.log(`\n${problems} problema(s).`);
  process.exit(1);
}
console.log(`✓ Todas las puertas tienen paso y todas las escaleras se pueden subir (${cityChecks + checks} comprobaciones).`);
