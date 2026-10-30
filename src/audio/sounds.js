// Sonidos sintetizados con Web Audio API (nada de archivos de audio).
// Cada material tiene una "receta": ruido filtrado y/o un tono corto.
// Las acciones (paso, colocar, romper, aterrizar) cambian volumen, duración y tono.

const RECIPES = {
  grass: { noise: { type: 'lowpass', freq: 1800, q: 0.7 }, dur: 0.12 },
  gravel: { noise: { type: 'bandpass', freq: 900, q: 1.2 }, dur: 0.12, gain: 1.8 },
  stone: { noise: { type: 'bandpass', freq: 2200, q: 2.5 }, tone: { freq: 180, wave: 'triangle' }, dur: 0.08 },
  sand: { noise: { type: 'highpass', freq: 2500, q: 0.5 }, dur: 0.15, gain: 0.6 },
  wood: { noise: { type: 'bandpass', freq: 700, q: 2 }, tone: { freq: 260, wave: 'sine' }, dur: 0.1 },
  snow: { noise: { type: 'lowpass', freq: 900, q: 0.8 }, dur: 0.18, gain: 2.2 },
  glass: { tone: { freq: 1900, wave: 'sine', harmonic: 1.5 }, noise: { type: 'highpass', freq: 5000, q: 0.5 }, dur: 0.22, gain: 0.5 },
  wool: { noise: { type: 'lowpass', freq: 600, q: 0.6 }, dur: 0.1, gain: 2 },
  water: { noise: { type: 'lowpass', freq: 1100, q: 0.9 }, tone: { freq: 420, wave: 'sine' }, dur: 0.3, gain: 1.4 },
};

const ACTIONS = {
  step: { gain: 0.22, dur: 1, pitch: 1 },
  place: { gain: 0.55, dur: 1.2, pitch: 0.85 },
  break: { gain: 0.75, dur: 1.8, pitch: 0.7 },
  land: { gain: 0.4, dur: 1.4, pitch: 0.8 },
  splash: { gain: 0.6, dur: 2, pitch: 0.9 },
};

export class Sounds {
  constructor(volume) {
    this.volume = volume;
    this.ctx = null;
  }

  setVolume(volume) {
    this.volume = volume;
    if (this.master) this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
  }

  // El navegador solo deja crear audio tras un gesto de la jugadora (clic en Jugar).
  unlock() {
    if (this.ctx) return this.ctx.resume();
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    // Un segundo de ruido blanco reutilizable.
    const length = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }

  // "Pío" tierno de Brotis: dos notitas que suben, como un pajarito.
  chirp() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const base = 900 + Math.random() * 300;
    [0, 0.13].forEach((delay, i) => {
      const t = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base * (1 + i * 0.25), t);
      osc.frequency.exponentialRampToValueAtTime(base * (1.5 + i * 0.3), t + 0.09);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(0.25, t + 0.015);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(env).connect(this.master);
      osc.start(t);
      osc.stop(t + 0.14);
    });
  }

  // Voz sintetizada: un tono que va de `from` a `to` (pasando por `mid` si
  // se da), con vibrato o temblor opcionales, filtrado y con envolvente suave.
  #voice({ wave = 'sine', from, mid, to, dur, vibrato, tremolo, filter, gain, delay = 0 }, volume) {
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(from, t);
    if (mid) osc.frequency.linearRampToValueAtTime(mid, t + dur * 0.4);
    osc.frequency.linearRampToValueAtTime(to, t + dur);
    let node = osc;
    if (vibrato) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = vibrato.rate;
      depth.gain.value = vibrato.depth;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = filter.type ?? 'lowpass';
      f.frequency.value = filter.freq;
      f.Q.value = filter.q ?? 1;
      node = node.connect(f);
    }
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain * volume, t + Math.min(0.04, dur / 4));
    env.gain.setValueAtTime(gain * volume, t + dur * 0.7);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (tremolo) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = tremolo;
      depth.gain.value = gain * volume * 0.5;
      lfo.connect(depth).connect(env.gain);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    node.connect(env).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // Sonido tierno de cada animalito.
  animal(kind, volume = 1) {
    if (!this.ctx || this.ctx.state !== 'running' || volume <= 0.02) return;
    const voices = {
      conejo: [{ from: 1700, to: 2300, dur: 0.07, gain: 0.08 }, { from: 1800, to: 2400, dur: 0.07, gain: 0.08, delay: 0.1 }],
      oveja: [{ wave: 'sawtooth', from: 400, to: 360, dur: 0.6, vibrato: { rate: 7, depth: 25 }, filter: { freq: 1300 }, gain: 0.12 }],
      pato: [0, 0.2].map((delay) => ({ wave: 'square', from: 560, to: 420, dur: 0.15, filter: { type: 'bandpass', freq: 950, q: 3 }, gain: 0.18, delay })),
      gato: [{ wave: 'triangle', from: 520, mid: 900, to: 600, dur: 0.5, filter: { freq: 2200 }, gain: 0.14 }],
      poni: [{ wave: 'sawtooth', from: 760, to: 520, dur: 0.7, vibrato: { rate: 10, depth: 70 }, filter: { freq: 1600 }, gain: 0.07 }],
      capibara: [{ from: 620, to: 700, dur: 0.35, tremolo: 18, gain: 0.16 }, { from: 680, to: 760, dur: 0.25, tremolo: 18, gain: 0.12, delay: 0.38 }],
    };
    for (const v of voices[kind] ?? []) this.#voice(v, volume);
  }

  // "Plin" al recoger un bloque del suelo (un poco distinto cada vez).
  pickup(volume = 1) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const f = 900 + Math.random() * 300;
    this.#voice({ wave: 'triangle', from: f, to: f * 1.5, dur: 0.09, gain: 0.08 }, volume);
  }

  // Campanitas al fabricar algo: tres notas que suben.
  craft(volume = 1) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    [660, 830, 990].forEach((f, i) => this.#voice({ wave: 'sine', from: f, to: f, dur: 0.22, gain: 0.1, delay: i * 0.08 }, volume));
  }

  // Magia al reaparecer o cambiar de modo: un arpegio brillante.
  magic(volume = 1) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      this.#voice({ wave: 'triangle', from: f, to: f * 1.01, dur: 0.35, tremolo: 12, gain: 0.07, delay: i * 0.07 }, volume),
    );
  }

  // Silbidito de un cohete que sube (muy suave).
  whistle(volume = 1) {
    if (!this.ctx || this.ctx.state !== 'running' || volume <= 0.02) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 1);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.04 * volume, t + 0.1);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    osc.connect(env).connect(this.master);
    osc.start(t);
    osc.stop(t + 1.2);
  }

  // Estallido suave de un fuego artificial: un "pum" grave y amortiguado y
  // unos tintineos agudos, como chispitas.
  pop(volume = 1) {
    if (!this.ctx || this.ctx.state !== 'running' || volume <= 0.02) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.35 * volume, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    src.connect(filter).connect(env).connect(this.master);
    src.start(t, Math.random() * 0.3, 0.8);
    for (let i = 0; i < 4; i++) {
      const tt = t + 0.15 + i * 0.09 + Math.random() * 0.05;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 1800 + Math.random() * 1600;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(0.03 * volume, tt + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.25);
      osc.connect(g).connect(this.master);
      osc.start(tt);
      osc.stop(tt + 0.3);
    }
  }

  // Reproduce el sonido de un material ('stone', 'wood'...) para una acción.
  play(material, action, intensity = 1) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const recipe = RECIPES[material] ?? RECIPES.stone;
    const act = ACTIONS[action];
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const dur = recipe.dur * act.dur;
    const variation = 0.9 + Math.random() * 0.2; // cada golpe suena un poco distinto
    const peak = act.gain * (recipe.gain ?? 1) * intensity;

    // Envolvente: ataque rápido y caída exponencial.
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(peak, now + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    env.connect(this.master);

    if (recipe.noise) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.playbackRate.value = variation;
      const filter = ctx.createBiquadFilter();
      filter.type = recipe.noise.type;
      filter.frequency.value = recipe.noise.freq * act.pitch * variation;
      filter.Q.value = recipe.noise.q;
      src.connect(filter).connect(env);
      src.start(now, Math.random() * 0.5, dur + 0.05);
    }
    if (recipe.tone) {
      const freqs = [recipe.tone.freq];
      if (recipe.tone.harmonic) freqs.push(recipe.tone.freq * recipe.tone.harmonic);
      for (const f of freqs) {
        const osc = ctx.createOscillator();
        osc.type = recipe.tone.wave;
        osc.frequency.setValueAtTime(f * act.pitch * variation, now);
        osc.frequency.exponentialRampToValueAtTime(f * act.pitch * variation * 0.7, now + dur);
        const g = ctx.createGain();
        g.gain.value = 0.5 / freqs.length;
        osc.connect(g).connect(env);
        osc.start(now);
        osc.stop(now + dur + 0.05);
      }
    }
  }
}
