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
    this.toastEl = document.getElementById('toast');
    this.flash = document.getElementById('sparkle-flash');
    this.modeButtons = {
      creative: document.getElementById('mode-creative'),
      adventure: document.getElementById('mode-adventure'),
    };

    // Título con las letras dando saltitos, una detrás de otra.
    this.title.replaceChildren(
      ...[...GINA.tituloJuego].map((ch, i) => {
        const span = document.createElement('span');
        span.textContent = ch;
        span.style.animationDelay = `${i * 0.07}s`;
        return span;
      }),
    );
    document.title = GINA.tituloJuego;
    document.getElementById('subtitle').textContent = `✨ ¡Hola, ${GINA.nombre}! ✨`;
    // Estrellitas que suben por detrás del menú.
    const stars = document.getElementById('title-stars');
    for (let i = 0; i < 24; i++) {
      const star = document.createElement('span');
      star.textContent = ['✦', '★', '✧', '♥'][i % 4];
      star.style.left = `${(i * 37) % 100}%`;
      star.style.animationDelay = `${-(i * 0.9) % 9}s`;
      star.style.animationDuration = `${7 + (i % 5)}s`;
      star.style.fontSize = `${14 + (i * 7) % 18}px`;
      stars.appendChild(star);
    }
    this.confettiEl = document.getElementById('confetti');
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
    document.body.classList.toggle('paused', state === 'paused' || state === 'loading');
    this.crosshair.hidden = state !== 'playing';
    if (state === 'playing') this.playButton.textContent = '▶ Seguir'; // tras la primera partida
  }

  // Tinte azul al tener la cabeza bajo el agua.
  setUnderwater(underwater) {
    this.underwater.hidden = !underwater;
  }

  // Botones de modo (Creativo / Aventura) en la pausa.
  onModeChange(callback) {
    for (const [mode, button] of Object.entries(this.modeButtons)) button.addEventListener('click', () => callback(mode));
  }

  setMode(mode) {
    for (const [key, button] of Object.entries(this.modeButtons)) button.classList.toggle('active', key === mode);
  }

  // Mensaje corto y alegre en el centro de la pantalla.
  toast(text) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('visible'), 2200);
  }

  // Lluvia de confeti por toda la pantalla (cumpleaños).
  confetti() {
    const colors = ['#ff7cc4', '#ffd84d', '#7cd4ff', '#9dff9a', '#b59bff', '#ff9a6c'];
    this.confettiEl.replaceChildren(
      ...Array.from({ length: 80 }, (_, i) => {
        const piece = document.createElement('i');
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.background = colors[i % colors.length];
        piece.style.animationDelay = `${Math.random() * 1.5}s`;
        piece.style.animationDuration = `${2.5 + Math.random() * 2}s`;
        return piece;
      }),
    );
    this.confettiEl.hidden = false;
    clearTimeout(this.confettiTimer);
    this.confettiTimer = setTimeout(() => (this.confettiEl.hidden = true), 5000);
  }

  // Botón de la música en la pausa.
  onMusicToggle(enabled, callback) {
    const button = document.getElementById('music-toggle');
    const show = (on) => {
      button.textContent = on ? '🎵' : '🔇';
      button.classList.toggle('off', !on);
    };
    show(enabled);
    button.addEventListener('click', () => {
      enabled = !enabled;
      show(enabled);
      callback(enabled);
    });
  }

  // Destello de estrellitas al reaparecer.
  sparkle() {
    this.flash.hidden = false;
    this.flash.classList.remove('go');
    void this.flash.offsetWidth; // reinicia la animación
    this.flash.classList.add('go');
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => (this.flash.hidden = true), 1600);
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
