// Controles táctiles opcionales (móvil, o tablet sin ratón):
//  - mitad izquierda: joystick que aparece donde se pone el dedo (andar; al
//    fondo hacia delante, correr)
//  - resto de la pantalla: arrastrar para mirar
//  - botones: saltar ⤴️, romper ⛏️ (mantener), colocar 🧱, agacharse/bajar ⬇️,
//    volar 🕊️ (en creativo), inventario 🎒 y pausa ⏸️
// En modo 'auto' aparecen al tocar la pantalla y se esconden al usar un ratón.

const JOY_RADIUS = 55; // píxeles
const LOOK_FACTOR = 3; // el dedo gira más que el ratón por píxel

export class TouchControls {
  // actions: { pause(), inventory(), canFly() }
  constructor(input, actions) {
    this.input = input;
    this.actions = actions;
    this.layer = document.getElementById('touch');
    this.base = document.getElementById('joy-base');
    this.knob = document.getElementById('joy-knob');
    this.flyButton = document.getElementById('t-fly');
    this.mode = 'auto';
    this.touchSeen = false; // en 'auto': el último gesto fue con el dedo
    this.playing = false;
    this.joy = null; // { id, x, y }
    this.looks = new Map(); // id → { x, y }
    this.pressed = new Map(); // id → botón

    // ¿Dedo o ratón? (solo para el modo automático)
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' && !this.touchSeen) {
        this.touchSeen = true;
        this.#refresh();
      }
    });
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse' && this.touchSeen && (e.movementX || e.movementY)) {
        this.touchSeen = false;
        this.#refresh();
      }
    });

    const opts = { passive: false };
    this.layer.addEventListener('touchstart', (e) => this.#start(e), opts);
    this.layer.addEventListener('touchmove', (e) => this.#move(e), opts);
    this.layer.addEventListener('touchend', (e) => this.#end(e), opts);
    this.layer.addEventListener('touchcancel', (e) => this.#end(e), opts);
  }

  setMode(mode) {
    this.mode = mode;
    this.#refresh();
  }

  // Solo se ven mientras se juega (no en la pausa ni en el inventario).
  setPlaying(playing) {
    this.playing = playing;
    if (!playing) this.#releaseAll();
    this.#refresh();
  }

  get enabled() {
    return this.mode === 'on' || (this.mode === 'auto' && this.touchSeen);
  }

  #refresh() {
    this.layer.hidden = !(this.enabled && this.playing);
    document.body.classList.toggle('touch', this.enabled);
    this.flyButton.hidden = !this.actions.canFly();
  }

  #start(e) {
    e.preventDefault(); // sin clics de ratón "de mentira" ni zoom
    for (const t of e.changedTouches) {
      const button = t.target.closest?.('[data-touch]');
      if (button) {
        this.pressed.set(t.identifier, button);
        button.classList.add('down');
        this.#press(button.dataset.touch, true);
      } else if (t.clientX < window.innerWidth * 0.4 && !this.joy) {
        this.joy = { id: t.identifier, x: t.clientX, y: t.clientY };
        this.base.style.left = `${t.clientX}px`;
        this.base.style.top = `${t.clientY}px`;
        this.base.hidden = false;
        this.#moveKnob(0, 0);
      } else {
        this.looks.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
    }
  }

  #move(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (this.joy?.id === t.identifier) {
        let dx = (t.clientX - this.joy.x) / JOY_RADIUS;
        let dy = (t.clientY - this.joy.y) / JOY_RADIUS;
        const len = Math.hypot(dx, dy);
        if (len > 1) {
          dx /= len;
          dy /= len;
        }
        this.#moveKnob(dx, dy);
        const v = this.input.virtual;
        // Una zona muerta pequeña para que no ande sola al apoyar el dedo.
        v.strafe = Math.abs(dx) > 0.25 ? dx : 0;
        v.forward = Math.abs(dy) > 0.25 ? -dy : 0;
        v.sprint = -dy > 0.92;
      }
      const look = this.looks.get(t.identifier);
      if (look) {
        this.input.mouseDX += (t.clientX - look.x) * LOOK_FACTOR;
        this.input.mouseDY += (t.clientY - look.y) * LOOK_FACTOR;
        look.x = t.clientX;
        look.y = t.clientY;
      }
    }
  }

  #end(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (this.joy?.id === t.identifier) this.#stopJoystick();
      this.looks.delete(t.identifier);
      const button = this.pressed.get(t.identifier);
      if (button) {
        this.pressed.delete(t.identifier);
        button.classList.remove('down');
        this.#press(button.dataset.touch, false);
      }
    }
  }

  #moveKnob(dx, dy) {
    this.knob.style.transform = `translate(calc(-50% + ${dx * JOY_RADIUS}px), calc(-50% + ${dy * JOY_RADIUS}px))`;
  }

  #stopJoystick() {
    this.joy = null;
    this.base.hidden = true;
    Object.assign(this.input.virtual, { forward: 0, strafe: 0, sprint: false });
  }

  // Botones: como las teclas y los botones del ratón equivalentes.
  #press(name, down) {
    const input = this.input;
    const v = input.virtual;
    if (name === 'jump') v.jump = down;
    else if (name === 'sneak') v.sneak = down;
    else if (name === 'break' || name === 'place') {
      const button = name === 'break' ? 0 : 2;
      if (down) {
        input.buttons.add(button);
        input.onMouseDown?.(button);
      } else {
        input.buttons.delete(button);
      }
    } else if (down && name === 'fly') input.flyTap = true;
    else if (down && name === 'inventory') this.actions.inventory();
    else if (down && name === 'pause') this.actions.pause();
  }

  #releaseAll() {
    this.#stopJoystick();
    this.looks.clear();
    for (const [, button] of this.pressed) {
      button.classList.remove('down');
      this.#press(button.dataset.touch, false);
    }
    this.pressed.clear();
    Object.assign(this.input.virtual, { jump: false, sneak: false });
  }

  // Al cambiar de modo de juego (el botón de volar solo en creativo).
  refresh() {
    this.#refresh();
  }
}
