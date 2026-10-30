// Calidad automática: mide los fps mientras se juega y ajusta la resolución
// interna y la distancia de visión para que el juego vaya fluido también en
// una tablet. Recuerda el nivel elegido para la próxima vez (en este navegador).

const LEVELS = [
  { distance: 3, pixelRatio: 1 },
  { distance: 4, pixelRatio: 1 },
  { distance: 5, pixelRatio: 1.25 },
  { distance: 6, pixelRatio: 1.5 },
  { distance: 7, pixelRatio: 2 },
];
const WINDOW_SECONDS = 3; // cada cuánto se evalúa
const LOW_FPS = 40; // por debajo, se baja la calidad
const HIGH_FPS = 57; // por encima (dos veces seguidas), se sube
const RAISE_COOLDOWN = 20; // segundos sin subir tras haber bajado
const STORAGE_KEY = 'reino-magico-gina:calidad';

const isTablet = () => navigator.userAgentData?.mobile || /Android|iPad|iPhone|Mobile/i.test(navigator.userAgent);

export class QualityManager {
  // onDistance(chunks): cambiar la distancia de visión.
  constructor(renderer, onDistance) {
    this.renderer = renderer;
    this.onDistance = onDistance;
    this.level = this.#loadLevel() ?? (isTablet() ? 2 : LEVELS.length - 1);
    this.frames = 0;
    this.time = 0;
    this.goodWindows = 0;
    this.cooldown = 0;
    this.fixedDistance = null; // elegida en los ajustes (null = automática)
    this.appliedDistance = null;
  }

  get distance() {
    return this.fixedDistance ?? LEVELS[this.level].distance;
  }

  // Distancia de visión fija (o null para que se ajuste sola). La resolución
  // interna se sigue ajustando sola en los dos casos.
  setFixedDistance(distance) {
    this.fixedDistance = distance;
    this.apply();
  }

  // Aplica el nivel actual (al empezar y cada vez que cambia).
  apply() {
    const { pixelRatio } = LEVELS[this.level];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatio));
    if (this.distance !== this.appliedDistance) {
      this.appliedDistance = this.distance;
      this.onDistance(this.distance);
    }
  }

  // Llamar en cada fotograma mientras se juega.
  sample(dt) {
    this.frames++;
    this.time += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.time < WINDOW_SECONDS) return;
    const fps = this.frames / this.time;
    this.frames = 0;
    this.time = 0;

    if (fps < LOW_FPS && this.level > 0) {
      this.#change(-1);
      this.cooldown = RAISE_COOLDOWN;
      this.goodWindows = 0;
    } else if (fps > HIGH_FPS && this.level < LEVELS.length - 1 && this.cooldown === 0) {
      if (++this.goodWindows >= 2) this.#change(1);
    } else {
      this.goodWindows = 0;
    }
  }

  // Al pausar no se mide (y al volver se empieza la medida de cero).
  reset() {
    this.frames = 0;
    this.time = 0;
    this.goodWindows = 0;
  }

  #change(step) {
    this.level += step;
    this.goodWindows = 0;
    this.apply();
    try {
      localStorage.setItem(STORAGE_KEY, String(this.level));
    } catch {
      // sin almacenamiento local: se recalcula la próxima vez
    }
  }

  #loadLevel() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      const level = Number(raw);
      return Number.isInteger(level) && level >= 0 && level < LEVELS.length ? level : null;
    } catch {
      return null;
    }
  }
}
