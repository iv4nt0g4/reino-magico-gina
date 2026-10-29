// Renderizador Three.js: escena, cámara en primera persona y ajuste al tamaño de la ventana.

import * as THREE from 'three';

// Plano lejano de la cámara: lo bastante lejos para el terreno visible y
// siempre más allá de la cúpula del cielo (150 bloques), aunque se vea poco.
export function cameraFar(viewDistance) {
  return Math.max(viewDistance + 64, 180);
}

export function createRenderer(container, settings) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene(); // el fondo lo pinta la cúpula del cielo (engine/sky.js)

  const viewDistance = (settings.renderDistance + 1) * 16;
  const camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.05, cameraFar(viewDistance));
  camera.rotation.order = 'YXZ'; // primero girar (yaw) y luego inclinar (pitch)

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera, viewDistance };
}
