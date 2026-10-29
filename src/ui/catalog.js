// Catálogo creativo: todos los bloques organizados en pestañas con iconos.
// Al pulsar un bloque se coloca en el hueco seleccionado de la barra rápida.

import { BLOCKS, CATEGORIES } from '../blocks/registry.js';
import { getBlockIcon } from '../blocks/icons.js';

export class Catalog {
  constructor(hotbar) {
    this.hotbar = hotbar;
    this.element = document.getElementById('catalog');
    this.tabs = document.getElementById('catalog-tabs');
    this.grid = document.getElementById('catalog-grid');
    this.isOpen = false;
    this.category = CATEGORIES[0].key;
    this.onClose = null; // (relock: boolean)

    for (const cat of CATEGORIES) {
      const tab = document.createElement('button');
      tab.className = 'tab';
      tab.dataset.category = cat.key;
      tab.title = cat.label;
      tab.textContent = cat.icon;
      tab.addEventListener('click', () => this.#showCategory(cat.key));
      this.tabs.appendChild(tab);
    }
    document.getElementById('catalog-close').addEventListener('click', () => this.close(true));

    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.code === 'KeyE') this.close(true); // vuelve a jugar
      else if (e.code === 'Escape') this.close(false); // va a la pausa
      else if (/^Digit[1-9]$/.test(e.code)) this.hotbar.select(Number(e.code.slice(5)) - 1);
    });
  }

  open() {
    this.isOpen = true;
    this.element.hidden = false;
    this.#showCategory(this.category);
  }

  close(relock) {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.element.hidden = true;
    this.onClose?.(relock);
  }

  #showCategory(key) {
    this.category = key;
    for (const tab of this.tabs.children) tab.classList.toggle('active', tab.dataset.category === key);
    this.grid.replaceChildren(
      ...BLOCKS.filter((b) => b.category === key).map((block) => {
        const button = document.createElement('button');
        button.className = 'block';
        button.title = block.label;
        button.innerHTML = `<img src="${getBlockIcon(block.id)}" alt="${block.label}">`;
        button.addEventListener('click', () => this.hotbar.setSelected(block.id));
        return button;
      }),
    );
  }
}
