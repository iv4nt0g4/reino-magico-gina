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
| Esc | Pausa |
| F3 | Panel de depuración (fps, posición, chunks) |

Depuración: `?pos=x,z` en la URL hace aparecer al jugador en otra columna del mundo
(por ejemplo `?pos=-1880,-120` para ver montañas nevadas).

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
