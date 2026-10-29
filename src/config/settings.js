// Ajustes técnicos del juego. Los valores de física imitan las sensaciones
// del género (unidades: bloques y segundos).
export const SETTINGS = {
  // Mundo
  seed: 20260729,
  renderDistance: 7, // en chunks (objetivo 6–8)
  unloadMargin: 2, // chunks extra antes de descargar
  maxChunkJobs: 6, // trabajos simultáneos en los workers
  workerCount: Math.max(2, Math.min(4, (navigator.hardwareConcurrency || 4) - 1)),

  // Cámara
  fov: 75,
  sprintFovBoost: 10,
  mouseSensitivity: 0.0022,

  // Física del jugador
  gravity: 32,
  terminalVelocity: 78,
  jumpHeight: 1.25,
  walkSpeed: 4.317,
  sprintSpeed: 5.612,
  sneakSpeed: 1.31,
  groundControl: 18, // rapidez con la que se alcanza la velocidad deseada en el suelo
  airControl: 4, // ...y en el aire (menos control, como en el original)
  sneakEyeDrop: 0.3, // cuánto baja la cámara al agacharse
  doubleTapMs: 300,

  // Cielo (fase 1: color fijo; el ciclo día/noche llega en la fase 3)
  skyColor: 0x9fd8ff,
};
