# Juan Miguel Huanca Uruña · Portal de videojuegos (Sheriff Tornillo)

Portal web con **dos videojuegos 3D** del Sheriff Tornillo. Los dos **se juegan dentro de esta misma página**: no se abren pestañas ni ventanas nuevas.

| Juego | Sección | Género |
| --- | --- | --- |
| Juego 1 · Carrera en el Desierto | `#juego1` | Endless runner |
| Juego 2 · El Laberinto del Oro | `#juego2` | Laberinto estilo Pac-Man (pathfinding + raycasting) |

- 👤 Developer: Juan Miguel Huanca Uruña (equipo con Axel Marcelo Canqui Ticona)
- 🎓 Game Development · Univalle · 2026

## Cómo funciona (práctica GED-26 · Actualizar portal)
1. **Identidad:** el nombre del developer está en el banner superior.
2. **Menú de juegos:** `ENLACE JUEGO 1` y `ENLACE JUEGO 2` (y `Juego 1` / `Juego 2` en la barra) bajan a la sección de cada juego.
3. **Misma página:** cada juego se carga en un `iframe` dentro de su propia sección.
4. **Control de inicio:** el botón **START** está encima del área de juego. El juego no se carga hasta presionarlo.

## Estructura
```
index.html  css/estilos.css  js/main.js  img/
juegos/
  carrera/    Juego 1 (versión web 3D, Three.js)
  laberinto/  Juego 2 (versión web 3D, Three.js)
  comun.js    modelo 3D del Sheriff, sonido y texturas compartidas
  modelos/sheriff_tornillo.glb   el mismo robot de Blender con sus animaciones
  lib/        Three.js r170 (local, sin CDN)
  unity/      (opcional) builds de Unity WebGL
```

## Usar las builds de Unity WebGL (opcional)
Si prefieres que cada sección cargue el juego de Unity en vez de la versión web:
1. En Unity: *File › Build Profiles › Web › Switch Platform*.
2. *Player Settings › Publishing Settings*: **Compression Format = Gzip** y marca **Decompression Fallback** (GitHub Pages no envía las cabeceras de Brotli).
3. *Build* en una carpeta y copia su contenido (`index.html`, `Build/`, `TemplateData/`) a `juegos/unity/carrera/` o `juegos/unity/laberinto/`.
4. En `juegos/unity/disponibles.json` cambia ese juego a `true`.
El botón START usará la build de Unity automáticamente (el pie de la sección dice qué versión corre).
