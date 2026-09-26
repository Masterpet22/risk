# Informe de balance P4

Fecha de revisión: 2026-09-26
Muestra: 600 campañas deterministas, 2–4 comandantes, tres mapas, modos clásico/terreno y dificultad normal/difícil.
Script reproducible: `$env:BALANCE_GAMES='600'; node tests/balance-analysis.mjs`

## Umbrales de control

| Indicador | Zona saludable propuesta | Resultado | Estado |
|---|---:|---:|---|
| Victoria del líder territorial temprano (ronda 8) | ≤ 75% | 80,8% | Fuera de rango |
| Remontadas después de ronda 8 | ≥ 25% | 19,2% | Fuera de rango |
| Correlación territorios tempranos/victoria | ≤ 0,60 | 0,74 | Fuera de rango |
| Duración mediana | 12–24 rondas | 10 rondas | Demasiado corta |
| Variedad de condiciones de victoria | Ninguna > 80% | Dominio 57,8%, Influencia 42,2% | En rango |

## Diagnóstico

El rediseño de Influencia v2 eliminó producción y tropas de la puntuación, limitó la presencia a 8 puntos por territorios y 9 por regiones, y trasladó el peso a misiones elegibles. En la ronda 8, el líder medio obtiene 41,5 puntos de Influencia frente a 21,8 del resto; la diferencia sigue siendo importante, pero ya no reproduce de forma directa la brecha económica de 59,4 frente a 12,4 de producción.

La composición media de la Influencia ganadora fue: 7,9 por territorios, 8,2 por regiones, 0 por producción, 0 por tropas y 38,8 por objetivos. Los objetivos son la fuente principal y existen rutas de posición, táctica, logística, economía, inteligencia, defensa y recuperación. Con el umbral provisional de 60 y sus dos requisitos, la duración mediana baja a 10 rondas y la Hegemonía representa el 42,2% de los finales.

La nueva condición mejora la variedad de finales y las remontadas, pero no cierra la bola de nieve militar. El líder territorial temprano gana el 80,8% de las veces y el 57,8% de las campañas termina por Dominio total. El coste es una duración demasiado corta: mediana de 10 rondas frente al rango objetivo de 12–24. La causa estructural restante sigue en la capacidad operativa de quien conquista.

Las tasas brutas por comandante no son todavía una comparación causal: la asignación actual de doctrinas a posiciones de IA no está completamente balanceada entre muestras. Aun así, el rango observado —Diplomático 38/100, Conquistador 175/600, Guardián 211/500— justifica una simulación factorial que rote doctrina, posición inicial, mapa y número de jugadores antes de retocar doctrinas.

## Próxima iteración recomendada

1. Conservar Influencia v2 y medir elecciones reales de objetivos mediante la telemetría local.
2. Profundizar la misión de recuperación para que aparezca con mayor prioridad al jugador rezagado.
3. Reducir el multiplicador operativo de la expansión revisando producción regional y refuerzos, sin devolver esos valores a Influencia.
4. Ejecutar la matriz factorial del objetivo 8 rotando mapa, posición, comandante y cantidad de jugadores antes de fijar definitivamente el umbral de 60.
5. Repetir la matriz de 600 campañas después de cualquier cambio económico y antes de modificar comandantes.

Conclusión: la Hegemonía provisional a 60, condicionada por un objetivo principal y uno no militar, aumenta las remontadas a 19,2% y equilibra mejor los tipos de victoria. Todavía faltan 5,8 puntos porcentuales para el objetivo de remontadas, reducir la correlación territorial de 0,74 a 0,60 y recuperar al menos dos rondas de duración mediana. El umbral debe seguir considerándose provisional hasta completar la rotación factorial del objetivo 8.
