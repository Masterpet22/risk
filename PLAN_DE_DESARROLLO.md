# Plan de desarrollo de Fronteras de Acero

Basado en el documento de diseño «Fronteras de Acero», versión 0.2 (22 de septiembre de 2026). Cada parte se publica cuando sus reglas, interfaz, guardado y partidas simuladas funcionan juntas.

| Parte | Entrega jugable | Criterio de cierre |
| --- | --- | --- |
| 0. Núcleo | 24 territorios, 3 mapas, combate, maniobra y guardado | Completada en el prototipo actual. |
| 1. Base económica | Producción por territorio y mayoría regional, dinero persistente y compra de 3 refuerzos por $10 | El cobro ocurre una vez al iniciar el turno; jugador e IA pueden gastar; una partida guardada se conserva. |
| 2. Cartas tácticas | Retirar canje clásico. Mano de 3, descarte al robar la cuarta; Espía, Sabotaje, Bloqueo, Movilización y Contrainteligencia | Cada carta tiene coste, objetivo, duración, respuesta de la IA y presentación clara. Los bloqueos afectan combate y movimiento. |
| 3. Mercado | 3 o 4 ofertas, rotación cada 3 rondas y compras solo en Reclutamiento | Ofertas y compras se guardan; la IA puede comprar. |
| 4. Influencia y victoria | Fórmula del §8, objetivos como fuente de puntos y victoria por 150 puntos o al finalizar la ronda 40 | Dominio inmediato sigue funcionando; los otros finales muestran su causa en el resumen. |
| 5. Comandantes y frentes | Seis doctrinas y estados Estable, Tenso, Conflicto y Guerra | Cada doctrina cambia decisiones reales; frentes se actualizan según acciones y afectan al Guardián. |
| 6. Información imperfecta | Datos completos, parciales y ocultos; Espía revela información temporalmente | El jugador y la IA actúan con la información que les corresponde según dificultad. |
| 7. Eventos | Avisos con una ronda de anticipación, terremoto, tsunami y cambios temporales de conexiones | El mapa y sus rutas reflejan efectos activos y caducidad. |
| 8. Balance | Simulación de duración, remontadas, precios, umbral de Influencia, doctrinas y Modo Terreno | Ajustes respaldados por partidas simuladas y pruebas de interfaz. |
| 9. Multijugador | Autoridad de servidor sobre turnos y estado | Se abordará después de estabilizar el juego individual. |

La parte 1 se adelanta como dependencia técnica de la parte 2: Sabotaje, Bloqueo y Movilización necesitan dinero para tener el coste previsto en el documento. Los valores de balance del documento son iniciales y podrán cambiar en la parte 8.
