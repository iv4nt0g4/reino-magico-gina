// Punto de entrada: monta el motor, carga la partida guardada y ejecuta el bucle del juego.

import './style.css';
import { SETTINGS } from './config/settings.js';
import { createRenderer, cameraFar } from './engine/renderer.js';
import { QualityManager } from './engine/quality.js';
import { createBlockMaterials } from './blocks/material.js';
import { ChunkManager } from './engine/chunks.js';
import { Input } from './engine/input.js';
import { Interaction } from './engine/interaction.js';
import { Sky } from './engine/sky.js';
import { Player } from './entities/player.js';
import { BrotisManager } from './entities/brotis.js';
import { Sparkles } from './entities/sparkles.js';
import { Hand } from './entities/hand.js';
import { Fireworks } from './entities/fireworks.js';
import { AnimalManager } from './entities/animals.js';
import { Companion } from './entities/companion.js';
import { Drops } from './entities/drops.js';
import { Inventory } from './entities/inventory.js';
import { Signs } from './entities/signs.js';
import { Pet } from './entities/pet.js';
import { Birthday } from './entities/birthday.js';
import { Music } from './audio/music.js';
import { Messages } from './ui/messages.js';
import { applyTheme, savedTheme, themePicker } from './ui/theme.js';
import { isBirthday } from './config/gina.js';
import { WaterSimulation } from './world/water.js';
import { Storage, SAVE_VERSION } from './world/storage.js';
import { buildCity, CITY_SPAWN } from './structures/city.js';
import { Sounds } from './audio/sounds.js';
import { Hud } from './ui/hud.js';
import { Hotbar } from './ui/hotbar.js';
import { Catalog } from './ui/catalog.js';
import { InventoryScreen } from './ui/inventoryScreen.js';
import { CHUNK_SIZE } from './engine/constants.js';
import { BLOCK, BLOCKS, WOOL_COLORS } from './blocks/registry.js';

const PHYSICS_DT = 1 / 60; // paso fijo de física
const MAX_STEPS = 5; // evita la "espiral de la muerte" si el juego va lento
const LOADING_RADIUS = 2; // chunks que deben verse antes de poder jugar

applyTheme(savedTheme()); // el color favorito de Gina (o el elegido en la pausa)
const hud = new Hud();
const birthday = isBirthday();

// ---- Partida guardada ----
const storage = await Storage.open();
const saved = await storage?.loadMeta().catch(() => null);
const meta = saved?.version === SAVE_VERSION ? saved : null;
const newWorld = !meta; // sin partida: se crea el mundo y se construye la ciudad
if (meta) SETTINGS.seed = meta.seed;

// Punto de aparición: ?pos=x,z en la URL (depuración), la partida guardada o
// delante de la puerta del castillo.
const urlPos = new URLSearchParams(location.search).get('pos');
const [SPAWN_X, SPAWN_Z] = urlPos
  ? urlPos.split(',').map((v) => Math.floor(Number(v)) || 0)
  : meta
    ? [Math.floor(meta.player.x), Math.floor(meta.player.z)]
    : [Math.floor(CITY_SPAWN.x), Math.floor(CITY_SPAWN.z)];

// ---- Motor ----
const { renderer, scene, camera, viewDistance } = createRenderer(document.getElementById('game'), SETTINGS);
const materials = createBlockMaterials(SETTINGS);
const world = new ChunkManager(scene, materials, SETTINGS, storage);
const water = new WaterSimulation(world);
const sky = new Sky(scene, camera, materials.uniforms, SETTINGS, viewDistance);
const player = new Player(SETTINGS);
const input = new Input(renderer.domElement, SETTINGS);
const sounds = new Sounds(SETTINGS.volume);
const hotbar = new Hotbar();
const catalog = new Catalog(hotbar);
const interaction = new Interaction({ scene, camera, world, water, player, hotbar, sounds, settings: SETTINGS });
const sparkles = new Sparkles(scene);
const brotis = new BrotisManager(scene, world, sounds);
const hand = new Hand();
const fireworks = new Fireworks(scene, sounds);
const animals = new AnimalManager(scene, world, sounds);
const companion = new Companion(scene, sounds);
const drops = new Drops(scene, sounds);
const backpack = new Inventory(36); // inventario de la Aventura suave (barra rápida + mochila)
let mode = 'creative'; // 'creative' o 'adventure' (se aplica con setMode)
const music = new Music(sounds, SETTINGS.musicVolume);
const signs = new Signs(scene);
const pet = new Pet(scene, sounds);
const party = birthday ? new Birthday(scene, music, sounds, hud) : null;
const messages = new Messages(hud);
let titleSpin = 0; // en la pantalla de título la cámara gira despacito
let started = false;
const inventoryScreen = new InventoryScreen(hotbar, sounds);
interaction.onAction = () => hand.swing();

// Calidad automática (resolución y distancia de visión según los fps).
const quality = new QualityManager(renderer, (distance) => {
  world.setRenderDistance(distance);
  const viewDistance = (distance + 1) * 16;
  camera.far = cameraFar(viewDistance);
  camera.updateProjectionMatrix();
  sky.setViewDistance(viewDistance);
});
quality.apply();

const ARROW_TURN_SPEED = 2.2; // radianes por segundo al girar con las flechas
const ARROW_TILT_SPEED = 1.6;

if (meta) {
  hotbar.restore(meta.hotbar, meta.selected);
  sky.time = meta.time;
}
// Inventario de aventura guardado o, la primera vez, un regalito de bienvenida.
if (meta?.adventure) backpack.restore(meta.adventure, (id) => id > 0 && !!BLOCKS[id]);
else backpack.add(BLOCK.torch, 8);

// Mundo nuevo: construir el reino una sola vez y guardarlo enseguida.
if (newWorld) {
  const label = '🏰 Construyendo el reino…';
  hud.setLoading(0, label);
  await world.bakeStructures(buildCity(), (done, total) => hud.setLoading(done / total, label));
  player.spawnAt(CITY_SPAWN.x, CITY_SPAWN.y, CITY_SPAWN.z);
  await writeSave().catch((error) => console.warn('No se pudo guardar el mundo nuevo:', error));
  hud.setLoading(0);
}

// Acceso desde la consola del navegador para depurar (solo en `npm run dev`).
if (import.meta.env.DEV) {
  window.__juego = { player, world, water, sky, hotbar, interaction, sounds, storage, quality, brotis, hand, fireworks, animals, companion, materials, drops, backpack, inventoryScreen, setMode, respawn, signs, pet, party, music, messages };
}

// Estados: loading → paused ⇄ playing ⇄ catalog (catálogo o inventario)
let state = 'loading';
setMode(meta?.mode === 'adventure' ? 'adventure' : 'creative');
let accumulator = 0;
let lastTime = performance.now();
let fps = 0, fpsFrames = 0, fpsTime = 0;

function setState(next) {
  const previous = state;
  state = next;
  hud.setState(next);
  if (next !== 'playing') {
    interaction.hideOutline();
    quality.reset();
  }
  if (next === 'paused' && previous === 'playing') saveGame();
  if (next === 'playing' && !started) {
    started = true;
    titleSpin = 0;
    messages.welcome({ night: sky.sunElevation < -0.1, birthday });
    if (birthday) hud.confetti();
  }
}

function play() {
  sounds.unlock();
  music.start();
  input.requestLock().catch(() => setState('paused'));
}

// ---- Guardado ----
let saving = false;
let resetting = false; // borrando para empezar un mundo nuevo: ya no se guarda nada

// Escribe los chunks pendientes y el estado del jugador.
async function writeSave() {
  if (!storage) return;
  await world.saveEdits();
  const p = player.position;
  await storage.saveMeta({
    version: SAVE_VERSION,
    seed: SETTINGS.seed,
    player: { x: p.x, y: p.y, z: p.z, yaw: player.yaw, pitch: player.pitch, flying: player.flying },
    hotbar: hotbar.creative.slots.map((s) => s?.id ?? 0),
    selected: hotbar.selected,
    mode,
    adventure: backpack.toJSON(),
    time: sky.time,
    savedAt: Date.now(),
  });
}

async function saveGame() {
  if (!storage || state === 'loading' || saving || resetting) return;
  saving = true;
  try {
    await writeSave();
    hud.showSaved();
  } catch (error) {
    console.warn('No se pudo guardar la partida:', error);
  } finally {
    saving = false;
  }
}
setInterval(saveGame, SETTINGS.autosaveSeconds * 1000);
// Al cambiar de pestaña o cerrar, guardar (es el momento fiable para hacerlo).
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && saveGame());
window.addEventListener('pagehide', saveGame);

// ---- Controles ----
input.onToggleDebug = () => hud.toggleDebug();
input.onHotbarSelect = (i) => hotbar.select(i);
input.onHotbarScroll = (d) => hotbar.scroll(d);
input.onMouseDown = (button) => {
  if (button === 0) hand.swing(); // como en el original, la mano golpea aunque no haya bloque
  interaction.mouseDown(button);
};
input.onOpenCatalog = () => {
  setState('catalog');
  input.releaseLock();
  // En creativo, el catálogo de todos los bloques; en aventura, el inventario con el crafteo.
  if (mode === 'adventure') inventoryScreen.open(backpack);
  else catalog.open();
};
const fullscreenButton = document.getElementById('fullscreen');
fullscreenButton.hidden = !document.fullscreenEnabled;
fullscreenButton.addEventListener('click', toggleFullscreen);

// Pantalla completa (en tablet, además, en horizontal si se puede).
function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
    return;
  }
  document.documentElement
    .requestFullscreen({ navigationUI: 'hide' })
    .then(() => screen.orientation?.lock?.('landscape'))
    .catch(() => {});
}

input.onLockChange = (locked) => {
  if (state === 'loading') return;
  if (locked) setState('playing');
  else if (state !== 'catalog') setState('paused');
};
catalog.onClose = inventoryScreen.onClose = (relock) => {
  if (relock) play();
  else setState('paused');
};
// Lo que no cabe en la mochila al cerrar el inventario cae delante de Gina.
inventoryScreen.onDrop = (id, count) => {
  const p = player.position;
  drops.spawn(id, count, p.x - Math.sin(player.yaw), p.y + 1.2, p.z - Math.cos(player.yaw));
};

// ---- Modos de juego: Creativo y Aventura suave ----
function setMode(next, announce = false) {
  mode = next;
  const adventure = mode === 'adventure';
  interaction.adventure = adventure;
  player.canFly = !adventure;
  if (adventure && player.flying) {
    player.flying = false;
    player.fallStart = null; // bajar de volar al cambiar de modo no cuenta como caída
  }
  hotbar.setInventory(adventure ? backpack : hotbar.creative);
  hud.setMode(mode);
  if (announce) {
    hud.toast(adventure ? '🎒 ¡Aventura!' : '🎨 ¡Creativo!');
    sounds.magic(0.8);
  }
}
hud.onModeChange((next) => {
  if (next === mode) return;
  setMode(next, true);
  saveGame();
});

// Al romper en aventura, sale el bloque pequeñito para recogerlo.
interaction.onBreak = (x, y, z, id) => {
  if (mode === 'adventure') drops.spawn(BLOCKS[id].drop, 1, x + 0.5, y + 0.5, z + 0.5);
};

// Caricias (clic derecho sobre un animalito, Capi o un Brotis): corazones y
// su sonido. En aventura, las ovejas regalan un poco de lana de su color.
interaction.creatures = () => [...animals.list, ...brotis.list, ...(companion.placed ? [companion] : []), ...(pet.shown ? [pet] : [])];
interaction.onPlace = () => messages.placedBlock();
inventoryScreen.onCraft = () => messages.crafted();

// Opciones de la pausa: colores y música (se recuerdan en este dispositivo).
themePicker(document.getElementById('themes'));
let musicOn = true;
try {
  musicOn = localStorage.getItem('reino-gina-musica') !== 'no';
} catch {
  // sin almacenamiento: con música
}
music.setEnabled(musicOn);
hud.onMusicToggle(musicOn, (on) => {
  music.setEnabled(on);
  try {
    localStorage.setItem('reino-gina-musica', on ? 'si' : 'no');
  } catch {
    // no se recordará
  }
});
interaction.onPet = (c) => {
  const head = c.sp?.headY ?? c.height;
  sparkles.burst(c.position.x, c.position.y + head + 0.3, c.position.z, 7, ['corazon']);
  if (c.kind) sounds.animal(c.kind, 1);
  else sounds.chirp();
  if (c.onGround) c.vy = 4; // saltito de alegría
  if (mode === 'adventure' && c.kind === 'oveja' && !(c.woolAt > performance.now())) {
    c.woolAt = performance.now() + SETTINGS.woolEverySeconds * 1000;
    drops.spawn(woolFor(c.color), 1, c.position.x, c.position.y + 1, c.position.z, player.position);
  }
};

// Lana del color más parecido al de la oveja.
function woolFor(rgb) {
  let best = WOOL_COLORS[0], bestDist = Infinity;
  for (const w of WOOL_COLORS) {
    const d = (w.rgb[0] - rgb[0]) ** 2 + (w.rgb[1] - rgb[1]) ** 2 + (w.rgb[2] - rgb[2]) ** 2;
    if (d < bestDist) [best, bestDist] = [w, d];
  }
  return BLOCK[`wool_${best.key}`];
}

// Tras una caída muy grande (aventura) o al caer fuera del mundo: reaparece
// en la puerta del castillo con una lluvia de estrellitas. No pierde nada.
function respawn() {
  player.spawnAt(CITY_SPAWN.x, CITY_SPAWN.y, CITY_SPAWN.z);
  player.yaw = CITY_SPAWN.yaw;
  player.pitch = 0;
  hud.sparkle();
  hud.toast('✨ ¡Upsi! ✨');
  sounds.magic();
  sparkles.burst(CITY_SPAWN.x, CITY_SPAWN.y + 1.5, CITY_SPAWN.z, 20, ['estrella']);
}
hotbar.onSlotClick = (i) => hotbar.select(i);

// Pedir confirmación antes de cerrar la pestaña (Ctrl+W está muy cerca de
// Ctrl+correr). En pantalla completa además se bloquean esas teclas.
window.addEventListener('beforeunload', (e) => {
  if (state !== 'loading' && !resetting) e.preventDefault();
});

// Mundo nuevo (desde la pausa, tras confirmar): borrar la partida y recargar.
hud.enableNewWorld(async () => {
  resetting = true;
  await storage?.clear().catch((error) => console.warn('No se pudo borrar la partida:', error));
  location.reload();
});
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) navigator.keyboard?.lock?.(['KeyW', 'ControlLeft', 'ControlRight']).catch(() => {});
});

// ---- Carga ----
function spawn() {
  if (meta && !urlPos) {
    const p = meta.player;
    player.spawnAt(p.x, p.y, p.z);
    player.yaw = p.yaw;
    player.pitch = p.pitch;
    player.flying = p.flying;
  } else if (!urlPos) {
    player.spawnAt(CITY_SPAWN.x, CITY_SPAWN.y, CITY_SPAWN.z);
    player.yaw = CITY_SPAWN.yaw;
  } else {
    const top = world.topSolidY(SPAWN_X, SPAWN_Z);
    player.spawnAt(SPAWN_X + 0.5, top + 1, SPAWN_Z + 0.5);
  }
}

function updateLoading() {
  const { meshed, total } = world.countMeshedAround(
    Math.floor(SPAWN_X / CHUNK_SIZE),
    Math.floor(SPAWN_Z / CHUNK_SIZE),
    LOADING_RADIUS,
  );
  hud.setLoading(meshed / total);
  if (meshed === total && world.topSolidY(SPAWN_X, SPAWN_Z) >= 0) {
    spawn();
    setState('paused');
    hud.ready(play);
  }
}

// Sonidos de pasos, aterrizajes y chapuzones que ha generado la física.
function playPlayerSounds() {
  for (const e of player.events) {
    if (e.type === 'splash') sounds.play('water', 'splash', Math.min(1.5, e.speed / 10));
    if (e.type === 'bigFall' && mode === 'adventure') {
      respawn();
      break;
    }
    if (!e.block) continue;
    const material = BLOCKS[e.block].sound;
    if (e.type === 'step') sounds.play(material, 'step', e.quiet ? 0.4 : 1);
    else if (e.type === 'land' && e.speed > 5) sounds.play(material, 'land', Math.min(1.5, e.speed / 12));
  }
  player.events.length = 0;
}

// Hora del juego como reloj (0 = amanecer a las 6:00).
function clock(time) {
  const minutes = Math.floor(((time * 24 + 6) % 24) * 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

// Punto cardinal hacia el que mira el jugador (norte = -Z).
function facing(yaw) {
  const names = ['norte', 'oeste', 'sur', 'este'];
  const i = Math.round(yaw / (Math.PI / 2));
  return names[((i % 4) + 4) % 4];
}

// ---- Bucle principal ----
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.25, (now - lastTime) / 1000);
  lastTime = now;

  if (state === 'loading') {
    world.update(SPAWN_X, SPAWN_Z);
    updateLoading();
  } else {
    if (state === 'playing') {
      const mouse = input.consumeMouse();
      player.look(mouse.x, mouse.y);
      const arrows = input.arrows();
      player.turn(arrows.turn * ARROW_TURN_SPEED * dt, arrows.tilt * ARROW_TILT_SPEED * dt);
      quality.sample(dt);
      accumulator += dt;
      let steps = 0;
      while (accumulator >= PHYSICS_DT && steps < MAX_STEPS) {
        player.step(PHYSICS_DT, input.state(), world);
        accumulator -= PHYSICS_DT;
        steps++;
      }
      if (steps === MAX_STEPS) accumulator = 0;
      playPlayerSounds();
      if (player.position.y < -20) respawn(); // por si cae por debajo del mundo
      sky.advance(dt);
      const daylight = materials.uniforms.uDaylight.value;
      brotis.update(dt, player.position, daylight, sparkles);
      animals.update(dt, player.position, daylight, sparkles);
      companion.update(dt, world, player, daylight, sparkles);
      drops.update(dt, world, player, mode === 'adventure' ? backpack : null, daylight);
      pet.update(dt, world, player.position, daylight, sparkles);
      party?.update(dt, player, daylight, sparkles);
      signs.update(player, daylight);
      messages.daylight(sky.sunElevation);
      music.night = Math.max(0, Math.min(1, -sky.sunElevation / 0.2));
      sparkles.update(dt);
      fireworks.update(dt, Math.max(0, Math.min(1, -sky.sunElevation / 0.25)), camera.position);
      water.update(dt);
    }
    world.update(player.position.x, player.position.z);
  }

  // Cámara
  const eye = player.eyePosition(state === 'playing' ? accumulator / PHYSICS_DT : 1);
  camera.position.set(eye.x, eye.y, eye.z);
  if (!started && state === 'paused') titleSpin += dt * 0.05;
  camera.rotation.set(player.pitch, player.yaw + titleSpin, 0);
  const targetFov = SETTINGS.fov + (player.sprinting ? SETTINGS.sprintFovBoost : 0);
  if (Math.abs(camera.fov - targetFov) > 0.01) {
    camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-10 * dt));
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();

  // Linterna mágica: el bloque de la mano, si brilla, ilumina alrededor de Gina
  // (se enciende y se apaga poco a poco).
  const heldLight = materials.uniforms.uHeldLevel;
  const heldTarget = BLOCKS[hotbar.selectedBlock()]?.light ?? 0;
  heldLight.value += (heldTarget - heldLight.value) * (1 - Math.exp(-SETTINGS.heldLightFade * dt));
  materials.uniforms.uHeldPos.value.copy(camera.position);

  // Bloque apuntado, romper y colocar (después de mover la cámara).
  if (state === 'playing') interaction.update(input.buttons, now, dt);
  world.flushEdits();

  sky.update(player.headInWater);
  hud.setUnderwater(player.headInWater);
  renderer.render(scene, camera);
  if (state !== 'loading') {
    const v = player.velocity;
    const handLight = Math.max(materials.uniforms.uDaylight.value, heldLight.value / 15);
    hand.update(dt, hotbar.selectedBlock(), Math.hypot(v.x, v.z), player.onGround, handLight);
    hand.render(renderer);
  }

  // Panel de depuración (F3)
  fpsFrames++;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    fps = Math.round(fpsFrames / fpsTime);
    fpsFrames = fpsTime = 0;
    const p = player.position;
    const s = world.stats();
    const t = interaction.target;
    hud.updateDebug([
      `${fps} fps · ${clock(sky.time)}`,
      `XYZ ${p.x.toFixed(2)} / ${p.y.toFixed(2)} / ${p.z.toFixed(2)}`,
      `Mirando ${facing(player.yaw)} (yaw ${((player.yaw * 180) / Math.PI).toFixed(0)}°, pitch ${((player.pitch * 180) / Math.PI).toFixed(0)}°)`,
      `Chunk ${Math.floor(p.x / CHUNK_SIZE)}, ${Math.floor(p.z / CHUNK_SIZE)}`,
      `Chunks ${s.meshes} dibujados / ${s.loaded} cargados · distancia ${quality.distance}${input.fallback ? ' · sin captura de ratón' : ''}`,
      `Triángulos ${s.triangles.toLocaleString('es')}`,
      `${player.flying ? 'Volando' : player.inWater ? 'Nadando' : player.onGround ? 'En el suelo' : 'En el aire'}${player.sprinting ? ' · corriendo' : ''}${player.sneaking ? ' · agachada' : ''}`,
      t ? `Apuntando ${BLOCKS[t.id].label} (${t.x}, ${t.y}, ${t.z})` : 'Apuntando: nada',
      storage ? '💾 Guardado activado' : '💾 Sin guardado (navegador)',
    ]);
  }
}

requestAnimationFrame(frame);
