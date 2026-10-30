// Música suave de fondo, sintetizada al momento (nunca se repite igual):
// una cajita de música que toca arpegios sobre cuatro acordes alegres, con un
// bajo muy suave. De noche va más despacio, más grave y más bajito.
// También sabe tocar "Cumpleaños feliz" (melodía tradicional, de dominio público).

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // número MIDI → hercios

// Acordes (notas MIDI): Do, La menor, Fa, Sol.
const CHORDS = [
  [60, 64, 67],
  [57, 60, 64],
  [53, 57, 60],
  [55, 59, 62],
];
const BEATS_PER_CHORD = 8;

// Cumpleaños feliz: [nota MIDI, duración en tiempos].
const BIRTHDAY = [
  [67, 0.75], [67, 0.25], [69, 1], [67, 1], [72, 1], [71, 2],
  [67, 0.75], [67, 0.25], [69, 1], [67, 1], [74, 1], [72, 2],
  [67, 0.75], [67, 0.25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2],
  [77, 0.75], [77, 0.25], [76, 1], [72, 1], [74, 1], [72, 3],
];

export class Music {
  constructor(sounds, volume) {
    this.sounds = sounds;
    this.volume = volume;
    this.enabled = true;
    this.night = 0; // 0 de día, 1 de noche (cambia el ritmo y el tono)
    this.out = null;
    this.nextTime = 0;
    this.beat = 0;
    this.lastNote = 64;
    this.timer = null;
  }

  // Empieza a sonar (tras el primer gesto, cuando ya hay audio).
  start() {
    const ctx = this.sounds.ctx;
    if (!ctx || this.out) return;
    this.out = ctx.createGain();
    this.out.gain.value = this.enabled ? this.volume : 0;
    this.out.connect(this.sounds.master);
    this.nextTime = ctx.currentTime + 0.5;
    this.timer = setInterval(() => this.#schedule(), 120);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!this.out) return;
    const ctx = this.sounds.ctx;
    this.out.gain.cancelScheduledValues(ctx.currentTime);
    this.out.gain.setTargetAtTime(enabled ? this.volume : 0, ctx.currentTime, 0.4);
  }

  // Programa las notas del próximo medio segundo (así no se corta aunque el juego vaya lento).
  #schedule() {
    const ctx = this.sounds.ctx;
    if (!this.enabled || ctx.state !== 'running') {
      this.nextTime = Math.max(this.nextTime, ctx.currentTime + 0.1);
      return;
    }
    if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.05; // tras una pausa larga
    const beatLength = 60 / (84 - 22 * this.night); // tempo: 84 de día, 62 de noche
    while (this.nextTime < ctx.currentTime + 0.5) {
      this.#playBeat(this.nextTime, beatLength);
      this.nextTime += beatLength;
      this.beat++;
    }
  }

  #playBeat(t, beatLength) {
    const chord = CHORDS[Math.floor(this.beat / BEATS_PER_CHORD) % CHORDS.length];
    const inBar = this.beat % BEATS_PER_CHORD;
    const shift = this.night > 0.5 ? -12 : 0; // de noche, una octava más grave
    // Bajo: la nota del acorde al empezar cada acorde.
    if (inBar === 0) this.#tone(NOTE(chord[0] - 24 + shift), t, beatLength * 6, 'triangle', 0.09);
    // Cajita de música: notas del acorde que suben y bajan, con algún silencio al final de la frase.
    const rest = inBar === BEATS_PER_CHORD - 1 ? 0.6 : 0.15 + this.night * 0.25;
    if (Math.random() < rest) return;
    const options = [...chord, chord[0] + 12, chord[1] + 12];
    const near = options.filter((n) => Math.abs(n - this.lastNote) <= 7);
    const note = (near.length ? near : options)[Math.floor(Math.random() * (near.length || options.length))];
    this.lastNote = note;
    this.#bell(NOTE(note + 12 + shift), t, 0.11);
    // A veces, una notita de adorno a medio tiempo.
    if (Math.random() < 0.18 - this.night * 0.12) this.#bell(NOTE(options[Math.floor(Math.random() * options.length)] + 12 + shift), t + beatLength / 2, 0.06);
  }

  // Campanita de cajita de música: tono puro con un armónico y caída larga.
  #bell(freq, t, gain) {
    this.#tone(freq, t, 1.4, 'sine', gain);
    this.#tone(freq * 2, t, 0.5, 'sine', gain * 0.25);
  }

  #tone(freq, t, dur, wave, gain, out = this.out) {
    const ctx = this.sounds.ctx;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // "Cumpleaños feliz" con la cajita de música (suena aunque la música esté apagada).
  birthdaySong() {
    const ctx = this.sounds.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const beat = 0.42;
    let t = ctx.currentTime + 0.2;
    for (const [note, length] of BIRTHDAY) {
      this.#tone(NOTE(note + 12), t, 1.2, 'sine', 0.16, this.sounds.master);
      this.#tone(NOTE(note), t, 0.8, 'triangle', 0.05, this.sounds.master);
      t += length * beat;
    }
    // Mientras suena, la música de fondo baja casi del todo.
    if (this.out && this.enabled) {
      this.out.gain.setTargetAtTime(this.volume * 0.15, ctx.currentTime, 0.2);
      this.out.gain.setTargetAtTime(this.volume, t, 0.8);
    }
  }
}
