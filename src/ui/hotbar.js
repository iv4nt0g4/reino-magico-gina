// Barra rápida de 9 huecos con iconos de bloque. Muestra los 9 primeros
// huecos del inventario activo: el de creativo (bloques que no se gastan) o
// el de la Aventura suave (con el número de bloques de cada montón). Al
// cambiar de hueco se muestra un momento el nombre del bloque.

import { BLOCK, BLOCKS } from '../blocks/registry.js';
import { getBlockIcon } from '../blocks/icons.js';
import { Inventory } from '../entities/inventory.js';

const START_BLOCKS = ['grass', 'stone', 'planks', 'bricks', 'glass', 'pastel_pink', 'torch', 'water', 'cloud'];

export class Hotbar {
  constructor() {
    // Barra del modo creativo.
    this.creative = new Inventory(9, { infinite: true });
    START_BLOCKS.forEach((name, i) => (this.creative.slots[i] = { id: BLOCK[name], count: 1 }));
    this.inventory = this.creative;
    this.selected = 0;
    this.element = document.getElementById('hotbar');
    this.label = document.getElementById('block-name');
    this.labelTimer = 0;
    this.onSlotClick = null;
    this.render = () => this.#render();

    this.cells = Array.from({ length: 9 }, (_, i) => {
      const cell = document.createElement('div');
      cell.className = 'slot';
      cell.innerHTML = `<img alt=""><span>${i + 1}</span><b></b>`;
      cell.addEventListener('click', () => this.onSlotClick?.(i));
      this.element.appendChild(cell);
      return cell;
    });
    this.creative.listeners.add(this.render);
    this.#render();
  }

  // Cambia de inventario (al pasar de creativo a aventura o al revés).
  setInventory(inventory) {
    this.inventory.listeners.delete(this.render);
    this.inventory = inventory;
    inventory.listeners.add(this.render);
    this.#render();
    this.#showName();
  }

  // Restaura la barra de creativo de una partida guardada.
  restore(slots, selected) {
    if (Array.isArray(slots) && slots.length === 9) {
      this.creative.slots = slots.map((id) => (id > 0 && BLOCKS[id] ? { id, count: 1 } : null));
    }
    this.selected = Number.isInteger(selected) ? (selected + 9) % 9 : 0;
    this.#render();
  }

  selectedBlock() {
    return this.inventory.slots[this.selected]?.id ?? 0;
  }

  select(index) {
    this.selected = (index + 9) % 9;
    this.#render();
    this.#showName();
  }

  scroll(direction) {
    this.select(this.selected + direction);
  }

  // Pone un bloque en el hueco seleccionado (catálogo creativo).
  setSelected(id) {
    this.creative.slots[this.selected] = { id, count: 1 };
    this.creative.changed();
    this.#showName();
  }

  // Gasta un bloque del hueco seleccionado (al colocarlo; en creativo no se gasta).
  useSelected() {
    this.inventory.useOne(this.selected);
  }

  // Clic central: si el bloque ya está en la barra, ir a él; en creativo, si
  // no está, ponerlo en el hueco actual.
  pick(id) {
    const index = this.inventory.slots.findIndex((s, i) => i < 9 && s?.id === id);
    if (index >= 0) this.select(index);
    else if (this.inventory.infinite) this.setSelected(id);
  }

  #render() {
    this.cells.forEach((cell, i) => {
      const slot = this.inventory.slots[i];
      const img = cell.querySelector('img');
      img.src = slot ? getBlockIcon(slot.id) : '';
      img.hidden = !slot;
      cell.querySelector('b').textContent = slot && !this.inventory.infinite && slot.count > 1 ? slot.count : '';
      cell.title = slot ? BLOCKS[slot.id].label : '';
      cell.classList.toggle('selected', i === this.selected);
    });
  }

  #showName() {
    const id = this.selectedBlock();
    this.label.textContent = id ? BLOCKS[id].label : '';
    this.label.classList.toggle('visible', !!id);
    clearTimeout(this.labelTimer);
    this.labelTimer = setTimeout(() => this.label.classList.remove('visible'), 1500);
  }
}
