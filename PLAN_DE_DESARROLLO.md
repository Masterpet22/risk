# Plan de desarrollo de Fronteras de Acero

Versión documental 0.4 · última revisión 27 de septiembre de 2026.

Este plan resume el estado de implementación del proyecto. El detalle de prioridades de interfaz, interacción y arquitectura está en `PLAN_PRIORIDADES_UI_JUGABILIDAD.md`; las métricas de balance se detallan en `INFORME_BALANCE_P4.md`.

| Parte | Estado | Entrega actual o criterio pendiente |
| --- | --- | --- |
| 0. Núcleo | Completada | 24 territorios, tres mapas, combate, maniobra, guardado automático y migraciones a v14. |
| 1. Economía | Completada | Producción por conexiones, fondos y compras centralizadas en el Mercado táctico rotativo. |
| 2. Cartas tácticas | Completada | Elección de 1 entre 2 cartas al conquistar; mano máxima según dificultad, descarte posterior y Contrainteligencia reactiva elegible. |
| 3. Influencia y objetivos | Influencia v2 completada | Presencia limitada a 17 puntos (máx 8 por territorios, 9 por regiones), 0 por tropas y producción; diez objetivos en siete rutas; Hegemonía a 60 con requisitos de objetivo principal y no militar. |
| 4. Comandantes y Frentes | Completada | Seis doctrinas pasivas; tensión Estable, Tenso, Conflicto y Guerra registrada de forma independiente por región. |
| 5. Información imperfecta | Completada | Visión completa, parcial y oculta; niebla de guerra; Espía y Sondeo de combate revelan temporalmente. |
| 6. Eventos | Completada | Terremoto, tsunami y temporal con 1 ronda de aviso previo, exclusivos del Modo Terreno. |
| 7. Experiencia y accesibilidad | Completada | Tutorial contextual, modales estratégicos (Crónica, Influencia, Mercado), interfaz responsive con hoja inferior, controles táctiles ≥44 px y foco accesible. |
| 8. Medición y pruebas | Completada | Telemetría local v1 con exportación/borrado; suite de pruebas separada de motor, DOM/CSS e interacción. |
| 9. Balance (P4.2) | En curso | Reducir la correlación territorio/victoria de 0,77 a ≤0,60, elevar remontadas de 15,3% a ≥25% y recuperar una mediana de 12–24 rondas. |
| 10. Modularización (P5.1) | En curso | Persistencia, rutas, combate, maniobra, tutorial, crónica, vistas estratégicas, mercado, panel de órdenes, cartas tácticas y mapa ya desacoplados en módulos independientes con pruebas aisladas. |
| 11. Multijugador | Futuro | Requiere servidor autoritativo; pospuesto formalmente hasta estabilizar el balance individual. |

## Próxima iteración recomendada

1. Ajustar economía regional y refuerzos para reducir la ventaja operativa del líder sin alterar la fórmula de Influencia v2.
2. Priorizar misiones de recuperación cuando un jugador quede rezagado y medir su impacto en la tasa real de remontadas.
3. Repetir la matriz factorial de 600 campañas deterministas (`tests/balance-analysis.mjs`) hasta alcanzar los umbrales saludables.
4. Extraer de `app.mjs` el tutorial y los renderizadores del panel de órdenes y del mapa en módulos con pruebas aisladas.
5. Mantener README, GDD (`design_doc.txt`), planes y pruebas sincronizados con cada cambio de reglas.

## Criterios de entrega

- Ningún cambio de reglas se considera completo sin prueba del motor, actualización documental y migración si afecta al guardado.
- Ningún cambio visual se considera completo sin comprobar 1366×768, 390×844 y navegación por teclado.
- La telemetría seguirá siendo local, exportable y borrable; no se añadirá transmisión remota sin una decisión explícita de privacidad.
- El multijugador no debe iniciarse hasta cerrar el ajuste de balance del juego individual.
