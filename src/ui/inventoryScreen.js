// Pantalla de inventario de la Aventura suave (tecla E): la mochila, la barra
// rápida, la cuadrícula de crafteo de 3 × 3 y el libro de recetas con dibujos.
//
// Con el ratón, como en el original:
//  - clic izquierdo: coger un montón / dejarlo / juntarlo / cambiarlo
//  - clic derecho: coger la mitad / dejar uno
//  - Mayúsculas + clic: mandarlo de la barra a la mochila (o al revés)
//  - teclas 1–9 sobre un hueco: cambiarlo con ese hueco de la barra rápida
// En el libro, al pulsar una receta que se puede hacer, los ingredientes se
// colocan solos en la cuadrícula; luego basta con pulsar el resultado.

import { BLOCKS } from '../blocks/registry.js';
import { getBlockIcon } from '../blocks/icons.js';
import { BOOK_TABS, RECIPES, findRecipe, recipePicture, recipeNeeds } from '../blocks/recipes.js';
import { STACK } from '../entities/inventory.js';

// Hueco de la interfaz: icono y número.
function slotElement(className = 'slot') {
  const el = document.createElement('div');
  el.className = className;
  el.innerHTML = '<img alt="" hidden><b></b>';
  return el;
}

function paintSlot(el, stack) {
  const img = el.querySelector('img');
  img.hidden = !stack;
  if (stack) img.src = getBlockIcon(stack.id);
  el.querySelector('b').textContent = stack && stack.count > 1 ? stack.count : '';
  el.title = stack ? BLOCKS[stack.id].label : '';
}

export class InventoryScreen {
  constructor(hotbar, sounds) {
    Object.assign(this, { hotbar, sounds });
    this.element = document.getElementById('inventory');
    this.inventory = null;
    this.grid = new Array(9).fill(null); // cuadrícula de crafteo
    this.cursor = null; // montón cogido con el ratón
    this.hovered = null; // { list, index } bajo el ratón
    this.isOpen = false;
    this.tab = BOOK_TABS[0].key;
    this.onClose = null; // (relock)
    this.onDrop = null; // (id, count): lo que no cabe al cerrar se suelta al suelo
    this.onCraft = null; // (id, count)

    // Huecos: mochila (9–35), barra rápida (0–8) y cuadrícula.
    this.cells = { inventory: [], grid: [] };
    const backpack = document.getElementById('backpack');
    const bar = document.getElementById('inventory-hotbar');
    for (let i = 0; i < 36; i++) {
      const el = slotElement();
      this.#bindSlot(el, 'inventory', i);
      (i < 9 ? bar : backpack).appendChild(el);
      this.cells.inventory[i] = el;
    }
    // La mochila va en orden 9..35 y la barra 0..8 (appendChild ya respeta el orden).
    const craft = document.getElementById('craft-grid');
    for (let i = 0; i < 9; i++) {
      const el = slotElement();
      this.#bindSlot(el, 'grid', i);
      craft.appendChild(el);
      this.cells.grid[i] = el;
    }
    this.resultCell = document.getElementById('craft-result');
    this.resultCell.innerHTML = '<img alt="" hidden><b></b>';
    this.resultCell.addEventListener('mousedown', (e) => this.#takeResult(e.shiftKey));

    // Montón que sigue al ratón.
    this.cursorEl = document.getElementById('cursor-stack');
    this.element.addEventListener('mousemove', (e) => {
      this.cursorEl.style.left = `${e.clientX}px`;
      this.cursorEl.style.top = `${e.clientY}px`;
    });
    this.element.addEventListener('contextmenu', (e) => e.preventDefault());

    // Libro de recetas: pestañas.
    this.tabs = document.getElementById('book-tabs');
    for (const t of BOOK_TABS) {
      const tab = document.createElement('button');
      tab.className = 'tab';
      tab.dataset.tab = t.key;
      tab.title = t.label;
      tab.textContent = t.icon;
      tab.addEventListener('click', () => {
        this.tab = t.key;
        this.#renderBook();
      });
      this.tabs.appendChild(tab);
    }
    this.bookList = document.getElementById('book-list');
    document.getElementById('inventory-close').addEventListener('click', () => this.close(true));

    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.code === 'KeyE') this.close(true);
      else if (e.code === 'Escape') this.close(false);
      else if (/^Digit[1-9]$/.test(e.code)) this.#swapWithHotbar(Number(e.code.slice(5)) - 1);
    });
  }

  open(inventory) {
    this.inventory = inventory;
    this.isOpen = true;
    this.element.hidden = false;
    document.body.classList.add('inventory-open');
    this.#render();
  }

  close(relock) {
    if (!this.isOpen) return;
    this.#returnAll();
    this.isOpen = false;
    this.element.hidden = true;
    document.body.classList.remove('inventory-open');
    this.inventory.changed();
    this.onClose?.(relock);
  }

  // Devuelve a la mochila lo que hay en la cuadrícula y en el ratón (lo que
  // no quepa se suelta al suelo).
  #returnAll() {
    const stacks = [...this.grid, this.cursor].filter(Boolean);
    this.grid.fill(null);
    this.cursor = null;
    for (const s of stacks) {
      const left = this.inventory.add(s.id, s.count);
      if (left > 0) this.onDrop?.(s.id, left);
    }
  }

  #list(name) {
    return name === 'grid' ? this.grid : this.inventory.slots;
  }

  #bindSlot(el, listName, index) {
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.#click(listName, index, e.button, e.shiftKey);
    });
    el.addEventListener('mouseenter', () => (this.hovered = { listName, index }));
    el.addEventListener('mouseleave', () => (this.hovered = null));
  }

  #click(listName, i, button, shift) {
    const list = this.#list(listName);
    const s = list[i];
    const c = this.cursor;
    if (button === 0 && shift && s) {
      this.#quickMove(listName, i);
    } else if (button === 0) {
      if (!c) {
        list[i] = null;
        this.cursor = s;
      } else if (!s) {
        list[i] = c;
        this.cursor = null;
      } else if (s.id === c.id) {
        const n = Math.min(c.count, STACK - s.count);
        s.count += n;
        c.count -= n;
        if (c.count === 0) this.cursor = null;
      } else {
        list[i] = c;
        this.cursor = s;
      }
    } else if (button === 2) {
      if (!c && s) {
        const half = Math.ceil(s.count / 2);
        this.cursor = { id: s.id, count: half };
        s.count -= half;
        if (s.count === 0) list[i] = null;
      } else if (c && (!s || (s.id === c.id && s.count < STACK))) {
        if (s) s.count++;
        else list[i] = { id: c.id, count: 1 };
        if (--c.count === 0) this.cursor = null;
      }
    }
    this.#changed();
  }

  // Mayúsculas + clic: de la barra a la mochila, de la mochila a la barra y
  // de la cuadrícula a donde quepa.
  #quickMove(listName, i) {
    const list = this.#list(listName);
    const s = list[i];
    list[i] = null;
    let left = s.count;
    if (listName === 'grid') {
      left = this.inventory.add(s.id, s.count);
    } else {
      const slots = this.inventory.slots;
      const range = i < 9 ? [9, 36] : [0, 9];
      for (let pass = 0; pass < 2 && left > 0; pass++) {
        for (let k = range[0]; k < range[1] && left > 0; k++) {
          const t = slots[k];
          if (pass === 0 && t && t.id === s.id && t.count < STACK) {
            const n = Math.min(left, STACK - t.count);
            t.count += n;
            left -= n;
          } else if (pass === 1 && !t) {
            slots[k] = { id: s.id, count: left };
            left = 0;
          }
        }
      }
    }
    if (left > 0) list[i] = { id: s.id, count: left };
  }

  #swapWithHotbar(n) {
    if (!this.hovered) {
      this.hotbar.select(n);
      return;
    }
    const list = this.#list(this.hovered.listName);
    const slots = this.inventory.slots;
    const i = this.hovered.index;
    if (list === slots && i === n) return;
    [list[i], slots[n]] = [slots[n], list[i]];
    this.#changed();
  }

  // Pulsar el resultado: se fabrica (con Mayúsculas, todos los que se pueda).
  #takeResult(all) {
    let made = 0;
    let recipe = findRecipe(this.grid.map((s) => s?.id ?? 0));
    while (recipe) {
      const { id, count } = recipe.result;
      if (!this.inventory.canAdd(id)) break;
      const left = this.inventory.add(id, count);
      if (left > 0) this.onDrop?.(id, left);
      for (let i = 0; i < 9; i++) {
        const s = this.grid[i];
        if (s && --s.count === 0) this.grid[i] = null;
      }
      made += count;
      if (!all) break;
      recipe = findRecipe(this.grid.map((s) => s?.id ?? 0));
      if (recipe?.result.id !== id) break;
    }
    if (made > 0) {
      this.sounds.craft();
      this.resultCell.classList.remove('made');
      void this.resultCell.offsetWidth; // reinicia la animación
      this.resultCell.classList.add('made');
      this.onCraft?.(made);
    }
    this.#changed();
  }

  // Receta del libro: coloca los ingredientes en la cuadrícula si los tiene.
  #useRecipe(recipe, card) {
    this.#returnAll();
    if (!this.#canMake(recipe)) {
      card.classList.remove('nope');
      void card.offsetWidth;
      card.classList.add('nope');
      this.#changed();
      return;
    }
    recipePicture(recipe).forEach((shown, i) => {
      if (!shown) return;
      // La celda acepta varias opciones (por ejemplo, cualquier tronco).
      const set = recipe.cells
        ? recipe.cells[Math.floor(i / 3) * recipe.width + (i % 3)]
        : recipe.items[i];
      const [id] = this.inventory.remove(set, 1);
      if (id) this.grid[i] = { id, count: 1 };
    });
    this.sounds.pickup();
    this.#changed();
  }

  #canMake(recipe) {
    return recipeNeeds(recipe).every((n) => this.inventory.count(n.ids) + this.#gridCount(n.ids) >= n.count);
  }

  #gridCount(ids) {
    return this.grid.reduce((n, s) => n + (s && ids.has(s.id) ? s.count : 0), 0);
  }

  #changed() {
    this.inventory.changed();
    this.#render();
  }

  #render() {
    if (!this.isOpen) return;
    this.cells.inventory.forEach((el, i) => {
      paintSlot(el, this.inventory.slots[i]);
      el.classList.toggle('selected', i === this.hotbar.selected);
    });
    this.cells.grid.forEach((el, i) => paintSlot(el, this.grid[i]));
    const recipe = findRecipe(this.grid.map((s) => s?.id ?? 0));
    paintSlot(this.resultCell, recipe ? recipe.result : null);
    this.resultCell.classList.toggle('ready', !!recipe);
    this.cursorEl.hidden = !this.cursor;
    if (this.cursor) paintSlot(this.cursorEl, this.cursor);
    this.#renderBook();
  }

  #renderBook() {
    for (const tab of this.tabs.children) tab.classList.toggle('active', tab.dataset.tab === this.tab);
    // Primero las que se pueden hacer ya.
    const recipes = RECIPES.filter((r) => r.book === this.tab)
      .map((r) => ({ r, can: this.#canMake(r) }))
      .sort((a, b) => b.can - a.can || a.r.index - b.r.index);
    this.bookList.replaceChildren(
      ...recipes.map(({ r, can }) => {
        const card = document.createElement('button');
        card.className = `recipe${can ? ' can' : ''}`;
        card.title = BLOCKS[r.result.id].label;
        const picture = recipePicture(r);
        const needs = recipeNeeds(r);
        const missing = (id) => {
          const n = needs.find((k) => k.ids.has(id));
          return n && this.inventory.count(n.ids) + this.#gridCount(n.ids) < n.count;
        };
        card.innerHTML = `
          <span class="mini">${picture
            .map((id) => (id ? `<img src="${getBlockIcon(id)}" alt="" class="${missing(id) ? 'missing' : ''}" title="${BLOCKS[id].label}">` : '<i></i>'))
            .join('')}</span>
          <span class="arrow">➜</span>
          <span class="out"><img src="${getBlockIcon(r.result.id)}" alt="">${r.result.count > 1 ? `<b>${r.result.count}</b>` : ''}</span>`;
        card.addEventListener('click', () => this.#useRecipe(r, card));
        return card;
      }),
    );
  }
}
