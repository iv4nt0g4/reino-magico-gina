// Interfaz por encima del canvas: pantalla de inicio/pausa, carga, punto de
// mira y panel de depuración (F3).

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

  // Pausa (Esc) o jugando.
  setPlaying(playing) {
    this.overlay.hidden = playing;
    this.crosshair.hidden = !playing;
    this.playButton.textContent = '▶ Seguir';
  }

  toggleDebug() {
    this.debug.hidden = !this.debug.hidden;
  }

  updateDebug(lines) {
    if (!this.debug.hidden) this.debug.textContent = lines.join('\n');
  }
}
