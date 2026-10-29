// La ciudad inicial, "El Reino Mágico de Gina". Se construye una sola vez
// al crear un mundo nuevo; después es parte del mundo y Gina puede cambiarla.
// Cada zona tiene su plantilla; en las fases 5 y 6 se añaden las demás.

import { StructureBuilder } from './builder.js';
import { buildCastle, CASTLE_SPAWN } from './castle.js';

// Donde aparece Gina en un mundo nuevo: delante de la puerta del castillo.
export const CITY_SPAWN = CASTLE_SPAWN;

export function buildCity() {
  const b = new StructureBuilder();
  buildCastle(b);
  return b;
}
