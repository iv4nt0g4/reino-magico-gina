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
| Flechas | Mirar alrededor (además del ratón) |
| Esc | Pausa |
| F3 | Panel de depuración (fps, posición, chunks) |

## En la tablet

El juego está pensado para una tablet Android con teclado y ratón (Chrome):

- **⛶** en la pantalla de pausa pone el juego a pantalla completa (y en horizontal, si se puede).
- Si el navegador no deja capturar el ratón, se juega igual: se mira moviendo el ratón (el cursor
  se oculta) y con las flechas del teclado. Con F3 se ve "sin captura de ratón" cuando pasa.
- La calidad se ajusta sola según los fps (resolución interna y distancia de visión, de 3 a 7
  chunks) y se recuerda para la próxima vez. Con F3 se ve la distancia actual.

## Partida guardada

La partida se guarda sola en el navegador (IndexedDB): cada 30 segundos, al pausar con Esc y al
cerrar o cambiar de pestaña. Se guardan los chunks modificados, la posición, la barra rápida y la
hora del día. El disquete 💾 de la esquina aparece un momento cada vez que se guarda.

Para empezar un mundo nuevo: pausa (Esc) → **🌍 Mundo nuevo** → ✔. Se borra la partida y se
vuelve a construir el reino desde cero.

## La ciudad

Al crear un mundo nuevo se construye una sola vez "El Reino Mágico de Gina" (`src/structures/`):
un pequeño sistema de construcción (`builder.js`: `fillBox`, `hollowBox`, `cylinder`, `cone`,
`stairs`, `roof`, `window`, `pattern`...; `frame.js` para construir mirando a la calle) y una
plantilla por edificio o zona: castillo, casas y tiendas (`house.js`), ayuntamiento, Plaza del
Carrusel, estación, casa de Gina, granja del molino y objetos de ambiente (`props.js`). El plano
de la ciudad y las zonas reservadas para la fase 6 están en `city.js`.

## Brotis, el amiguito verde

Brotis (`src/entities/brotis.js`) es un amiguito original: verde claro moteado, con ojos grandes y
brillantes, mofletes rosas, sonrisa y un brote de dos hojas en la cabeza. Aparecen sobre la hierba
cerca de Gina (como mucho 8 a la vez), pasean, la miran cuando se acerca y se quedan a su lado; si
está muy cerca dan un saltito de alegría, ponen cara feliz (^ ^), sueltan flores, estrellas y
corazones y hacen un "pío". Nunca hacen daño. Además hay cuatro **cuadros de Brotis** (contento,
guiñando, dormido y con flor) colgados en las casas, en la habitación de Gina, en el castillo y en
la juguetería, y en el catálogo (pestaña ✨) para colocarlos donde se quiera. El nombre se cambia en
`src/config/gina.js` (`amiguito.nombre`).

## La Aldea de las Siete Estrellas

Al sur de la ciudad, siguiendo el camino de farolillos que sale de la Calle de la Luna, está el
pueblo más grande del mundo de Gina (`src/structures/town.js`), un homenaje a la serie favorita de
la familia hecho con elementos genéricos y de dominio público: gran puerta roja, mercado de
farolillos, plaza con un dragón dorado y siete estrellas, la estatua del héroe de la leyenda del
Rey Mono sobre su nube dorada, arena del Gran Torneo, el **Dojo del Maestro Iván** (el nombre se
cambia en `src/config/gina.js`), pagoda de cuatro pisos con mirador, pilares de entrenamiento
para escalar saltando, casas-cúpula y unas 40 casas y tiendas. Se construye al crear un mundo
nuevo, junto con la ciudad. Para ir directamente: `?pos=0,215`.

## Aldeas y rincones

Fuera de la ciudad (a partir de unos 190 bloques del centro) el mapa tiene **aldeas** de tres tipos
—granjeros, hadas y cerezos— y **rincones**: merenderos, círculos de setas y casitas sueltas
(`src/world/villages.js`). Se generan con el terreno, igual cada vez para el mismo mundo, solo en
sitios llanos sin agua ni nieve; cada casa se apoya en su terreno y los caminos de grava lo siguen.
Para visitar algunas: `?pos=-210,167` (cerezos), `?pos=-43,349` (hadas), `?pos=-191,-211` (granjeros).

## Comprobación de puertas y escaleras

Cada casa registra su puerta y sus escaleras; una prueba comprueba, en la ciudad y en las aldeas
cercanas (sobre el terreno real), que todas las puertas tienen paso y que todas las escaleras se
pueden subir con la física real del juego:

```bash
npm run verificar
```

También se ejecuta en GitHub Actions antes de compilar. Los chunks resultantes se guardan como chunks modificados, así que a
partir de ahí son mundo normal: Gina puede cambiarlos y los mundos ya creados no cambian aunque
cambie el código.

## Depuración

`?pos=x,z` en la URL hace aparecer al jugador en otra columna del mundo
(por ejemplo `?pos=-1880,-120` para ver montañas nevadas o `?pos=-144,-127` para un lago). Con
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
