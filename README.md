# Fronteras de Acero

Juego web de estrategia territorial por turnos. Incluye 24 territorios por mapa, tres topologías, economía, Mercado táctico, cartas, seis comandantes, objetivos, Influencia, niebla de guerra, Frentes de Guerra y eventos exclusivos del Modo terreno.

Estado documental: versión 0.4, revisada el 27 de septiembre de 2026. El juego individual está completo y en fase de ajuste de balance; el multijugador sigue fuera del alcance actual.

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
- `dist/order-panel-view.mjs`: textos contextuales por fase y controles reversibles de órdenes.
- `dist/combat-view.mjs`: presentación pura de dados y resultados.
- `dist/market-modal-view.mjs`: catálogo y plantilla interactiva del Mercado táctico.
- `dist/tutorial-controller.mjs`: gestión de estado, pasos y progreso del tutorial.
- `dist/chronicle-modal-view.mjs`: clasificación y renderizado de la Crónica y registro lateral.
- `dist/strategic-views.mjs`: plantillas modales de Influencia y Frentes de Guerra.
- `dist/ui-accessibility.mjs` y `dist/modal-service.mjs`: foco, anuncios y modales.
- `dist/telemetry.mjs`: estadísticas locales versionadas; nunca envía datos a servidores.
- `dist/styles.css` y `dist/theme.css`: estilos base y capa visual actual.

`app.mjs` continúa siendo el orquestador principal. Las extracciones mantienen contratos pequeños y pruebas aisladas para evitar una reescritura monolítica.

## Controles y comportamiento

El turno se divide en Reclutamiento, Combate, Maniobra y Cierre. Durante Reclutamiento se pueden deshacer colocaciones y comprar tropas, cartas o efectos exclusivamente en el Mercado táctico; cada rotación garantiza al menos una oferta de tropas. Las cartas se pagan al adquirirlas y no vuelven a cobrar al jugarlas. El Combate es opcional: una vez por turno se puede realizar un Sondeo de 1 dado contra 1 para revelar una guarnición sin posibilidad de conquistar, o comprometer tropas en un ataque normal. Cada dado atacante representa un soldado desplegado. La Maniobra utiliza botones −/+, entrada numérica y accesos 1, Mitad y Máximo con vista previa de origen y destino.

Los Frentes de Guerra se registran por pareja de comandantes y por región. Sondeo, Espía y Sabotaje elevan la tensión regional; los combates y conquistas la escalan. Contrainteligencia no se consume automáticamente: el defensor elige si descartar la carta para anular Espía o Sabotaje, o conservarla y aceptar el efecto.

La Influencia v2 separa capacidad y victoria: producción y tropas permiten actuar, pero no puntúan. La presencia aporta un máximo de 17 puntos y el resto procede principalmente de objetivos. El jugador elige un objetivo principal entre tres opciones y una misión por cada ciclo de tres rondas, con rutas de posición, táctica, logística, economía, inteligencia, defensa y recuperación. La Hegemonía provisional requiere 60 puntos al cierre de una ronda, además de un objetivo principal y uno no militar completados.

Al conquistar durante el turno se ofrecen dos Cartas Tácticas distintas y el jugador conserva una. Si la mano está llena, la elección ocurre primero y después se decide cuál descartar. El límite depende de la dificultad: 4 en Pacífico, 3 en Diplomático y Bélico, y 2 en Aniquilación.

La dificultad modifica estrategia y recursos, no los dados. Pacífico hace que la IA evite al jugador mientras tenga alternativas, concede 3 maniobras y precios bajos. Diplomático trata a todos por igual y concede 2 maniobras. Bélico dirige refuerzos, espionaje y ofensivas hacia el jugador y deja 1 maniobra. Aniquilación hace que todas las IA abran rutas hacia el jugador, elimina la maniobra base y eleva los precios; Movilización todavía permite recuperar una maniobra. El reparto conserva cantidades iguales y una pareja conectada por jugador, pero pondera el valor de las conexiones según la dificultad.

No existen tipos de unidad. En Modo terreno, bosques y montañas otorgan defensa según la dificultad, mientras eventos y rutas bloqueadas lo vuelven más exigente que el modo clásico. La producción de cada territorio depende de sus conexiones directas y el control completo de una región suma un bono plano de $2.

En pantallas de hasta 1200 px, las órdenes se presentan como una hoja inferior. Los controles principales tienen objetivos táctiles de al menos 44 px, foco visible y anuncios accesibles. `prefers-reduced-motion` desactiva transiciones y animaciones no esenciales.

Desde Ayuda se puede reiniciar el tutorial y consultar, exportar o borrar la telemetría local. El esquema registra cartas, ofertas, comandantes y resultados de campaña sin nombres ni identificadores personales.

## Pruebas

```powershell
node tests/full-game.mjs
node tests/telemetry.mjs
node tests/interaction-engine.mjs
node tests/ui-modules.mjs
node tests/ui-regression.mjs
node tests/difficulty-system.mjs
node tests/balance-analysis.mjs
```

`full-game.mjs` simula 60 campañas y cubre las reglas principales. Las pruebas restantes separan telemetría, módulos de interfaz, contratos DOM/CSS e interacciones. `balance-analysis.mjs` genera el diagnóstico reproducible descrito en `INFORME_BALANCE_P4.md`.

## Balance conocido

La matriz de 600 campañas, repetida tras el rediseño de economía y distribución, confirma que producción y tropas aportan 0 puntos de Influencia y los objetivos son la fuente principal. La mediana es de 10 rondas; 327 partidas terminaron por dominio y 273 por Influencia. La bola de nieve operativa sigue siendo el principal punto de balance: el líder territorial de ronda 8 gana el 84,7% y las remontadas alcanzan 15,3%.

## Publicación

La rama `main` se publica mediante GitHub Actions. Antes de enviar cambios, ejecuta la suite indicada arriba y confirma que `git diff --check` no informe errores.
