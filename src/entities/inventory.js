// Lo que lleva Gina: huecos con montones de bloques ({ id, count }).
// Los 9 primeros son la barra rápida; en la Aventura suave hay 27 más (la
// mochila). En creativo los bloques no se gastan (`infinite`).

export const STACK = 64; // bloques por hueco como mucho

export class Inventory {
  constructor(size, { infinite = false } = {}) {
    this.slots = new Array(size).fill(null);
    this.infinite = infinite;
    this.listeners = new Set(); // avisos al cambiar (barra rápida, pantalla de inventario)
  }

  changed() {
    for (const listener of this.listeners) listener();
  }

  // Cuántos bloques de `ids` (un id o un conjunto) hay en total.
  count(ids) {
    const match = typeof ids === 'number' ? (id) => id === ids : (id) => ids.has(id);
    return this.slots.reduce((n, s) => n + (s && match(s.id) ? s.count : 0), 0);
  }

  // ¿Cabe al menos uno de este bloque?
  canAdd(id) {
    return this.slots.some((s) => !s || (s.id === id && s.count < STACK));
  }

  // Añade bloques: primero completa montones del mismo bloque y luego usa
  // huecos vacíos (la barra rápida antes que la mochila). Devuelve los que no caben.
  add(id, count = 1) {
    let left = count;
    for (const s of this.slots) {
      if (left === 0) break;
      if (s && s.id === id && s.count < STACK) {
        const n = Math.min(left, STACK - s.count);
        s.count += n;
        left -= n;
      }
    }
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      if (this.slots[i]) continue;
      const n = Math.min(left, STACK);
      this.slots[i] = { id, count: n };
      left -= n;
    }
    if (left !== count) this.changed();
    return left;
  }

  // Quita `count` bloques de `ids` (un id o un conjunto); devuelve los ids quitados.
  remove(ids, count = 1) {
    const match = typeof ids === 'number' ? (id) => id === ids : (id) => ids.has(id);
    const taken = [];
    // Primero de la mochila, para no vaciar la barra rápida si se puede.
    const order = [...this.slots.keys()].sort((a, b) => (a < 9) - (b < 9));
    for (const i of order) {
      const s = this.slots[i];
      while (s && match(s.id) && s.count > 0 && taken.length < count) {
        s.count--;
        taken.push(s.id);
      }
      if (s && s.count === 0) this.slots[i] = null;
      if (taken.length === count) break;
    }
    if (taken.length) this.changed();
    return taken;
  }

  // Gasta un bloque del hueco `i` (al colocarlo). En creativo no se gasta.
  useOne(i) {
    if (this.infinite) return;
    const s = this.slots[i];
    if (!s) return;
    if (--s.count <= 0) this.slots[i] = null;
    this.changed();
  }

  // Para guardar: [[id, cantidad] o 0, ...]
  toJSON() {
    return this.slots.map((s) => (s ? [s.id, s.count] : 0));
  }

  restore(data, isValid) {
    if (!Array.isArray(data)) return;
    this.slots = this.slots.map((_, i) => {
      const d = data[i];
      return Array.isArray(d) && isValid(d[0]) && d[1] > 0 ? { id: d[0], count: Math.min(STACK, d[1]) } : null;
    });
    this.changed();
  }
}
