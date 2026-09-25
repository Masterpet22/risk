# Plan de prioridades de interfaz y jugabilidad

Este plan toma como punto de partida el estado jugable actual. El orden prioriza primero la comprensión de las decisiones y la fiabilidad de los controles; después, la presentación y el refinamiento general.

## Principios de trabajo

- Cada acción debe mostrar **qué va a ocurrir antes de confirmarla**.
- Un mismo concepto debe conservar la misma representación en controles, mapa, animación y resultado.
- Los controles principales deben funcionar igual de bien con ratón, teclado y pantalla táctil.
- Ninguna mejora visual debe revelar información oculta ni modificar silenciosamente las reglas.
- Cada bloque se cierra con pruebas de lógica, una revisión visual en 1366×768 y otra en móvil/tableta.

## P0 — Claridad del ataque y maniobra práctica

Es la prioridad inmediata porque afecta decisiones realizadas en cada turno.

**Estado: completado.** Implementado con pruebas del motor y validación de interacción en navegador.

### P0.1 Representar soldados desplegados en el ataque

Actualmente el jugador selecciona dados, pero la animación siempre muestra un grupo fijo de tres soldados. Esto rompe la relación entre decisión y representación.

Cambios propuestos:

- Renombrar las opciones como:
  - `1 soldado · 1 dado`
  - `2 soldados · 2 dados`
  - `3 soldados · 3 dados`
- Añadir un resumen previo visible: `Despliegue de esta ronda: 2 soldados`.
- Mostrar en la animación exactamente tantos soldados atacantes como dados seleccionados.
- Mostrar defensores según los dados que realmente lanza la defensa, con un máximo de dos.
- En la resolución, indicar claramente:
  - soldados desplegados;
  - bajas de cada bando;
  - soldados que regresan o permanecen en el territorio de origen;
  - soldados trasladados si se conquista el territorio.
- En `Ataque rápido`, explicar que se usan automáticamente todos los soldados permitidos en cada tirada. La animación y el resumen deberán utilizar el número real de dados de cada ronda, no un valor fijo.

Criterios de aceptación:

- Seleccionar dos dados muestra dos soldados en el resumen previo y en la animación.
- La cantidad nunca supera `tropas del origen - 1`.
- Una conquista muestra la cantidad real trasladada al territorio conquistado.
- Ataque normal, ataque rápido y ataques de la IA utilizan el mismo lenguaje visual.

Archivos principales: `dist/app.mjs`, `dist/theme.css` y pruebas de combate en `tests/full-game.mjs`.

### P0.2 Sustituir la barra de maniobra

La barra deslizante es imprecisa, especialmente en móvil, y no permite anticipar con claridad el resultado.

Control recomendado:

```text
Tropas a mover
             ┌─────┐
    [ − ]    │  3  │    [ + ]
             └─────┘
       [ 1 ] [ Mitad ] [ Máximo ]

Origen: 8 → 5        Destino: 2 → 5
[ Confirmar movimiento ]
```

Comportamiento:

- Botones grandes `−` y `+` para ajustar una unidad.
- Campo numérico editable con límites seguros.
- Accesos rápidos `1`, `Mitad` y `Máximo`.
- Vista previa en tiempo real de las tropas finales en origen y destino.
- El origen siempre conserva al menos una tropa.
- `Confirmar movimiento` queda desactivado ante una cantidad inválida.
- La selección se conserva al abrir o cerrar la hoja de órdenes móvil.
- Mensaje específico cuando no existe una ruta propia continua.

Criterios de aceptación:

- Puede elegirse cualquier cantidad válida sin arrastrar un control.
- El control funciona con clic, toque, teclado y flechas del campo numérico.
- Los valores previstos coinciden exactamente con el estado posterior a la maniobra.
- Funciona correctamente con una tropa transferible y con cantidades grandes.

Archivos principales: `dist/app.mjs`, `dist/theme.css` y pruebas de maniobra en `tests/full-game.mjs`.

### P0.3 Añadir deshacer durante Reclutamiento

Colocar una tropa por error no debería obligar a reiniciar la partida ni dejar una decisión accidental permanente.

Cambios propuestos:

- Registrar cada colocación realizada durante la fase actual de Reclutamiento.
- Mostrar `Deshacer última colocación` mientras exista al menos una acción reversible.
- Devolver la tropa al contador de refuerzos pendientes y restaurar el territorio afectado.
- Permitir deshacer varias colocaciones, una por una, hasta regresar al inicio de la fase.
- Vaciar el historial al terminar Reclutamiento, comprar refuerzos, cargar otra partida o cambiar de jugador.
- No permitir deshacer acciones de la IA ni acciones pertenecientes a turnos anteriores.

Criterios de aceptación:

- Deshacer restaura exactamente las tropas y refuerzos pendientes anteriores.
- Guardar y cargar no crea un historial inválido ni permite duplicar tropas.
- El botón no aparece cuando no hay acciones reversibles.
- La función se prueba con colocaciones consecutivas en uno y varios territorios.

## P1 — Retroalimentación táctica consistente

Después de corregir los controles, la siguiente prioridad es que el mapa explique mejor el estado de la partida.

### P1.1 Mejorar la visibilidad de los Frentes de Guerra

- Incorporar una leyenda compacta para los estados de frontera: Estable, Tenso, Conflicto y Guerra.
- Mostrar el nombre y estado de una frontera al seleccionar cualquiera de sus territorios, sin recuperar cuadros flotantes sobre el mapa.
- Unificar los colores de frontera entre mapa, ficha del comandante y mensajes de combate.
- Señalar con claridad rutas bloqueadas, diferenciándolas de una frontera en guerra.
- Mantener visibles únicamente las rutas relevantes al territorio seleccionado, salvo cuando el usuario active `Rutas: todas`.
- Añadir un resumen de los frentes activos en la información del comandante, ordenado por gravedad.
- Explicar qué acción aumentó o redujo la tensión y cuándo puede enfriarse el frente.

Criterio de cierre: el jugador puede explicar por qué una ruta tiene determinado color o patrón sin consultar las reglas externas.

### P1.2 Hacer visible el desglose de Influencia

- Convertir el total de Influencia en un elemento interactivo que abra un desglose compacto.
- Separar claramente las fuentes: territorios, regiones, objetivos, economía, comandantes y bonificaciones temporales.
- Mostrar topes, multiplicadores y penalizaciones aplicadas, no solo el resultado final.
- Indicar cuánto falta para la victoria por Influencia y qué fuentes pueden aumentar en el turno actual.
- Usar la misma función de cálculo del motor para producir el desglose, evitando duplicar fórmulas en la interfaz.

Criterio de cierre: la suma de todas las filas coincide siempre con `calculateInfluence` y el jugador puede identificar la causa de cualquier cambio.

### P1.3 Recuperar la Crónica de la campaña como modal

- Añadir un botón compacto `Crónica` cerca de la información global de la partida.
- Abrir un modal con eventos agrupados por ronda y jugador.
- Registrar conquistas, pérdidas, objetivos, compras, cartas, cambios de frente, eventos naturales y eliminaciones.
- Ofrecer filtros sencillos: `Todos`, `Combate`, `Economía` y `Eventos`.
- Conservar un límite razonable de entradas y mantener compatibilidad con partidas guardadas anteriores.
- Evitar que la Crónica ocupe permanentemente espacio del panel de órdenes.

Criterio de cierre: cualquier cambio importante del estado puede rastrearse desde el modal sin saturar la pantalla principal.

### P1.4 Diferenciar compra básica y refuerzos del Mercado

- Nombrar la acción económica permanente como `Compra básica: +3 refuerzos por $10`.
- Reservar `Mercado táctico` para ofertas rotatorias, cartas y efectos especiales.
- Dar a ambas acciones iconos, colores y descripciones diferentes.
- Mostrar claramente si una oferta del Mercado entrega tropas inmediatas, reserva, una carta o un efecto temporal.
- Evitar que la compra básica parezca una oferta más del Mercado o que dependa de su rotación.
- Revisar los mensajes de saldo insuficiente y fase no válida.

Criterio de cierre: en una prueba sin explicación previa, el jugador distingue dónde comprar refuerzos estándar y dónde adquirir ofertas tácticas.

## P2 — Jerarquía del panel de órdenes

### P2.1 Estabilizar el panel de órdenes

- Reservar una altura estable para `Orden actual`, evitando cambios de tamaño entre fases.
- Colocar siempre la acción principal dentro del primer viewport del panel.
- Reducir textos repetidos y trasladar explicaciones secundarias a ayudas breves.
- Mantener separados visualmente: selección, configuración, resultado y avance de fase.
- Revisar estados vacíos para que no consuman espacio de combate o maniobra.

Criterio de cierre: en 1366×768 nunca es necesario desplazar el panel para ejecutar la acción principal de la fase.

### P2.2 Tutorial contextual para la primera partida

- Activarlo únicamente en la primera campaña, con opción de omitirlo y reiniciarlo desde Ayuda.
- Explicar cada concepto cuando se vuelve relevante: Reclutamiento, selección de territorios, ataque, soldados/dados, maniobra, cartas, Mercado, Influencia, objetivos y Frentes.
- Destacar un único elemento por paso sin bloquear acciones ajenas innecesariamente.
- Guardar el progreso del tutorial localmente y no repetir pasos ya completados.
- Adaptar la colocación de mensajes a escritorio, tableta y hoja de órdenes móvil.
- No mostrar eventos de terreno en el tutorial cuando la partida usa modo clásico.

Criterio de cierre: un jugador nuevo completa un turno entero sin depender del documento de reglas y puede omitir el tutorial en cualquier momento.

## P3 — Responsive, accesibilidad y controles táctiles

- Revisar 1920×1080, 1366×768, 1024×768, 768×1024 y 390×844.
- Garantizar objetivos táctiles de al menos 44 px para `+`, `−`, dados y botones principales.
- Añadir estados de foco visibles y etiquetas accesibles con valores actuales.
- Anunciar cambios de cantidad y resultados mediante regiones `aria-live` sin duplicar mensajes.
- Confirmar que modales y hojas móviles recuperen el foco al cerrarse.
- Comprobar que el zoom del navegador al 125% y 150% no produzca controles ocultos ni doble scroll.

## P4 — Medición, balance y pruebas de regresión

### P4.1 Telemetría local de uso

- Registrar únicamente en el dispositivo, sin enviar información a servidores:
  - cartas jugadas y descartadas;
  - ofertas compradas o ignoradas;
  - comandantes elegidos;
  - mapa, modo, dificultad, duración y resultado de cada campaña.
- No almacenar nombres introducidos, identificadores personales ni historial de navegación.
- Añadir en Ayuda opciones para ver un resumen, exportar los datos como JSON y borrarlos.
- Versionar el esquema para que futuras actualizaciones no rompan estadísticas anteriores.
- Usar estos datos solo como apoyo para detectar contenido ignorado o dominante; no modificar el balance automáticamente.

Criterio de cierre: todas las métricas permanecen en almacenamiento local, pueden borrarse y no provocan solicitudes de red.

### P4.2 Revisar la bola de nieve territorial y la Influencia alternativa

- Medir la correlación entre ventaja territorial temprana y victoria final.
- Comparar producción, refuerzos, control regional e Influencia obtenidos por el líder frente al resto.
- Revisar si conquistar territorios proporciona simultáneamente demasiada economía, seguridad e Influencia.
- Evaluar fuentes alternativas para jugadores rezagados: objetivos, diplomacia, frentes estabilizados, cartas y especialización regional.
- Simular cambios antes de modificar valores del juego principal.
- Definir umbrales de balance: duración, remontadas, variedad de comandantes y distribución de tipos de victoria.

Criterio de cierre: el informe de simulación demuestra que una ventaja temprana no vuelve trivialmente inevitable la victoria y que existen rutas competitivas no basadas solo en expansión territorial.

### P4.3 Pruebas visuales, funcionales y de interacción

- Añadir pruebas para la equivalencia `dados seleccionados = soldados desplegados`.
- Verificar límites del nuevo selector de maniobra.
- Probar vista previa y resultado final de origen/destino.
- Cubrir ataque rápido cuando el número máximo de dados cambia entre tiradas.
- Añadir comprobaciones DOM para:
  - ausencia de relleno en rutas curvas;
  - fronteras regionales discontinuas;
  - colores según estado de frontera;
  - controles principales visibles sin solapamiento.
- Cubrir secuencias completas de interacción: reclutar y deshacer, comprar, atacar, maniobrar, abrir modales y cerrar turno.
- Probar navegación por teclado, foco de modales y controles táctiles equivalentes.
- Separar pruebas puras del motor de las pruebas DOM para identificar rápidamente el origen de una regresión.

## P5 — Pulido posterior

### P5.1 Dividir la lógica de interfaz

- Separar `app.mjs` en módulos con responsabilidades acotadas:
  - estado y persistencia;
  - mapa y rutas;
  - panel de órdenes;
  - combate y animaciones;
  - modales, Mercado, Crónica y tutorial;
  - telemetría local.
- Evitar estado global duplicado y definir interfaces claras entre motor e interfaz.
- Reducir duplicación y reglas antiguas acumuladas entre `styles.css` y `theme.css`.
- Centralizar textos, colores y etiquetas de estado.
- Mantener una prueba de arranque después de cada extracción para no realizar una reescritura monolítica.

### P5.2 Sincronizar GDD, README y planes

- Actualizar el GDD con las reglas realmente implementadas, modos, economía, cartas, Frentes, eventos e Influencia.
- Actualizar `README.md` con arquitectura, controles actuales, pruebas y flujo de publicación.
- Conciliar `PLAN_DE_DESARROLLO.md` con este plan de prioridades, eliminando estados contradictorios.
- Añadir una pequeña tabla de versión documental y fecha de última revisión.
- Tratar cualquier cambio de reglas como incompleto hasta que código, pruebas y documentación coincidan.

### P5.3 Optimización posterior

- Optimizar animaciones para `prefers-reduced-motion` y dispositivos de bajo rendimiento.
- Dejar multijugador para después de estabilizar estos flujos, como ya establece el plan general del proyecto.

## Orden de implementación recomendado

1. P0.2 — Nuevo selector de maniobra y vista previa.
2. P0.1 — Soldados desplegados, animación y resolución de combate.
3. P0.3 — Deshacer durante Reclutamiento.
4. P1.4 — Diferenciar compra básica y Mercado táctico.
5. P1.2 — Desglose visible de Influencia.
6. P1.1 — Visibilidad y explicación de los Frentes de Guerra.
7. P1.3 — Crónica de campaña como modal.
8. P2 — Panel estable y tutorial contextual de primera partida.
9. P3 — Auditoría responsive y accesibilidad.
10. P4.1 — Telemetría exclusivamente local.
11. P4.2 — Estudio de bola de nieve y fuentes alternativas de Influencia.
12. P4.3 — Ampliar pruebas visuales, funcionales y de interacción.
13. P5.1 — Dividir gradualmente la lógica de interfaz.
14. P5.2 — Sincronizar GDD, README y planes.
15. P5.3 — Optimización y preparación para trabajo futuro.

Se recomienda comenzar por **P0.2** porque sustituye un control que actualmente dificulta una acción básica y puede implementarse sin modificar las reglas del motor. A continuación, **P0.1** unifica selección, animación y resultado de combate. El bloque P0 se cierra con **P0.3**, que hace reversible la única decisión repetitiva de Reclutamiento antes de abordar mejoras informativas más amplias.
