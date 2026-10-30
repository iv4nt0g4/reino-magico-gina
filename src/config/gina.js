// Todo lo personal de Gina vive aquí, para poder cambiarlo en un solo sitio.
export const GINA = {
  nombre: 'Gina',
  edad: 7,
  tituloJuego: 'El Reino Mágico de Gina',

  // Color de los menús, la barra y los botones: 'rosa', 'morado', 'celeste' o 'verde'.
  // (En la pausa se puede elegir otro; este es el de siempre.)
  colorFavorito: 'rosa',

  animalFavorito: 'capibara',
  cosasQueLeEncantan: ['capibaras', 'los creepers (Brotis)', 'Lilo y Stitch', 'Dragon Ball con Iván'],

  // Su mascota de verdad: pasea por el jardín de su casa con su nombre encima.
  mascota: { animal: 'conejo', nombre: 'Sky', color: [240, 240, 244] },

  // La familia: sus nombres salen en los carteles de la ciudad.
  familia: [
    { nombre: 'Yessica', comoLaLlama: 'Mamá Yessica' },
    { nombre: 'Iván', comoLaLlama: 'Iván' },
  ],
  // Tiendas de la Calle Principal con el nombre de alguien de la familia.
  tiendasDeLaFamilia: { pasteleria: 'Yessica', jugueteria: 'Iván' },

  // Guiños de la familia en el mundo:
  maestroDelDojo: 'Iván', // el dojo de la Aldea de las Siete Estrellas lleva su nombre
  // El amiguito verde que pasea por el reino (Gina puede ponerle otro nombre).
  amiguito: { nombre: 'Brotis' },
  // El compañero que sigue a Gina por todo el reino (Gina puede cambiarle el nombre).
  companero: { animal: 'capibara', nombre: 'Capi' },

  // Cumpleaños en formato 'MM-DD' (por ejemplo '03-14'). Ese día hay confeti,
  // una tarta gigante en la Plaza del Carrusel y música de cumpleaños.
  // Para verlo cualquier día, abrir el juego con ?cumple al final de la dirección.
  cumpleanos: null,
};

// "Mamá Yessica e Iván": une nombres con "y" (o "e" si el siguiente empieza por i).
export function joinNames(names) {
  if (names.length <= 1) return names.join('');
  const last = names[names.length - 1];
  const and = /^(i|hi)(?![aeiouáéó])/i.test(last.normalize('NFD').replace(/[̀-ͯ]/g, '')) ? 'e' : 'y';
  return `${names.slice(0, -1).join(', ')} ${and} ${last}`;
}

// ¿Es hoy su cumpleaños? (o se ha pedido verlo con ?cumple)
export function isBirthday(date = new Date()) {
  if (new URLSearchParams(location.search).has('cumple')) return true;
  if (!GINA.cumpleanos) return false;
  const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return mmdd === GINA.cumpleanos;
}
