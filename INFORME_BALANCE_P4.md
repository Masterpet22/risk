# Informe de balance P4

Fecha de revisión: 2026-09-25  
Muestra: 600 campañas deterministas, 2–4 comandantes, tres mapas, modos clásico/terreno y dificultad normal/difícil.
Script reproducible: `$env:BALANCE_GAMES='600'; node tests/balance-analysis.mjs`

## Umbrales de control

| Indicador | Zona saludable propuesta | Resultado | Estado |
|---|---:|---:|---|
| Victoria del líder territorial temprano (ronda 8) | ≤ 75% | 79,7% | Cerca, aún fuera de rango |
| Remontadas después de ronda 8 | ≥ 25% | 20,3% | Cerca, aún fuera de rango |
| Correlación territorios tempranos/victoria | ≤ 0,60 | 0,72 | Fuera de rango |
| Duración mediana | 12–24 rondas | 13 rondas | En rango |
| Variedad de condiciones de victoria | Ninguna > 80% | Dominio 78%, Influencia 21%, límite 1% | En rango |

## Diagnóstico

El rediseño de Influencia v2 eliminó producción y tropas de la puntuación, limitó la presencia a 8 puntos por territorios y 9 por regiones, y trasladó el peso a misiones elegibles. En la ronda 8, el líder medio obtiene 38,3 puntos de Influencia frente a 21,6 del resto; la diferencia sigue siendo importante, pero ya no reproduce de forma directa la brecha económica de 58,4 frente a 12,9 de producción.

La composición media de la Influencia ganadora fue: 8,0 por territorios, 8,6 por regiones, 0 por producción, 0 por tropas y 37,4 por objetivos. Los objetivos son ahora la fuente principal y existen rutas de posición, táctica, logística, economía, inteligencia, defensa y recuperación. La duración mediana subió de 8 a 13 rondas y la distribución dejó de estar monopolizada por Hegemonía.

La mejora no cierra por sí sola la bola de nieve militar. El líder territorial temprano todavía gana el 79,7% de las veces y el 78% de las campañas termina por Dominio total. La causa restante está en la capacidad operativa: quien conquista sigue recibiendo mucha más producción y refuerzos, aunque esos recursos ya no puntúen directamente.

Las tasas brutas por comandante no son todavía una comparación causal: la asignación actual de doctrinas a posiciones de IA no está completamente balanceada entre muestras. Aun así, el rango observado —Diplomático 5%, Conquistador 24%, Guardián 56%— justifica una simulación factorial que rote doctrina, posición inicial, mapa y número de jugadores antes de retocar doctrinas.

## Próxima iteración recomendada

1. Conservar Influencia v2 y medir elecciones reales de objetivos mediante la telemetría local.
2. Profundizar la misión de recuperación para que aparezca con mayor prioridad al jugador rezagado.
3. Reducir el multiplicador operativo de la expansión revisando producción regional y refuerzos, sin devolver esos valores a Influencia.
4. Incorporar estabilización de Frentes como futura ruta de objetivo cuando los Frentes sean geográficos.
5. Repetir la matriz de 600 campañas después de cualquier cambio económico y antes de modificar comandantes.

Conclusión: Influencia v2 corrige la fuente de puntuación dominante y lleva duración y variedad de victoria a la zona saludable. El balance general todavía no está cerrado: faltan 4,7 puntos porcentuales de remontadas y reducir la correlación territorial de 0,72 a 0,60 o menos. El siguiente cuello de botella ya no es Influencia, sino la economía y los refuerzos que alimentan el Dominio total.
