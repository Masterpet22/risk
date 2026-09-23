# Plan de desarrollo de Fronteras de Acero

Basado en el documento de diseño «Fronteras de Acero», versión 0.2 (22 de septiembre de 2026). Cada parte se publica cuando sus reglas, interfaz, guardado y partidas simuladas funcionan juntas.

| Parte | Entrega jugable | Criterio de cierre |
| --- | --- | --- |
| 0. Núcleo | 24 territorios, 3 mapas, combate, maniobra y guardado | Completada en el prototipo actual. |
| 1. Base económica | Producción por territorio y mayoría regional, dinero persistente y compra de 3 refuerzos por $10 | El cobro ocurre una vez al iniciar el turno; jugador e IA pueden gastar; una partida guardada se conserva. |
| 2. Cartas tácticas | Retirar canje clásico. Mano de 3, descarte al robar la cuarta; Espía, Sabotaje, Bloqueo, Movilización y Contrainteligencia | Completada: cada carta tiene coste, objetivo, duración, respuesta de la IA, interfaz y los bloqueos afectan combate y maniobra. |
| 3. Mercado | 3 o 4 ofertas, rotación cada 3 rondas y compras solo en Reclutamiento | Completada: 3-4 ofertas dinámicas por ciclo de 3 rondas, compras persistentes en Reclutamiento, IA compradora y soporte en v6. |
| 4. Influencia y victoria | Fórmula del §8, objetivos como fuente de puntos y victoria por 150 puntos o al finalizar la ronda 40 | Completada: fórmula de Influencia con tope de tropas, catálogo de 6 objetivos, victorias A, B y C verificadas con causas en interfaz y resumen final. |
| 5. Comandantes y frentes | Seis doctrinas y estados Estable, Tenso, Conflicto y Guerra | Completada: 6 doctrinas asimétricas activas, frentes dinámicos entre jugadores fronterizos, IA con arquetipos, selector e indicadores visuales y soporte en v8. |
| 6. Información imperfecta | Datos completos, parciales y ocultos; Espía revela información temporalmente | Completada y auditada: 3 niveles de visibilidad sin filtrar propietario ni totales lejanos, Espía con revelado temporal, dificultad basada en decisiones y soporte de guardado v10. |
| 7. Eventos | Avisos con una ronda de anticipación, terremoto, tsunami y cambios temporales de conexiones | Completada: catálogo de eventos dinámicos (terremoto, tsunami, temporal), aviso con 1 ronda de anticipación, bajas con mínimo 1 tropa, rutas bloqueadas temporales, reacción IA según dificultad y reflejo visual en banner, mapa y conexiones. |
| 8. Balance | Simulación de duración, remontadas, precios, umbral de Influencia, doctrinas y Modo Terreno | Completada: simulación empírica de 100 partidas (duración media 8.8 rondas, 0 sobrepasos de R40), reequilibrio de las 6 doctrinas con victorias activas en todas (Conquistador 21%, Guardián 49%, Estratega 11%, Industrial 9%, Espía 6%, Diplomático 4%), bono de Resistencia Nacional para remontadas, Modo Terreno validado y precios del Mercado calibrados. |
| 9. Multijugador | Autoridad de servidor sobre turnos y estado | Se abordará después de estabilizar el juego individual. |

La parte 1 se adelanta como dependencia técnica de la parte 2: Sabotaje, Bloqueo y Movilización necesitan dinero para tener el coste previsto en el documento. Los valores de balance del documento son iniciales y podrán cambiar en la parte 8.
