// Comprueba la ciudad que se construye al crear un mundo nuevo:
//  - todas las puertas tienen paso (hueco libre, y sitio delante y detrás);
//  - todas las escaleras se pueden subir con la física real del jugador.
// Uso: npm run verificar

globalThis.navigator ??= { hardwareConcurrency: 4 }; // settings.js lo consulta

const { SETTINGS } = await import('../src/config/settings.js');
const { Player } = await import('../src/entities/player.js');
const { buildCity } = await import('../src/structures/city.js');
const { CITY_LEVEL } = await import('../src/world/terrain.js');
const { IS_SOLID, BLOCKS, BLOCK } = await import('../src/blocks/registry.js');

const start = performance.now();
const city = buildCity();
let blocks = 0;
for (const edits of city.chunks.values()) blocks += edits.size;
console.log(
  `Ciudad: ${city.chunks.size} chunks, ${blocks} bloques en ${(performance.now() - start).toFixed(0)} ms; ` +
    `${city.doors.length} puertas y ${city.stairways.length} escaleras.`,
);

// La ciudad se construye sobre terreno llano: debajo, suelo; encima, aire.
const getBlock = (x, y, z) => city.get(x, y, z) ?? (y <= CITY_LEVEL ? BLOCK.grass : BLOCK.air);
const isSolid = (x, y, z) => IS_SOLID[getBlock(x, y, z)] === 1;
const world = { getBlock, isSolid };
const nameAt = (x, y, z) => BLOCKS[getBlock(x, y, z)].name;

let problems = 0;

for (const door of city.doors) {
  const issues = [];
  for (const [where, x, z] of [['hueco', door.x, door.z], ['dentro', door.inX, door.inZ], ['fuera', door.outX, door.outZ]]) {
    if (isSolid(x, door.y, z) || isSolid(x, door.y + 1, z)) issues.push(`${where} tapado (${nameAt(x, door.y, z)}/${nameAt(x, door.y + 1, z)})`);
    if (!isSolid(x, door.y - 1, z)) issues.push(`${where} sin suelo`);
  }
  if (issues.length) {
    problems++;
    console.log(`✗ Puerta de ${door.name} en (${door.x}, ${door.y}, ${door.z}): ${issues.join('; ')}`);
  }
}

const walkUp = { forward: 1, strafe: 0, jump: true, sneak: false, sprint: false };
for (const stairs of city.stairways) {
  const player = new Player(SETTINGS);
  player.spawnAt(stairs.x + 0.5, stairs.y, stairs.z + 0.5);
  player.yaw = Math.atan2(-stairs.dx, -stairs.dz); // mirando hacia donde sube
  const target = stairs.y + stairs.rise;
  for (let t = 0; t < 15 * 60 && !(player.position.y >= target && player.onGround); t++) player.step(1 / 60, walkUp, world);
  if (player.position.y < target) {
    problems++;
    console.log(`✗ ${stairs.name} desde (${stairs.x}, ${stairs.y}, ${stairs.z}): llega a y=${player.position.y.toFixed(2)}, no a ${target}`);
  }
}

if (problems) {
  console.log(`\n${problems} problema(s).`);
  process.exit(1);
}
console.log('✓ Todas las puertas tienen paso y todas las escaleras se pueden subir.');
