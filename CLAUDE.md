# El Reino Mágico de Gina — Especificación del proyecto

## Qué es
Un juego de construcción por bloques en 3D (sandbox voxel en primera persona), con la misma sensación de control y las mismas mecánicas que un juego tipo Minecraft, hecho exclusivamente para **Gina, de 7 años**. Se juega en el navegador. Al empezar la primera partida, Gina aparece en una **ciudad mágica de cuento de hadas** ya construida, llena de detalles, con estética de parque temático de fantasía.

Trabajamos **por fases**. En cada sesión te indicaré qué fase toca. No avances a la siguiente fase sin que te lo pida. Al terminar cada fase: el juego debe arrancar sin errores, y me das un resumen breve de lo hecho y cómo probarlo.

## Reglas importantes
- **Todo el contenido visual y sonoro es original.** No uses texturas, sonidos, nombres, logotipos ni personajes de Minecraft, Disney ni de ninguna otra marca. Las texturas se generan por código (pixel art 16×16 dibujado en canvas) y los sonidos se sintetizan con Web Audio API. La ciudad se *inspira* en el ambiente de los parques temáticos y cuentos clásicos (castillos de princesas, calle principal festiva, carrusel, fuegos artificiales), con diseños propios.
- **Apto para una niña de 7 años:** nada de sangre, muerte explícita, monstruos que den miedo ni lenguaje negativo. Si se cae o recibe daño, reaparece con una animación suave de estrellitas. Los mensajes en pantalla son cortos, alegres y en español sencillo; siempre que se pueda, iconos en vez de texto.
- **Personalización:** el nombre de Gina y sus gustos aparecen por todo el juego (ver sección "Sobre Gina"). Centraliza todo esto en un único archivo `src/config/gina.js` para poder cambiarlo fácilmente.
- Código limpio, modular y comentado en español. Nada de dependencias innecesarias.

## Stack técnico
- **Vite + JavaScript (ES modules) + Three.js.** Sin frameworks de UI; el HUD y los menús con HTML/CSS por encima del canvas.
- Ruido para terreno: `simplex-noise` (o implementación propia), con semilla.
- Guardado: **IndexedDB** (mundo modificado por chunks + estado del jugador). Autoguardado cada 30 s y al salir.
- **Dispositivo principal: tablet Android con teclado y ratón físicos** (Chrome). También debe funcionar en Chrome/Edge de escritorio.
- Objetivo de rendimiento: juego fluido en la tablet. La calidad (resolución interna y distancia de renderizado, de 3 a 7 chunks) se ajusta sola según los fps; en un portátil normal, 60 fps con 6–8 chunks.
- Si el navegador no permite capturar el ratón (pointer lock), se juega igual: se mira moviendo el ratón y con las flechas del teclado.

## Motor (lo más parecido posible al original)
- **Mundo por chunks** de 16×16×256 (o 16×16 en horizontal con altura razonable, p. ej. 128). Carga y descarga según la posición del jugador.
- **Mallado optimizado:** solo caras visibles (face culling) y greedy meshing o similar. Generación de mallas en **Web Workers** para no congelar el juego.
- **Iluminación:** luz de cielo + **ambient occlusion por vértice** para ese aspecto característico de bloques. Antorchas/farolas que iluminan (luz de bloque propagada).
- **Física del jugador:** colisión AABB contra bloques, gravedad, salto de 1,25 bloques, caminar ~4,3 bloques/s, correr ~5,6 bloques/s, agacharse (no cae por bordes). Paso automático no; salto manual como en el original.
- **Controles de escritorio:** WASD, ratón con pointer lock, Espacio saltar, Shift agacharse, Ctrl/doble W correr, clic izquierdo romper, clic derecho colocar, rueda o teclas 1–9 para la barra rápida, E inventario, Esc menú. En modo creativo, doble Espacio para volar.
- **Raycast** de bloque apuntado con contorno de selección; animación de rotura progresiva en supervivencia, instantánea en creativo.
- **Barra rápida de 9 huecos**, inventario, y en creativo un catálogo con todos los bloques organizados por pestañas con iconos.
- **Ciclo día/noche** (unos 20 min por día completo, ajustable), sol, luna, estrellas, nubes de bloques.
- **Agua** transparente que fluye de forma simplificada; el jugador nada.
- **Terreno procedural** alrededor de la ciudad: praderas, bosques, colinas, playas, lago, montañas nevadas; árboles, flores, hierba alta.
- **Animalitos amistosos** (originales y adorables): conejos, ovejas de colores, patos, gatitos, un poni. Deambulan, saltan, hacen sonidos tiernos. Nada hostil.
- **Modos de juego:** Creativo (por defecto) y "Aventura suave" (supervivencia sin peligro real: hay que recoger materiales y craftear, el hambre no existe, el daño solo por caídas grandes y reaparece al instante).
- **Crafteo simplificado:** cuadrícula 3×3 con recetas visibles en un libro de recetas con dibujos (Gina no tiene que memorizarlas).

## Bloques (originales)
Básicos: hierba, tierra, piedra, arena, grava, nieve, hielo, agua, troncos y hojas de 3 tipos de árbol (incluido uno de hojas rosas tipo cerezo), tablones, cristal, ladrillos.
Mágicos y de ciudad: lana en 16 colores, cuarzo blanco, piedra pastel (rosa, lila, celeste, menta, melocotón), tejas de colores, oro, piedra con brillo, cristal de colores (vidriera), farola, antorcha, flores (varias), setas gigantes, nube (bloque blanco suave sobre el que se rebota), caramelo y galleta (bloques temáticos), bloque arcoíris, bloque estrella que brilla, cama, puerta, valla, escalera, losa.

## La ciudad inicial: "El Reino Mágico de Gina"
Se genera **una sola vez** al crear el primer mundo, centrada en el punto de aparición, y a partir de ahí forma parte del mundo editable (Gina puede modificarla o romperla). Las estructuras se definen en código mediante un pequeño sistema de construcción (`src/structures/`), con funciones reutilizables tipo `fillBox`, `hollowBox`, `cylinder`, `cone`, `stairs`, `roof`, `window`, y plantillas por edificio. Mucho detalle: interiores amueblados, jardineras, farolas, caminos con bordillo, fuentes, banderines.

Zonas (todas con diseños originales):
1. **Castillo de Gina** — Castillo de cuento en piedra blanca y rosa pastel, con torres cónicas de tejas lila y celeste, banderas con una "G", foso con puente levadizo, salón del trono, habitación de princesa con cama con dosel, biblioteca, balcón con vistas, mazmorras convertidas en sala de juegos. Es el punto de aparición: Gina empieza delante de la puerta.
2. **Calle Principal** — Avenida que lleva al castillo, con casitas de fachada colorida: heladería, pastelería, juguetería, tienda de disfraces, floristería, estación de tren con un pequeño tren decorativo, ayuntamiento con reloj.
3. **Plaza del Carrusel** — Carrusel de caballitos de bloques, fuente central con agua, bancos, globos.
4. **Zona de feria** — Noria, montaña rusa decorativa (estructura), casetas de juegos, taza giratoria.
5. **Bosque Encantado** — Árboles de hojas rosas y moradas, setas gigantes, casita de los siete enanitos (original, sin personajes), cabaña de jengibre de caramelo y galleta.
6. **Palacio de Hielo** — En una colina nevada, palacio de hielo y cristal celeste con escaleras.
7. **Bahía del Pirata** — Lago o costa con barco pirata de madera, faro de rayas, muelle, isla con cofre del tesoro (dentro hay bloques especiales como regalo).
8. **Jardín de las Hadas** — Laberinto de setos con flores, glorieta, estanque con nenúfares, nubes flotantes a las que se sube por escalones de nube.
9. **Casa de Gina y su familia** — Una casa acogedora con su habitación (ver "Sobre Gina").

Por la noche: farolas encendidas, ventanas iluminadas y **fuegos artificiales sobre el castillo** (partículas de colores) cada noche.

## Sobre Gina (rellenar antes de la fase de personalización)
- Nombre: Gina
- Edad: 7 años
- Color favorito: [COMPLETAR]
- Animal favorito: [COMPLETAR]
- Mascota (nombre y tipo, si tiene): [COMPLETAR]
- Cosas que le encantan: [COMPLETAR]
- Nombres de la familia para carteles o NPCs: [COMPLETAR]
- Fecha de cumpleaños (para una sorpresa ese día): [COMPLETAR]

Usos previstos: pantalla de título "El Reino Mágico de Gina", mensaje de bienvenida con su nombre, su color favorito como tema de la interfaz, su animal favorito como compañero que la sigue, carteles en la ciudad con nombres de la familia, y una fiesta especial (confeti y tarta gigante en la plaza) el día de su cumpleaños.

## Estructura de carpetas sugerida
```
src/
  main.js
  config/       (gina.js, settings.js)
  engine/       (renderer, chunks, mesher worker, lighting, physics, raycast)
  world/        (generación de terreno, biomas, guardado)
  blocks/       (registro de bloques, generador de texturas pixel art, atlas)
  structures/   (helpers de construcción + una plantilla por edificio)
  entities/     (jugador, animalitos, compañero)
  ui/           (HUD, barra rápida, inventario, crafteo, menús)
  audio/        (sonidos sintetizados, música suave)
```

## Hoja de ruta por fases
- **Fase 1 — Motor base:** proyecto Vite, Three.js, registro de bloques y texturas generadas, chunks con mallado en workers, terreno procedural básico, cámara en primera persona, física y colisiones, controles de movimiento. *Prueba: caminar, saltar y explorar un terreno fluido.*
- **Fase 2 — Construir:** raycast, contorno de selección, romper y colocar bloques, barra rápida, catálogo creativo, vuelo en creativo, sonidos de pasos y bloques.
- **Fase 3 — Mundo vivo:** iluminación con AO y luz de bloques, ciclo día/noche, cielo, nubes, agua, árboles y flores, biomas, guardado en IndexedDB.
- **Fase 4 — Sistema de estructuras + Castillo:** helpers de construcción, generación única de la ciudad al crear el mundo, el Castillo de Gina completo con interiores.
- **Fase 5 — Ciudad (parte 1):** Calle Principal, Plaza del Carrusel, casa de Gina.
- **Fase 6 — Ciudad (parte 2):** Feria, Bosque Encantado, Palacio de Hielo, Bahía del Pirata, Jardín de las Hadas, fuegos artificiales nocturnos.
- **Fase 7 — Seres vivos:** animalitos con IA sencilla, compañero que sigue a Gina.
- **Fase 8 — Aventura suave:** inventario completo, crafteo 3×3 con libro de recetas ilustrado, recogida de materiales.
- **Fase 9 — Personalización:** pantalla de título, temas de color, mensajes, carteles, sorpresa de cumpleaños, música.
- **Fase 10 — Pulido:** menú de ajustes (distancia de renderizado, sensibilidad, volumen), controles táctiles opcionales (la tablet se usa con teclado y ratón), optimización, corrección de errores.
