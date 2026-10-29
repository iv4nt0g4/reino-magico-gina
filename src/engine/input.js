// Entrada de teclado y ratón (escritorio). El ratón usa pointer lock para
// mirar alrededor como en un juego en primera persona.

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
]);

export class Input {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.settings = settings;
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.locked = false;
    this.sprintTap = false; // doble pulsación de W detectada
    this.lastWTime = 0;
    this.onToggleDebug = null;
    this.onLockChange = null;

    window.addEventListener('keydown', (e) => this.#keyDown(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (!this.locked) this.keys.clear();
      this.onLockChange?.(this.locked);
    });
  }

  #keyDown(e) {
    if (!this.locked) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault(); // evita atajos del navegador (Ctrl+S, Espacio...)
    if (e.code === 'F3') {
      e.preventDefault();
      this.onToggleDebug?.();
    }
    if (e.code === 'KeyW' && !e.repeat) {
      const now = performance.now();
      if (now - this.lastWTime < this.settings.doubleTapMs) this.sprintTap = true;
      this.lastWTime = now;
    }
    this.keys.add(e.code);
  }

  requestLock() {
    // En Chrome devuelve una promesa que falla si se pide demasiado pronto
    // tras salir con Esc; en ese caso basta con volver a hacer clic.
    const result = this.canvas.requestPointerLock();
    result?.catch?.(() => {});
  }

  isDown(...codes) {
    return codes.some((c) => this.keys.has(c));
  }

  // Estado de controles para un paso de física.
  state() {
    const forward = this.isDown('KeyW');
    if (!forward) this.sprintTap = false;
    return {
      forward: (forward ? 1 : 0) - (this.isDown('KeyS') ? 1 : 0),
      strafe: (this.isDown('KeyD') ? 1 : 0) - (this.isDown('KeyA') ? 1 : 0),
      jump: this.isDown('Space'),
      sneak: this.isDown('ShiftLeft', 'ShiftRight'),
      sprint: this.sprintTap || this.isDown('ControlLeft', 'ControlRight'),
    };
  }

  consumeMouse() {
    const d = { x: this.mouseDX, y: this.mouseDY };
    this.mouseDX = this.mouseDY = 0;
    return d;
  }
}
