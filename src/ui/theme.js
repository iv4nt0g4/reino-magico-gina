// Temas de color de la interfaz (menús, barra rápida, botones). Por defecto,
// el color favorito de Gina (config/gina.js); en la pausa se puede elegir otro
// y se recuerda en este dispositivo.

import { GINA } from '../config/gina.js';

export const THEMES = {
  rosa: {
    icon: '#ff5fae',
    vars: { c1: '#ff5fae', c2: '#ffa3d4', deep: '#d63d8c', title: '#e0338f', glow: '#ffd6ec', soft: '#ffe6f3', soft2: '#fff3f9', line: '#f6c6df', text: '#8a3366', sel: 'rgba(255, 110, 190, 0.5)', veil1: 'rgba(255, 214, 236, 0.6)', veil2: 'rgba(240, 120, 190, 0.5)' },
  },
  morado: {
    icon: '#a774ff',
    vars: { c1: '#b07cff', c2: '#ff9ad5', deep: '#7a4fc9', title: '#8a4fd6', glow: '#e6d6ff', soft: '#f1e3ff', soft2: '#f7f0ff', line: '#d7c4f2', text: '#5a3a7a', sel: 'rgba(180, 140, 255, 0.5)', veil1: 'rgba(225, 210, 255, 0.55)', veil2: 'rgba(120, 90, 200, 0.55)' },
  },
  celeste: {
    icon: '#4fb8ff',
    vars: { c1: '#4fb8ff', c2: '#8fe3ff', deep: '#2a7fc0', title: '#2f86d6', glow: '#d6efff', soft: '#e3f4ff', soft2: '#f2faff', line: '#bfe0f6', text: '#2d5a80', sel: 'rgba(110, 190, 255, 0.5)', veil1: 'rgba(210, 240, 255, 0.55)', veil2: 'rgba(80, 140, 220, 0.5)' },
  },
  verde: {
    icon: '#4fcf8a',
    vars: { c1: '#4fcf8a', c2: '#b4f06c', deep: '#2f9a5c', title: '#2e9a5e', glow: '#d9f7e4', soft: '#e5f8ec', soft2: '#f3fcf6', line: '#bfe8cf', text: '#2f6648', sel: 'rgba(110, 220, 150, 0.5)', veil1: 'rgba(215, 248, 225, 0.55)', veil2: 'rgba(70, 170, 110, 0.5)' },
  },
};

const KEY = 'reino-gina-tema';
const NAMES = { c1: '--c1', c2: '--c2', deep: '--c-deep', title: '--c-title', glow: '--c-glow', soft: '--c-soft', soft2: '--c-soft2', line: '--c-line', text: '--c-text', sel: '--c-sel', veil1: '--c-veil1', veil2: '--c-veil2' };

export function savedTheme() {
  try {
    const t = localStorage.getItem(KEY);
    if (THEMES[t]) return t;
  } catch {
    // sin almacenamiento: el de siempre
  }
  return THEMES[GINA.colorFavorito] ? GINA.colorFavorito : 'rosa';
}

export function applyTheme(key, remember = false) {
  const theme = THEMES[key] ?? THEMES.rosa;
  for (const [k, v] of Object.entries(theme.vars)) document.documentElement.style.setProperty(NAMES[k], v);
  if (remember) {
    try {
      localStorage.setItem(KEY, key);
    } catch {
      // da igual: solo no se recordará
    }
  }
}

// Botones de colores en la pausa.
export function themePicker(container, onPick) {
  const buttons = Object.entries(THEMES).map(([key, theme]) => {
    const b = document.createElement('button');
    b.className = 'theme-dot';
    b.title = key;
    b.style.background = theme.icon;
    b.addEventListener('click', () => {
      applyTheme(key, true);
      mark(key);
      onPick?.(key);
    });
    container.appendChild(b);
    return [key, b];
  });
  const mark = (current) => buttons.forEach(([key, b]) => b.classList.toggle('active', key === current));
  mark(savedTheme());
}
