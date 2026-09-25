# Fronteras de Acero

Juego web de estrategia territorial por turnos. Incluye 24 territorios por mapa, tres topologías, economía, Mercado táctico, cartas, seis comandantes, objetivos, Influencia, niebla de guerra, Frentes de Guerra y eventos exclusivos del Modo terreno.

Estado documental: versión 0.4, revisada el 25 de septiembre de 2026. El juego individual está completo y en fase de ajuste de balance; el multijugador sigue fuera del alcance actual.

## Jugar y editar en local

El juego se publica directamente desde `dist/` y no requiere compilación. Inicia un servidor HTTP desde la raíz:

```powershell
python serve.py
```

Después abre <http://localhost:8000>.

## Arquitectura

- `dist/engine.mjs`: reglas, IA, mapas, combate, economía y migraciones de guardado.
- `dist/app.mjs`: orquestación principal de la interfaz y flujo de turnos.
- `dist/campaign-storage.mjs`: guardado y recuperación de campaña.
- `dist/map-routes.mjs`: geometría de conexiones rectas y curvas.
- `dist/order-controls.mjs`: límites y vista previa de maniobra.
- `dist/combat-view.mjs`: presentación pura de dados y resultados.
- `dist/ui-accessibility.mjs` y `dist/modal-service.mjs`: foco, anuncios y modales.
- `dist/telemetry.mjs`: estadísticas locales versionadas; nunca envía datos a servidores.
- `dist/styles.css` y `dist/theme.css`: estilos base y capa visual actual.

`app.mjs` continúa siendo el orquestador y todavía contiene renderizado específico del mapa, panel de órdenes, tutorial y animaciones. Las extracciones nuevas mantienen contratos pequeños y pruebas aisladas para evitar una reescritura monolítica.

## Controles y comportamiento

El turno se divide en Reclutamiento, Combate, Maniobra y Cierre. Durante Reclutamiento se pueden deshacer colocaciones y comprar refuerzos básicos o artículos del Mercado. Cada dado atacante representa un soldado desplegado. La Maniobra utiliza botones −/+, entrada numérica y accesos 1, Mitad y Máximo con vista previa de origen y destino.

La Influencia v2 separa capacidad y victoria: producción y tropas permiten actuar, pero no puntúan. La presencia aporta un máximo de 17 puntos y el resto procede principalmente de objetivos. El jugador elige un objetivo principal entre tres opciones y una misión por cada ciclo de tres rondas, con rutas de posición, táctica, logística, economía, inteligencia, defensa y recuperación. La Hegemonía requiere 70 puntos al cierre de una ronda.

En pantallas de hasta 1200 px, las órdenes se presentan como una hoja inferior. Los controles principales tienen objetivos táctiles de al menos 44 px, foco visible y anuncios accesibles. `prefers-reduced-motion` desactiva transiciones y animaciones no esenciales.

Desde Ayuda se puede reiniciar el tutorial y consultar, exportar o borrar la telemetría local. El esquema registra cartas, ofertas, comandantes y resultados de campaña sin nombres ni identificadores personales.

## Pruebas

```powershell
node tests/full-game.mjs
node tests/telemetry.mjs
node tests/interaction-engine.mjs
node tests/ui-modules.mjs
node tests/ui-regression.mjs
node tests/balance-analysis.mjs
```

`full-game.mjs` simula 60 campañas y cubre las reglas principales. Las pruebas restantes separan telemetría, módulos de interfaz, contratos DOM/CSS e interacciones. `balance-analysis.mjs` genera el diagnóstico reproducible descrito en `INFORME_BALANCE_P4.md`.

## Balance conocido

La matriz P4 de 600 campañas muestra que Influencia v2 corrigió la puntuación redundante: producción y tropas aportan 0 puntos, los objetivos son la fuente principal, la mediana subió de 8 a 13 rondas y ninguna condición de victoria supera el 80%. La bola de nieve operativa aún no está cerrada: el líder territorial de ronda 8 gana el 79,7% y las remontadas alcanzan 20,3%. El siguiente ajuste debe actuar sobre economía y refuerzos, no volver a cargar la Influencia territorial.

## Publicación

La rama `main` se publica mediante GitHub Actions. Antes de enviar cambios, ejecuta la suite indicada arriba y confirma que `git diff --check` no informe errores.
