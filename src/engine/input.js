// Entrada de teclado y ratón (ordenador, o tablet con teclado y ratón).
//
// Para mirar alrededor se captura el ratón (pointer lock), como en cualquier
// juego en primera persona. Si el navegador no lo permite (algunas tablets),
// hay un plan B: se juega igual, se mira moviendo el ratón con el cursor
// oculto y, además, con las flechas del teclado, que funcionan siempre.

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'Space', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
]);
const LOCK_TIMEOUT_MS = 600; // si en este tiempo no se captura el ratón, plan B

export class Input {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.settings = settings;
    this.keys = new Set();
    this.buttons = new Set(); // botones del ratón pulsados (0 izq, 1 central, 2 der)
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.active = false; // el juego recibe los controles (ratón capturado o plan B)
    this.fallback = false; // jugando con el plan B (sin capturar el ratón)
    this.lockWorked = false; // la captura del ratón ha funcionado alguna vez
    this.lockFailed = false; // en este navegador no funciona: se usa siempre el plan B
    this.sprintTap = false; // doble pulsación de W detectada
    this.flyTap = false; // doble pulsación de Espacio detectada
    this.lastTap = {}; // código de tecla → instante de la última pulsación
    // Controles táctiles (ui/touch.js): joystick y botones que se suman al teclado.
    this.virtual = { forward: 0, strafe: 0, jump: false, sneak: false, sprint: false };

    // Avisos para el juego
    this.onToggleDebug = null;
    this.onLockChange = null; // (activo: boolean)
    this.onHotbarSelect = null; // (índice 0–8)
    this.onHotbarScroll = null; // (+1 / -1)
    this.onOpenCatalog = null;
    this.onMouseDown = null; // (botón)

    window.addEventListener('keydown', (e) => this.#keyDown(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.#releaseAll());
    document.addEventListener('mousemove', (e) => {
      if (!this.active) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    document.addEventListener('mousedown', (e) => {
      if (!this.active) return;
      // Tocar la barra rápida o los botones táctiles no rompe ni coloca bloques.
      if (e.target.closest?.('#hotbar, #touch')) return;
      e.preventDefault();
      this.buttons.add(e.button);
      this.onMouseDown?.(e.button);
    });
    document.addEventListener('mouseup', (e) => this.buttons.delete(e.button));
    document.addEventListener('contextmenu', (e) => this.active && e.preventDefault());
    document.addEventListener(
      'wheel',
      (e) => {
        if (!this.active || e.deltaY === 0) return;
        this.onHotbarScroll?.(Math.sign(e.deltaY));
      },
      { passive: true },
    );
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === canvas;
      if (locked) {
        this.lockWorked = true;
        this.#stopFallback(false);
        this.#setActive(true);
      } else if (!this.fallback) {
        this.#setActive(false);
      }
    });
  }

  #setActive(active) {
    if (this.active === active) return;
    this.active = active;
    if (!active) this.#releaseAll();
    this.onLockChange?.(active);
  }

  #releaseAll() {
    this.keys.clear();
    this.buttons.clear();
  }

  // Plan B: jugar sin capturar el ratón (el cursor se oculta mientras tanto).
  #startFallback() {
    this.fallback = true;
    document.body.classList.add('mouse-hidden');
    this.#setActive(true);
  }

  #stopFallback(notify = true) {
    if (!this.fallback) return;
    this.fallback = false;
    document.body.classList.remove('mouse-hidden');
    if (notify) this.#setActive(false);
  }

  // ¿Segunda pulsación rápida de la misma tecla?
  #doubleTap(code) {
    const now = performance.now();
    const isDouble = now - (this.lastTap[code] ?? -Infinity) < this.settings.doubleTapMs;
    this.lastTap[code] = isDouble ? -Infinity : now; // una triple pulsación no cuenta doble
    return isDouble;
  }

  #keyDown(e) {
    if (!this.active) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault(); // evita atajos del navegador (Ctrl+S, Espacio...)
    // Con el ratón capturado, Esc lo suelta el propio navegador; con el plan B, lo hacemos aquí.
    if (e.code === 'Escape' && this.fallback) {
      this.#stopFallback();
      return;
    }
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

  // Empieza a jugar: intenta capturar el ratón y, si este navegador no sabe
  // hacerlo, pasa al plan B. Devuelve una promesa que falla solo si la captura
  // ya funcionó antes y ahora el navegador la rechaza (por ejemplo, si se pide
  // justo después de salir con Esc): en ese caso basta con volver a hacer clic.
  requestLock() {
    if (!this.canvas.requestPointerLock || this.lockFailed) {
      this.#startFallback();
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const giveUp = (error) => {
        if (this.active) return resolve();
        if (this.lockWorked) return reject(error);
        this.lockFailed = true; // en este navegador no funciona: plan B a partir de ahora
        this.#startFallback();
        resolve();
      };
      const timer = setTimeout(() => giveUp(new Error('Sin captura del ratón')), LOCK_TIMEOUT_MS);
      try {
        Promise.resolve(this.canvas.requestPointerLock()).then(
          () => {
            clearTimeout(timer);
            resolve();
          },
          (error) => {
            clearTimeout(timer);
            giveUp(error);
          },
        );
      } catch (error) {
        clearTimeout(timer);
        giveUp(error);
      }
    });
  }

  // Deja de jugar (pausa o catálogo): suelta el ratón o sale del plan B.
  releaseLock() {
    if (document.pointerLockElement) document.exitPointerLock();
    else this.#stopFallback();
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
    const v = this.virtual;
    const clamp = (x) => Math.max(-1, Math.min(1, x));
    return {
      forward: clamp((forward ? 1 : 0) - (this.isDown('KeyS') ? 1 : 0) + v.forward),
      strafe: clamp((this.isDown('KeyD') ? 1 : 0) - (this.isDown('KeyA') ? 1 : 0) + v.strafe),
      jump: this.isDown('Space') || v.jump,
      sneak: this.isDown('ShiftLeft', 'ShiftRight') || v.sneak,
      sprint: this.sprintTap || this.isDown('ControlLeft', 'ControlRight') || v.sprint,
      flyToggle,
    };
  }

  // Giro con las flechas: (-1, 0, 1) en horizontal y en vertical.
  arrows() {
    return {
      turn: (this.isDown('ArrowLeft') ? 1 : 0) - (this.isDown('ArrowRight') ? 1 : 0),
      tilt: (this.isDown('ArrowUp') ? 1 : 0) - (this.isDown('ArrowDown') ? 1 : 0),
    };
  }

  consumeMouse() {
    const d = { x: this.mouseDX, y: this.mouseDY };
    this.mouseDX = this.mouseDY = 0;
    return d;
  }
}
