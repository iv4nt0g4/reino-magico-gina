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
};

const ACTIONS = {
  step: { gain: 0.22, dur: 1, pitch: 1 },
  place: { gain: 0.55, dur: 1.2, pitch: 0.85 },
  break: { gain: 0.75, dur: 1.8, pitch: 0.7 },
  land: { gain: 0.4, dur: 1.4, pitch: 0.8 },
};

export class Sounds {
  constructor(volume) {
    this.volume = volume;
    this.ctx = null;
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
