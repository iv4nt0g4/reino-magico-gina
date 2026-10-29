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
    this.loadingLabel = document.getElementById('loading-label');
    this.crosshair = document.getElementById('crosshair');
    this.debug = document.getElementById('debug');
    this.underwater = document.getElementById('underwater');
    this.saved = document.getElementById('saved');

    this.title.textContent = GINA.tituloJuego;
    document.title = GINA.tituloJuego;
  }

  // Barra de carga, con un texto opcional (por ejemplo, mientras se construye el reino).
  setLoading(progress, label = '') {
    this.loadingBar.style.width = `${Math.round(progress * 100)}%`;
    this.loadingLabel.textContent = label;
  }

  // Botón de mundo nuevo en la pausa, con confirmación para no borrar sin querer.
  enableNewWorld(onConfirm) {
    const panel = document.getElementById('new-world');
    const ask = document.getElementById('new-world-ask');
    const confirm = document.getElementById('new-world-confirm');
    panel.hidden = false;
    ask.addEventListener('click', () => {
      ask.hidden = true;
      confirm.hidden = false;
    });
    document.getElementById('new-world-no').addEventListener('click', () => {
      ask.hidden = false;
      confirm.hidden = true;
    });
    document.getElementById('new-world-yes').addEventListener('click', onConfirm);
  }

  // Muestra el botón de jugar cuando el mundo cercano ya está listo.
  ready(onPlay) {
    this.loading.hidden = true;
    this.loadingLabel.textContent = '';
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
