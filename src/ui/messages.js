// Mensajitos alegres con el nombre de Gina: bienvenida, buenos días y buenas
// noches, y ánimos de vez en cuando al construir o fabricar. Cortos, con iconos.

import { GINA } from '../config/gina.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const N = GINA.nombre;

const CHEERS = [`✨ ¡Genial, ${N}!`, `🌟 ¡Qué bonito!`, `💖 ¡Muy bien, ${N}!`, `🎉 ¡Hala, qué chulo!`, `👑 ¡Eres una artista!`];
const BUILDER = [`🏗️ ¡Gran constructora!`, `🏰 ¡Qué castillo más bonito, ${N}!`, `🧱 ¡Cuántos bloques!`];
const CHEER_EVERY = 25; // segundos como mínimo entre ánimos

export class Messages {
  constructor(hud) {
    this.hud = hud;
    this.lastCheer = -Infinity;
    this.placed = 0;
    this.wasNight = null;
    this.welcomed = false;
  }

  // Al empezar a jugar (una vez por partida abierta).
  welcome({ night, birthday }) {
    if (this.welcomed) return;
    this.welcomed = true;
    if (birthday) this.hud.toast(`🎂 ¡Feliz cumpleaños, ${N}! 🎉`);
    else this.hud.toast(night ? `🌙 ¡Hola, ${N}!` : `👑 ¡Hola, ${N}!`);
  }

  // Cambio de día a noche y al revés (con el sol).
  daylight(sunElevation) {
    const night = sunElevation < -0.1;
    const day = sunElevation > 0.05;
    if (this.wasNight === null) {
      this.wasNight = night;
      return;
    }
    if (night && !this.wasNight) {
      this.wasNight = true;
      this.hud.toast('🌙 ¡Mira los fuegos artificiales!');
    } else if (day && this.wasNight) {
      this.wasNight = false;
      this.hud.toast(`☀️ ¡Buenos días, ${N}!`);
    }
  }

  crafted() {
    this.#cheer(CHEERS, 0.5);
  }

  placedBlock() {
    if (++this.placed % 150 === 0) this.#cheer(BUILDER, 1);
  }

  #cheer(list, chance) {
    const now = performance.now() / 1000;
    if (now - this.lastCheer < CHEER_EVERY || Math.random() > chance) return;
    this.lastCheer = now;
    this.hud.toast(pick(list));
  }
}
