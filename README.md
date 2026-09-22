# Fronteras de Acero

Juego de estrategia territorial por turnos, creado originalmente en Sites y publicado en GitHub Pages.

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
