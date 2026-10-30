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

## Las zonas mágicas (fase 6)

Alrededor de la ciudad, y construidas con ella al crear un mundo nuevo:

- **🎡 Feria** (al este, al final de la Avenida del Castillo): noria con cabinas de colores, montaña
  rusa, taza giratoria, casetas con premios y banderines. `?pos=60,11`
- **🌳 Bosque Encantado** (al oeste): árboles rosas y morados, setas gigantes, la casita de los siete
  enanitos, la cabaña de jengibre y una mina de gemas. `?pos=-60,11`
- **❄️ Palacio de Hielo** (noroeste): colina nevada con escalinata y palacio de cristal celeste con
  torres, trono helado y galería. `?pos=-50,-65`
- **🏴‍☠️ Bahía del Pirata** (noreste): lago con barco pirata, faro de rayas que se puede subir, muelle
  e islita con el cofre del tesoro. `?pos=60,-55`
- **🧚 Jardín de las Hadas** (suroeste): laberinto de setos con glorieta, estanque, casitas-seta y
  nubes flotantes con escalones de nube y puente arcoíris. `?pos=-62,88`
- **🎆 Fuegos artificiales** sobre el castillo cada noche.

## Brotis, el amiguito verde

Brotis (`src/entities/brotis.js`) es un amiguito original: verde claro moteado, con ojos grandes y
brillantes, mofletes rosas, sonrisa y un brote de dos hojas en la cabeza. Aparecen sobre la hierba
cerca de Gina (como mucho 8 a la vez), pasean, la miran cuando se acerca y se quedan a su lado; si
está muy cerca dan un saltito de alegría, ponen cara feliz (^ ^), sueltan flores, estrellas y
corazones y hacen un "pío". Nunca hacen daño. Además hay cuatro **cuadros de Brotis** (contento,
guiñando, dormido y con flor) colgados en las casas, en la habitación de Gina, en el castillo y en
la juguetería, y en el catálogo (pestaña ✨) para colocarlos donde se quiera. El nombre se cambia en
`src/config/gina.js` (`amiguito.nombre`).

## Animalitos y Capi (fase 7)

Por todo el mundo aparecen animalitos amistosos (`src/entities/animals.js`), siempre cerca de Gina
(como mucho 12 a la vez) y cada uno en su sitio: **conejos** que van dando saltitos y **ponis** con
crin de colores por las praderas, **ovejas** de lana pastel, **patos** que nadan en el agua y
caminan balanceándose por la orilla, **capibaras** junto al lago y **gatitos** por las calles de la
ciudad, que siguen un poquito a Gina. Pasean, giran la cabeza para mirarla y, si se acerca, dan un
saltito, sueltan corazones y hacen su sonido (sintetizado). Nunca hacen daño.

**Capi** (`src/entities/companion.js`) es el compañero de Gina: un capibara con una mandarina en la
cabeza y su nombre encima. La sigue a todas partes, más deprisa cuanto más lejos está, nada con
ella, se sienta a su lado cuando ella se para y la saluda con corazones al reencontrarse. Si Gina
vuela muy lejos o Capi se queda atascado, aparece junto a ella con una lluvia de estrellas. El
animal y el nombre se cambian en `src/config/gina.js` (`companero`).

Todos comparten la misma física sencilla (`src/entities/creature.js`): suben escalones de un bloque
de un saltito, no se tiran por precipicios y se mueven en pasos pequeños para no atravesar el suelo
aunque el juego vaya lento. Los modelos se montan con cajas y texturas pixel art dibujadas en canvas
(`src/entities/models.js`).

## Aventura suave (fase 8)

En la pausa se elige el modo: **🎨 Creativo** (todos los bloques, volar, romper al instante) o
**🎒 Aventura** (recoger materiales y fabricar). Se guarda con la partida y se puede cambiar cuando
se quiera; cada modo tiene su propia barra rápida.

En la Aventura suave:
- **Romper** manteniendo el clic: el bloque se va agrietando (más rápido que en el original) y sale
  un bloque pequeñito que gira; al pasar cerca vuela hacia Gina y se guarda con un "plin". La hierba
  da tierra; las flores y las antorchas se rompen al instante.
- **Colocar** gasta bloques. Se empieza con 8 antorchas de regalo.
- **Inventario (E)**: barra rápida, mochila de 27 huecos, cuadrícula de crafteo de 3 × 3 y el
  **libro de recetas** con dibujos (`src/blocks/recipes.js`, 52 recetas en tres pestañas: básicos,
  colores y magia). Las recetas que se pueden hacer salen primero; al pulsar una, los ingredientes se
  colocan solos y basta con pulsar el resultado (con Mayúsculas, todos los que se pueda). Los colores
  se hacen con flores, como pinturas: lana blanca + flor roja = lana roja, roja + amarilla = naranja…
- **Caricias**: clic derecho sobre un animalito, Capi o un Brotis = corazones y su sonido. En aventura,
  las ovejas regalan lana de su color (cada 30 s).
- **Sin peligro**: no hay hambre ni vida. Solo una caída muy grande (más de 12 bloques, salvo al agua
  o sobre una nube) hace que reaparezca en la puerta del castillo con una lluvia de estrellitas, sin
  perder nada.

Ajustes en `src/config/settings.js` (`safeFallHeight`, `woolEverySeconds`) y dureza de cada bloque en
`src/blocks/registry.js` (`hardness`, `drop`).

## Personalización (fase 9)

Todo lo de Gina está en `src/config/gina.js`: nombre, color favorito, mascota, familia, tiendas con
nombres de la familia y cumpleaños.
- **Pantalla de título** con las letras dando saltitos, corona, estrellitas que suben y la cámara
  girando despacio alrededor del castillo antes de empezar.
- **Temas de color** (`src/ui/theme.js`): rosa (su favorito, por defecto), morado, celeste y verde.
  Se eligen con los puntos de colores de la pausa y se recuerdan en el dispositivo.
- **Mensajes** con su nombre (`src/ui/messages.js`): bienvenida, buenas noches con fuegos artificiales,
  buenos días y ánimos de vez en cuando al construir o fabricar.
- **Carteles** de madera (`src/entities/signs.js`): bienvenida delante del castillo, "Aquí viven
  Gina, Mamá Yessica, Iván y Sky" en su casa, la Pastelería de Yessica y la Juguetería de Iván, y
  postes con flechas hacia cada zona del reino. Son decoración, así que salen también en partidas ya
  empezadas.
- **Sky**, su conejo (`src/entities/pet.js`): vive en el jardín de su casa con su nombre encima y va a
  saludarla cuando llega.
- **Sorpresa de cumpleaños** (`src/entities/birthday.js`): ese día, tarta gigante de tres pisos con
  una vela por año en la Plaza del Carrusel, confeti sin parar, "Cumpleaños feliz" al acercarse y
  confeti por la pantalla. Para verla cualquier día: añadir `?cumple` a la dirección.
- **Música** (`src/audio/music.js`): cajita de música sintetizada que nunca se repite igual; de noche
  va más despacio y más grave. Se apaga y enciende con 🎵 en la pausa.

## Cuevas y linterna mágica

Bajo tierra nunca está negro del todo: queda una penumbra suave para que Gina vea por dónde va
(`caveLight` en `src/config/settings.js`). Y si lleva en la mano un bloque que brilla (antorcha,
farolillo, piedra con brillo, estrella…), ilumina a su alrededor mientras camina, como una linterna
mágica; al cambiar de bloque la luz se apaga poco a poco.

## La Aldea de las Siete Estrellas

Al sur de la ciudad, siguiendo el camino de farolillos que sale de la Calle de la Luna, está el
pueblo más grande del mundo de Gina (`src/structures/town.js`), un homenaje de fan a la serie
favorita de la familia (sin nombres, logotipos ni símbolos de la serie): gran puerta roja, mercado
de farolillos, plaza con un **gran dragón verde** enroscado hacia el cielo y **siete esferas de
estrella** brillantes alrededor, la estatua de un **guerrero con el pelo dorado de punta** (que
brilla de noche), arena del Gran Torneo, el **Dojo del Maestro Iván** (el nombre se cambia en
`src/config/gina.js`), pagoda de cuatro pisos con mirador, pilares de entrenamiento para escalar
saltando, casas-cúpula y unas 40 casas y tiendas. Se construye al crear un mundo nuevo, junto con
la ciudad. Para ir directamente: `?pos=0,215`.

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
