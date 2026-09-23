# Fronteras de Acero

Juego de estrategia territorial por turnos, creado originalmente en Sites y publicado en GitHub Pages.

Las fases 1 a 6 del documento de diseño v0.2 están implementadas y auditadas en [PLAN_DE_DESARROLLO.md](PLAN_DE_DESARROLLO.md): economía, cartas tácticas, mercado, influencia y objetivos, comandantes y frentes, e información imperfecta.

La interfaz usa territorios hexagonales y adapta el flujo de juego a escritorio, tableta y móvil. En pantallas pequeñas, el mapa se puede desplazar o mostrar completo y las órdenes se abren como una hoja inferior para mantener visible la partida.

## Editar en local

El juego está en `dist/`: `index.html`, `styles.css`, `theme.css`, `app.mjs`, `engine.mjs` y las ilustraciones `map-*.webp`. No requiere instalar dependencias ni compilar.

Para abrirlo desde un servidor local (los módulos JavaScript necesitan HTTP), ejecuta en esta carpeta:

```powershell
python serve.py
```

Después abre <http://localhost:8000>. Para comprobar la lógica del juego:

```powershell
node tests/full-game.mjs
```

## Publicar cambios

La rama `main` se publica automáticamente mediante GitHub Actions. Desde esta carpeta:

```powershell
git add .
git commit -m "Describir el cambio"
git push origin main
```

El flujo ejecuta la comprobación del juego antes de publicar `dist/` en GitHub Pages.
