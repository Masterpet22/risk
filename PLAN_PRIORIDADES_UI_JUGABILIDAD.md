# Plan de prioridades de interfaz y jugabilidad

Versión documental 0.4 · 27 de septiembre de 2026.

Este documento establece las prioridades de desarrollo, los contratos de interacción consolidados y las áreas activas de mejora en *Fronteras de Acero*.

---

## 1. Principios de interacción y diseño

1. **Claridad previa:** Toda acción muestra exactamente qué ocurrirá y qué recursos se comprometen antes de solicitar confirmación.
2. **Consistencia 1:1:** Cada concepto mantiene la misma representación entre controles, mapa, animaciones y resúmenes de resultados.
3. **Paridad de dispositivos:** Los controles esenciales funcionan con idéntica fiabilidad con ratón, teclado y pantalla táctil.
4. **Información fidedigna:** Las mejoras visuales jamás revelan información oculta bajo niebla de guerra ni alteran silenciosamente las reglas.
5. **Cero dependencias remotas:** Toda persistencia y telemetría operan de forma local en el navegador del usuario.

---

## 2. Estado de sistemas consolidados

Los siguientes bloques han sido completamente implementados, verificados en navegador y respaldados por la suite de pruebas automatizadas:

| Bloque | Sistema | Contrato funcional consolidado |
|---|---|---|
| **P0.1** | Despliegue de combate | Correspondencia exacta 1:1 entre dados atacantes seleccionados (1–3) y soldados desplegados. Animación y resolución muestran tropas reales, bajas y traslados sin grupos fijos arbitrarios. Sondeo táctico 1v1 para exploración sin conquista. |
| **P0.2** | Selector de maniobra | Sustitución de la barra deslizante por botones `−` / `+`, campo numérico editable, accesos rápidos (`1`, `Mitad`, `Máximo`) y cálculo en tiempo real de tropas finales en origen y destino (el origen siempre retiene al menos 1 tropa). |
| **P0.3** | Deshacer en reclutamiento | Historial reversible de colocación de tropas durante la fase actual de Reclutamiento. Permite devolver refuerzos individualmente hasta el estado inicial de la fase. |
| **P1.1** | Frentes de Guerra | Indicadores visuales unificados para los 4 estados (Estable, Tenso, Conflicto, Guerra) en mapa, ficha de comandante y avisos. Explicación explícita de escalada y enfriamiento. |
| **P1.2** | Desglose de Influencia | Modal interactivo que expone el desglose exacto de la fórmula v2: presencia territorial (máx 8), regional (máx 9), producción (0), tropas (0) y objetivos dinámicos ponderados por doctrina. |
| **P1.3** | Crónica de campaña | Modal de historial cronológico estructurado por rondas y jugadores, con filtros rápidos (`Todos`, `Combate`, `Economía`, `Eventos`) y bajo consumo de memoria. |
| **P1.4** | Mercado táctico unificado | Centralización económica durante Reclutamiento. Catálogo rotativo cada 3 rondas con al menos una oferta garantizada de tropas. Compra única de cartas tácticas sin coste adicional al jugarlas. |
| **P2.1** | Jerarquía del panel | Panel de órdenes con altura estable a 1366×768 que evita desplazamientos forzados para ejecutar la acción principal de cada fase. |
| **P2.2** | Tutorial contextual | Guía progresiva y no bloqueante para la primera campaña. Se activa según la fase, almacena su progreso en `localStorage` y puede omitirse o reiniciarse desde Ayuda. |
| **P3** | Responsive y accesibilidad | Hoja de órdenes inferior para anchos $\le 1200\text{ px}$. Controles táctiles $\ge 44\text{ px}$, estados `aria-pressed`, anuncios `aria-live` sin duplicidad, gestión de foco modal y soporte para `prefers-reduced-motion`. |
| **P4.1** | Telemetría local | Esquema versionado v1 que almacena métricas de uso (cartas, comandantes, compras, resultados) exclusivamente en el cliente. Interfaz en Ayuda para consultar, descargar JSON y borrar. |
| **P4.3** | Suite de pruebas | Pruebas unitarias y de integración para motor, DOM/CSS, telemetría, dificultad y regresión visual (`tests/*.mjs`). |
| **P5.2** | Sincronización documental | GDD, README y planes alineados en versión 0.4 con idéntica terminología. |
| **P5.3** | Optimización | Supresión de filtros pesados y simplificación de transiciones en dispositivos con perfil de movimiento reducido o baja tasa de refresco. |

---

## 3. Prioridades activas de desarrollo

Habiéndose cerrado las fases P0 a P3 y las pruebas base, el esfuerzo actual del proyecto se concentra en las dos prioridades siguientes:

### P4.2 — Calibración de balance y mitigación de bola de nieve
* **Diagnóstico actual (600 campañas simuladas):**
  * Tasa de victoria del líder territorial de ronda 8: **84,7%** (meta: $\le 75\%$).
  * Tasa de remontadas: **15,3%** (meta: $\ge 25\%$).
  * Correlación territorio/victoria: **0,77** (meta: $\le 0,60$).
  * Duración mediana: **10 rondas** (meta: 12–24 rondas).
* **Plan de acción:**
  1. Aumentar la probabilidad y prioridad de aparición de misiones de recuperación para comandantes que queden rezagados en territorio.
  2. Ajustar la economía regional y el coste de refuerzos operativos para amortiguar la aceleración militar de quien lidera, sin reintroducir producción ni tropas en la fórmula de Influencia.
  3. Ejecutar la batería determinista de 600 partidas (`tests/balance-analysis.mjs`) para verificar que las métricas converjan a la zona saludable.

### P5.1 — Modularización gradual de la interfaz
* **Objetivo:** Desacoplar progresivamente las responsabilidades aún centralizadas en `dist/app.mjs` hacia módulos independientes con contratos pequeños y pruebas aisladas.
* **Módulos consolidados y probados:**
  * `dist/order-controls.mjs`: Límites y vista previa de Maniobra.
  * `dist/combat-view.mjs`: Presentación de dados, figuras de soldados y comparación de bajas.
  * `dist/map-routes.mjs`: Geometría de conexiones rectas y curvas.
  * `dist/campaign-storage.mjs`: Persistencia local y migraciones.
  * `dist/tutorial-controller.mjs`: Gestión de estado, pasos, avance y almacenamiento del tutorial.
  * `dist/chronicle-modal-view.mjs`: Clasificación de eventos, registro lateral y modal de Crónica.
  * `dist/strategic-views.mjs`: Plantillas modales de Influencia y Frentes de Guerra.
* **Próximas extracciones previstas:**
  1. `dist/order-panel-view.mjs`: Renderizado específico de órdenes por fase y gestión de estados vacíos.
  2. `dist/map-renderer.mjs`: Renderizado SVG, capas de conexiones, niebla y marcadores territoriales.

---

## 4. Criterios de entrega y validación

* Todo ajuste en las reglas del juego debe incluir su prueba en `tests/full-game.mjs` o `tests/interaction-engine.mjs`.
* Todo cambio en la interfaz debe verificarse en resoluciones de escritorio (1366×768) y móviles (390×844) garantizando usabilidad por teclado y accesibilidad de foco.
* Todo ajuste de balance debe validarse mediante `$env:BALANCE_GAMES='600'; node tests/balance-analysis.mjs`.
* El modo multijugador permanece fuera del alcance hasta culminar satisfactoriamente el balance individual del juego.
