# El Reino Mágico de Gina

Juego de construcción por bloques en 3D, en el navegador, hecho para Gina.
La especificación completa y la hoja de ruta por fases están en [`CLAUDE.md`](CLAUDE.md).

## Jugar en local

```bash
npm install
npm run dev
```

Abre la dirección que muestra Vite (normalmente http://localhost:5173) en Chrome o Edge.

| Tecla | Acción |
| --- | --- |
| WASD + ratón | Moverse y mirar |
| Espacio | Saltar |
| Shift | Agacharse (no se cae por los bordes) |
| Ctrl o doble W | Correr |
| Doble Espacio | Volar (Espacio sube, Shift baja; al tocar el suelo deja de volar) |
| Espacio en el agua | Nadar hacia arriba (contra la orilla, salir del agua) |
| Clic izquierdo | Romper bloque (mantener para seguir rompiendo) |
| Clic derecho | Colocar bloque (mantener para seguir colocando) |
| Clic central | Coger el bloque apuntado para la barra rápida |
| 1–9 o rueda | Elegir hueco de la barra rápida |
| E | Catálogo de bloques (clic en un bloque → va al hueco elegido) |
| Esc | Pausa |
| F3 | Panel de depuración (fps, posición, chunks) |

## Partida guardada

La partida se guarda sola en el navegador (IndexedDB): cada 30 segundos, al pausar con Esc y al
cerrar o cambiar de pestaña. Se guardan los chunks modificados, la posición, la barra rápida y la
hora del día. El disquete 💾 de la esquina aparece un momento cada vez que se guarda.

Para empezar un mundo nuevo: pausa (Esc) → **🌍 Mundo nuevo** → ✔. Se borra la partida y se
vuelve a construir el reino desde cero.

## La ciudad

Al crear un mundo nuevo se construye una sola vez "El Reino Mágico de Gina" (`src/structures/`):
un pequeño sistema de construcción (`builder.js`: `fillBox`, `hollowBox`, `cylinder`, `cone`,
`stairs`, `roof`, `window`, `pattern`...) y una plantilla por edificio (`castle.js`, y las demás
zonas en las fases 5 y 6). Los chunks resultantes se guardan como chunks modificados, así que a
partir de ahí son mundo normal: Gina puede cambiarlos y los mundos ya creados no cambian aunque
cambie el código.

## Depuración

`?pos=x,z` en la URL hace aparecer al jugador en otra columna del mundo
(por ejemplo `?pos=-1880,-120` para ver montañas nevadas o `?pos=-75,-141` para un lago). Con
`npm run dev`, la consola del navegador tiene `window.__juego` (jugador, mundo, agua, cielo, barra
rápida, sonidos) para depurar; por ejemplo `__juego.sky.time = 0.75` pone la noche.

## Compilar

```bash
npm run build     # genera dist/
npm run preview   # sirve dist/ para probar el build
```

## Despliegue en GitHub Pages

El workflow `.github/workflows/deploy.yml` compila y publica `dist/` en cada push a `main`
(en los Pull Requests solo compila). Hay que activarlo una vez en
**Settings → Pages → Build and deployment → Source: GitHub Actions**.
El juego queda en `https://<usuario>.github.io/reino-magico-gina/`.
