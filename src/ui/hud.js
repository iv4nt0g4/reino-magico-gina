// Interfaz por encima del canvas: pantalla de inicio/pausa, carga, punto de
// mira y panel de depuración (F3). La barra rápida y el catálogo van aparte.

import { GINA } from '../config/gina.js';

export class Hud {
  constructor() {
    this.overlay = document.getElementById('overlay');
    this.title = document.getElementById('title');
    this.playButton = document.getElementById('play');
    this.loading = document.getElementById('loading');
    this.loadingBar = document.getElementById('loading-bar');
    this.crosshair = document.getElementById('crosshair');
    this.debug = document.getElementById('debug');
    this.underwater = document.getElementById('underwater');
    this.saved = document.getElementById('saved');

    this.title.textContent = GINA.tituloJuego;
    document.title = GINA.tituloJuego;
  }

  setLoading(progress) {
    this.loadingBar.style.width = `${Math.round(progress * 100)}%`;
  }

  // Muestra el botón de jugar cuando el mundo cercano ya está listo.
  ready(onPlay) {
    this.loading.hidden = true;
    this.playButton.hidden = false;
    this.playButton.addEventListener('click', onPlay);
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) onPlay();
    });
  }

  // Muestra la interfaz según el estado: 'playing', 'paused' o 'catalog'.
  setState(state) {
    this.overlay.hidden = state !== 'paused';
    this.crosshair.hidden = state !== 'playing';
    if (state === 'playing') this.playButton.textContent = '▶ Seguir'; // tras la primera partida
  }

  // Tinte azul al tener la cabeza bajo el agua.
  setUnderwater(underwater) {
    this.underwater.hidden = !underwater;
  }

  // Disquete un momento en la esquina al guardar.
  showSaved() {
    this.saved.classList.add('visible');
    clearTimeout(this.savedTimer);
    this.savedTimer = setTimeout(() => this.saved.classList.remove('visible'), 1200);
  }

  toggleDebug() {
    this.debug.hidden = !this.debug.hidden;
  }

  updateDebug(lines) {
    if (!this.debug.hidden) this.debug.textContent = lines.join('\n');
  }
}
