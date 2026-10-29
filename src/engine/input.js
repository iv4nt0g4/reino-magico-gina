// Entrada de teclado y ratón (escritorio). El ratón usa pointer lock para
// mirar alrededor como en un juego en primera persona.

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'Space', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
]);

export class Input {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.settings = settings;
    this.keys = new Set();
    this.buttons = new Set(); // botones del ratón pulsados (0 izq, 1 central, 2 der)
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.locked = false;
    this.sprintTap = false; // doble pulsación de W detectada
    this.flyTap = false; // doble pulsación de Espacio detectada
    this.lastTap = {}; // código de tecla → instante de la última pulsación

    // Avisos para el juego
    this.onToggleDebug = null;
    this.onLockChange = null;
    this.onHotbarSelect = null; // (índice 0–8)
    this.onHotbarScroll = null; // (+1 / -1)
    this.onOpenCatalog = null;
    this.onMouseDown = null; // (botón)

    window.addEventListener('keydown', (e) => this.#keyDown(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.#releaseAll());
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    document.addEventListener('mousedown', (e) => {
      if (!this.locked) return;
      e.preventDefault();
      this.buttons.add(e.button);
      this.onMouseDown?.(e.button);
    });
    document.addEventListener('mouseup', (e) => this.buttons.delete(e.button));
    document.addEventListener('contextmenu', (e) => this.locked && e.preventDefault());
    document.addEventListener(
      'wheel',
      (e) => {
        if (!this.locked || e.deltaY === 0) return;
        this.onHotbarScroll?.(Math.sign(e.deltaY));
      },
      { passive: true },
    );
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (!this.locked) this.#releaseAll();
      this.onLockChange?.(this.locked);
    });
  }

  #releaseAll() {
    this.keys.clear();
    this.buttons.clear();
  }

  // ¿Segunda pulsación rápida de la misma tecla?
  #doubleTap(code) {
    const now = performance.now();
    const isDouble = now - (this.lastTap[code] ?? -Infinity) < this.settings.doubleTapMs;
    this.lastTap[code] = isDouble ? -Infinity : now; // una triple pulsación no cuenta doble
    return isDouble;
  }

  #keyDown(e) {
    if (!this.locked) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault(); // evita atajos del navegador (Ctrl+S, Espacio...)
    if (e.code === 'F3') {
      e.preventDefault();
      this.onToggleDebug?.();
    }
    if (!e.repeat) {
      if (e.code === 'KeyW' && this.#doubleTap('KeyW')) this.sprintTap = true;
      if (e.code === 'Space' && this.#doubleTap('Space')) this.flyTap = true;
      if (e.code === 'KeyE') {
        // Que esta misma pulsación no llegue al catálogo (lo cerraría al instante).
        e.stopImmediatePropagation();
        this.onOpenCatalog?.();
      }
      if (/^Digit[1-9]$/.test(e.code)) this.onHotbarSelect?.(Number(e.code.slice(5)) - 1);
    }
    this.keys.add(e.code);
  }

  // Captura el ratón. Devuelve una promesa que falla si el navegador no lo
  // permite (por ejemplo, si se pide demasiado pronto tras salir con Esc).
  requestLock() {
    try {
      return Promise.resolve(this.canvas.requestPointerLock());
    } catch (e) {
      return Promise.reject(e);
    }
  }

  releaseLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  isDown(...codes) {
    return codes.some((c) => this.keys.has(c));
  }

  // Estado de controles para un paso de física.
  state() {
    const forward = this.isDown('KeyW');
    if (!forward) this.sprintTap = false;
    const flyToggle = this.flyTap;
    this.flyTap = false;
    return {
      forward: (forward ? 1 : 0) - (this.isDown('KeyS') ? 1 : 0),
      strafe: (this.isDown('KeyD') ? 1 : 0) - (this.isDown('KeyA') ? 1 : 0),
      jump: this.isDown('Space'),
      sneak: this.isDown('ShiftLeft', 'ShiftRight'),
      sprint: this.sprintTap || this.isDown('ControlLeft', 'ControlRight'),
      flyToggle,
    };
  }

  consumeMouse() {
    const d = { x: this.mouseDX, y: this.mouseDY };
    this.mouseDX = this.mouseDY = 0;
    return d;
  }
}
