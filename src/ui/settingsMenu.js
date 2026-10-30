// Menú de ajustes (⚙️ en la pausa): distancia de visión, sensibilidad del
// ratón, campo de visión, volumen, música y controles táctiles. Se guardan en
// este dispositivo (cada tablet u ordenador recuerda los suyos).

const KEY = 'reino-gina-ajustes';

export const DEFAULT_PREFERENCES = {
  distance: 'auto', // 'auto' o chunks (3–7)
  sensitivity: 1, // multiplica la sensibilidad base del ratón
  fov: 75,
  volume: 0.6,
  music: 0.35,
  touch: 'auto', // 'auto' (si se toca la pantalla), 'on' u 'off'
};

export function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return { ...DEFAULT_PREFERENCES, ...(saved && typeof saved === 'object' ? saved : {}) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function savePreferences(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // sin almacenamiento: valen hasta cerrar
  }
}

const percent = (v) => `${Math.round(v * 100)}%`;

export class SettingsMenu {
  // onChange(prefs): aplicar los ajustes en el juego.
  constructor(prefs, onChange) {
    this.prefs = prefs;
    this.onChange = onChange;
    this.panel = document.getElementById('settings');
    this.mainPanel = document.querySelector('#overlay > .panel');

    document.getElementById('settings-open').addEventListener('click', () => this.open());
    document.getElementById('settings-done').addEventListener('click', () => this.close());
    document.getElementById('settings-reset').addEventListener('click', () => {
      Object.assign(this.prefs, DEFAULT_PREFERENCES);
      this.#render();
      this.#changed();
    });

    this.#slider('sensitivity', (v) => `×${v.toFixed(1)}`);
    this.#slider('fov', (v) => `${v}°`);
    this.#slider('volume', percent);
    this.#slider('music', percent);
    this.#choice('distance', (v) => (v === 'auto' ? 'auto' : Number(v)));
    this.#choice('touch', (v) => v);
    this.#render();
  }

  open() {
    this.mainPanel.hidden = true;
    this.panel.hidden = false;
  }

  close() {
    this.panel.hidden = true;
    this.mainPanel.hidden = false;
  }

  #slider(name, format) {
    const input = document.getElementById(`set-${name}`);
    const output = input.nextElementSibling;
    input.addEventListener('input', () => {
      this.prefs[name] = Number(input.value);
      output.textContent = format(this.prefs[name]);
      this.#changed();
    });
    this[`render_${name}`] = () => {
      input.value = this.prefs[name];
      output.textContent = format(this.prefs[name]);
    };
  }

  #choice(name, parse) {
    const box = document.getElementById(`set-${name}`);
    box.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (!button) return;
      this.prefs[name] = parse(button.dataset.v);
      this[`render_${name}`]();
      this.#changed();
    });
    this[`render_${name}`] = () => {
      for (const b of box.children) b.classList.toggle('active', String(this.prefs[name]) === b.dataset.v);
    };
  }

  #render() {
    for (const name of Object.keys(DEFAULT_PREFERENCES)) this[`render_${name}`]?.();
  }

  #changed() {
    savePreferences(this.prefs);
    this.onChange(this.prefs);
  }
}
