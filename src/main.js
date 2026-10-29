// Punto de entrada: monta el motor y ejecuta el bucle del juego.

import './style.css';
import { SETTINGS } from './config/settings.js';
import { createRenderer } from './engine/renderer.js';
import { createBlockMaterial, setFog } from './blocks/material.js';
import { ChunkManager } from './engine/chunks.js';
import { Input } from './engine/input.js';
import { Player } from './entities/player.js';
import { Hud } from './ui/hud.js';
import { CHUNK_SIZE } from './engine/constants.js';

const PHYSICS_DT = 1 / 60; // paso fijo de física
const MAX_STEPS = 5; // evita la "espiral de la muerte" si el juego va lento
const LOADING_RADIUS = 2; // chunks que deben verse antes de poder jugar

// Punto de aparición: el centro del mundo, o ?pos=x,z en la URL (depuración).
const [SPAWN_X, SPAWN_Z] = (new URLSearchParams(location.search).get('pos') ?? '0,0')
  .split(',')
  .map((v) => Math.floor(Number(v)) || 0);

const hud = new Hud();
const { renderer, scene, camera, viewDistance } = createRenderer(document.getElementById('game'), SETTINGS);
const material = createBlockMaterial();
setFog(material, SETTINGS.skyColor, viewDistance * 0.6, viewDistance);

const world = new ChunkManager(scene, material, SETTINGS);
const player = new Player(SETTINGS);
const input = new Input(renderer.domElement, SETTINGS);

let state = 'loading'; // loading → ready (pausa) ⇄ playing
let accumulator = 0;
let lastTime = performance.now();
let fps = 0, fpsFrames = 0, fpsTime = 0;

input.onToggleDebug = () => hud.toggleDebug();
input.onLockChange = (locked) => {
  if (state === 'loading') return;
  state = locked ? 'playing' : 'ready';
  hud.setPlaying(locked);
};

// Pedir confirmación antes de cerrar la pestaña (Ctrl+W está muy cerca de
// Ctrl+correr). En pantalla completa además se bloquean esas teclas.
window.addEventListener('beforeunload', (e) => {
  if (state !== 'loading') e.preventDefault();
});
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) navigator.keyboard?.lock?.(['KeyW', 'ControlLeft', 'ControlRight']).catch(() => {});
});

function startPlaying() {
  input.requestLock();
}

// Coloca al jugador sobre el suelo en el punto de aparición.
function spawn() {
  const top = world.topSolidY(SPAWN_X, SPAWN_Z);
  player.spawnAt(SPAWN_X + 0.5, top + 1, SPAWN_Z + 0.5);
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
    state = 'ready';
    hud.ready(startPlaying);
  }
}

// Punto cardinal hacia el que mira el jugador (norte = -Z).
function facing(yaw) {
  const names = ['norte', 'oeste', 'sur', 'este'];
  const i = Math.round(yaw / (Math.PI / 2));
  return names[((i % 4) + 4) % 4];
}

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
      accumulator += dt;
      let steps = 0;
      while (accumulator >= PHYSICS_DT && steps < MAX_STEPS) {
        player.step(PHYSICS_DT, input.state(), world);
        accumulator -= PHYSICS_DT;
        steps++;
      }
      if (steps === MAX_STEPS) accumulator = 0;
    }
    world.update(player.position.x, player.position.z);
  }

  // Cámara
  const eye = player.eyePosition(state === 'playing' ? accumulator / PHYSICS_DT : 1);
  camera.position.set(eye.x, eye.y, eye.z);
  camera.rotation.set(player.pitch, player.yaw, 0);
  const targetFov = SETTINGS.fov + (player.sprinting ? SETTINGS.sprintFovBoost : 0);
  if (Math.abs(camera.fov - targetFov) > 0.01) {
    camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-10 * dt));
    camera.updateProjectionMatrix();
  }

  renderer.render(scene, camera);

  // Panel de depuración (F3)
  fpsFrames++;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    fps = Math.round(fpsFrames / fpsTime);
    fpsFrames = fpsTime = 0;
    const p = player.position;
    const s = world.stats();
    hud.updateDebug([
      `${fps} fps`,
      `XYZ ${p.x.toFixed(2)} / ${p.y.toFixed(2)} / ${p.z.toFixed(2)}`,
      `Mirando ${facing(player.yaw)} (yaw ${((player.yaw * 180) / Math.PI).toFixed(0)}°)`,
      `Chunk ${Math.floor(p.x / CHUNK_SIZE)}, ${Math.floor(p.z / CHUNK_SIZE)}`,
      `Chunks ${s.meshes} dibujados / ${s.loaded} cargados`,
      `Triángulos ${s.triangles.toLocaleString('es')}`,
      `${player.onGround ? 'En el suelo' : 'En el aire'}${player.sprinting ? ' · corriendo' : ''}${player.sneaking ? ' · agachada' : ''}`,
    ]);
  }
}

requestAnimationFrame(frame);
