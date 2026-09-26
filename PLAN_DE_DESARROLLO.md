# Plan de desarrollo de Fronteras de Acero

Versión documental 0.4 · última revisión 25 de septiembre de 2026.

Este plan refleja el juego implementado. El detalle de prioridades de experiencia y deuda técnica está en `PLAN_PRIORIDADES_UI_JUGABILIDAD.md`; las métricas de balance están en `INFORME_BALANCE_P4.md`.

| Parte | Estado | Entrega actual o criterio pendiente |
| --- | --- | --- |
| 0. Núcleo | Completada | 24 territorios, tres mapas, combate, maniobra, guardado y migraciones. |
| 1. Economía | Completada | Producción, tesoro, compra básica y Mercado rotatorio. |
| 2. Cartas tácticas | Completada | Tras conquistar se elige una de dos cartas; mano máxima de tres, descarte posterior y Contrainteligencia como reacción elegible. |
| 3. Influencia y objetivos | Influencia v2 completada | Presencia limitada a 17 puntos, producción/tropas sin puntuación, diez objetivos en siete rutas, elección entre tres opciones y Hegemonía provisional a 60 con requisitos principal/no militar. |
| 4. Comandantes y Frentes | Completada | Seis doctrinas y tensión Estable, Tenso, Conflicto y Guerra registrada de forma independiente por región. |
| 5. Información imperfecta | Completada | Visión completa, parcial y oculta; Espía y el Sondeo de combate revelan temporalmente. |
| 6. Eventos | Completada | Terremoto, tsunami y temporal, únicamente en Modo terreno. |
| 7. Experiencia y accesibilidad | Completada | Tutorial, modales estratégicos, interfaz responsive, controles táctiles y foco accesible. |
| 8. Medición y pruebas | Completada | Telemetría local, suite separada de motor/interfaz y simulación reproducible. |
| 9. Balance | En curso | Reducir la correlación territorio/victoria de 0,80 a ≤0,60 y elevar remontadas de 10,8% a ≥25%. |
| 10. Modularización | En curso | Persistencia, rutas, combate, controles, modales, accesibilidad y telemetría ya extraídos; quedan renderizadores grandes de `app.mjs`. |
| 11. Multijugador | Futuro | Requiere servidor autoritativo; no forma parte del juego individual actual. |

## Próxima iteración recomendada

1. Ajustar economía regional y refuerzos para reducir la ventaja operativa del líder sin alterar Influencia v2.
2. Priorizar misiones de recuperación cuando un jugador quede rezagado y medir su tasa real de elección y cumplimiento.
3. Repetir la matriz factorial de 600 campañas hasta alcanzar al menos 25% de remontadas y correlación territorial ≤0,60.
4. Extraer de `app.mjs` el tutorial y los renderizadores del panel de órdenes y del mapa cuando se toque funcionalmente cada área.
5. Mantener README, GDD, planes y pruebas sincronizados con cada cambio de reglas.

## Criterios de entrega

- Ningún cambio de reglas se considera completo sin prueba del motor, actualización documental y migración si afecta al guardado.
- Ningún cambio visual se considera completo sin comprobar 1366×768, 390×844 y navegación por teclado.
- La telemetría seguirá siendo local, exportable y borrable; no se añadirá transmisión remota sin una decisión explícita de privacidad.
- El multijugador no debe iniciarse hasta cerrar el ajuste de balance del juego individual.
