// Barra rápida de 9 huecos con iconos de bloque. Al cambiar de hueco se
// muestra un momento el nombre del bloque.

import { BLOCK, BLOCKS } from '../blocks/registry.js';
import { getBlockIcon } from '../blocks/icons.js';

const START_BLOCKS = ['grass', 'stone', 'planks', 'bricks', 'glass', 'pastel_pink', 'wool_light_blue', 'cherry_leaves', 'cloud'];

export class Hotbar {
  constructor() {
    this.slots = START_BLOCKS.map((name) => BLOCK[name]);
    this.selected = 0;
    this.element = document.getElementById('hotbar');
    this.label = document.getElementById('block-name');
    this.labelTimer = 0;
    this.onSlotClick = null;

    this.cells = this.slots.map((_, i) => {
      const cell = document.createElement('div');
      cell.className = 'slot';
      cell.innerHTML = `<img alt=""><span>${i + 1}</span>`;
      cell.addEventListener('click', () => this.onSlotClick?.(i));
      this.element.appendChild(cell);
      return cell;
    });
    this.#render();
  }

  selectedBlock() {
    return this.slots[this.selected];
  }

  select(index) {
    this.selected = (index + 9) % 9;
    this.#render();
    this.#showName();
  }

  scroll(direction) {
    this.select(this.selected + direction);
  }

  // Pone un bloque en el hueco seleccionado.
  setSelected(id) {
    this.slots[this.selected] = id;
    this.#render();
    this.#showName();
  }

  // Clic central: si el bloque ya está en la barra, ir a él; si no, ponerlo en el hueco actual.
  pick(id) {
    const index = this.slots.indexOf(id);
    if (index >= 0) this.select(index);
    else this.setSelected(id);
  }

  #render() {
    this.cells.forEach((cell, i) => {
      const id = this.slots[i];
      const img = cell.querySelector('img');
      img.src = id ? getBlockIcon(id) : '';
      img.hidden = !id;
      cell.title = id ? BLOCKS[id].label : '';
      cell.classList.toggle('selected', i === this.selected);
    });
  }

  #showName() {
    const id = this.selectedBlock();
    this.label.textContent = id ? BLOCKS[id].label : '';
    this.label.classList.add('visible');
    clearTimeout(this.labelTimer);
    this.labelTimer = setTimeout(() => this.label.classList.remove('visible'), 1500);
  }
}
