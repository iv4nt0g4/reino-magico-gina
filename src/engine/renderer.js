// Renderizador Three.js: escena, cámara en primera persona y ajuste al tamaño de la ventana.

import * as THREE from 'three';

export function createRenderer(container, settings) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene(); // el fondo lo pinta la cúpula del cielo (engine/sky.js)

  const viewDistance = (settings.renderDistance + 1) * 16;
  const camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.05, viewDistance + 64);
  camera.rotation.order = 'YXZ'; // primero girar (yaw) y luego inclinar (pitch)

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera, viewDistance };
}
