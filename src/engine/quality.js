// Calidad automática: mide los fps mientras se juega y ajusta la resolución
// interna y la distancia de visión para que el juego vaya fluido también en
// una tablet. Recuerda el nivel elegido para la próxima vez (en este navegador).

// De peor a mejor. Primero se baja la resolución interna (casi no se nota con
// texturas pixel art) y solo al final la distancia de visión, para que el
// paisaje siga viéndose lejos y sin tanta niebla.
const LEVELS = [
  { distance: 3, pixelRatio: 0.75 },
  { distance: 4, pixelRatio: 0.8 },
  { distance: 5, pixelRatio: 0.85 },
  { distance: 6, pixelRatio: 0.9 },
  { distance: 7, pixelRatio: 0.9 },
  { distance: 7, pixelRatio: 1 },
  { distance: 7, pixelRatio: 1.25 },
  { distance: 7, pixelRatio: 1.5 },
];
const WINDOW_SECONDS = 2; // cada cuánto se evalúa
const LOW_FPS = 45; // por debajo, se baja la calidad
const HIGH_FPS = 57; // por encima (tres veces seguidas), se sube
const RAISE_COOLDOWN = 30; // segundos sin subir tras haber bajado
const STORAGE_KEY = 'reino-magico-gina:calidad2';

const isTablet = () => navigator.userAgentData?.mobile || /Android|iPad|iPhone|Mobile/i.test(navigator.userAgent);

export class QualityManager {
  // onDistance(chunks): cambiar la distancia de visión.
  constructor(renderer, onDistance) {
    this.renderer = renderer;
    this.onDistance = onDistance;
    this.level = this.#loadLevel() ?? (isTablet() ? 3 : 5);
    // Nivel más alto que ha ido bien: si uno fue lento, no se vuelve a subir a
    // él (así no se sube y se baja sin parar, recargando paisaje cada vez).
    this.ceiling = LEVELS.length - 1;
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
      this.ceiling = this.level - 1;
      // Muy lento: baja dos niveles de golpe.
      this.#change(fps < LOW_FPS * 0.6 && this.level > 1 ? -2 : -1);
      this.cooldown = RAISE_COOLDOWN;
      this.goodWindows = 0;
    } else if (fps > HIGH_FPS && this.level < this.ceiling && this.cooldown === 0) {
      if (++this.goodWindows >= 3) this.#change(1);
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
